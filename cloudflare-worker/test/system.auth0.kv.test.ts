/*
 * MIT License
 *
 * Copyright (c) 2025 Ronan LE MEILLAT
 */
import { Router } from "../src/routes/router";
import { setupSystemRoutes } from "../src/routes/system/index";
import { jest, describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';

// Mock checkPermissions before importing setupSystemRoutes to ensure authorization passes
jest.mock("../src/auth0", () => ({
    checkPermissions: jest.fn(async () => ({
        access: true,
        payload: { sub: "test-user" },
        permissions: ["admin:auth0"],
    })),
}));

describe("System::Auth0 token cache", () => {
    afterEach(() => {
        // Clear mocked fetch
        // @ts-ignore
        global.fetch = undefined;
        jest.resetAllMocks();
    });

    test("returns cached token when KV_CACHE contains a valid token", async () => {
        const now = Math.floor(Date.now() / 1000);
        const cachedToken = "cached-token-abc";

        const env: any = {
            CORS_ORIGIN: "*",
            KV_CACHE: {
                get: jest.fn().mockResolvedValue(JSON.stringify({ token: cachedToken, exp: now + 3600 }) as never),
                put: jest.fn().mockResolvedValue(undefined as never),
            },
            AUTH0_MANAGEMENT_API_CLIENT_ID: "id",
            AUTH0_MANAGEMENT_API_CLIENT_SECRET: "secret",
            AUTH0_DOMAIN: "example.com",
            ADMIN_AUTH0_PERMISSION: "admin:auth0",
            RATE_LIMITER: { limit: async () => ({ success: true }) },
        };

        const router = new Router(env);
        await setupSystemRoutes(router, env);

        // Prevent the path from reaching out to Auth0
        // @ts-ignore
        global.fetch = jest.fn().mockRejectedValue(new Error("Should not call external fetch"));

        const res = await router.handleRequest(new Request("https://localhost/api/__auth0/token", { method: "POST", headers: { Authorization: "Bearer test" } }), env);

        expect(res.status).toBe(200);
        const json = JSON.parse(await res.text());
        expect(json.access_token).toBe(cachedToken);
        expect(json.from_cache).toBe(true);
        expect(env.KV_CACHE.get).toHaveBeenCalledWith("auth0:management_token");
    });

    test("requests a new token and stores it in KV when not cached", async () => {
        const now = Math.floor(Date.now() / 1000);
        const newToken = "new-token-xyz";

        const env: any = {
            CORS_ORIGIN: "*",
            KV_CACHE: {
                get: jest.fn().mockResolvedValue(null as never),
                put: jest.fn().mockResolvedValue(undefined as never),
            },
            AUTH0_MANAGEMENT_API_CLIENT_ID: "id",
            AUTH0_MANAGEMENT_API_CLIENT_SECRET: "secret",
            AUTH0_DOMAIN: "example.com",
            ADMIN_AUTH0_PERMISSION: "admin:auth0",
            RATE_LIMITER: { limit: async () => ({ success: true }) },
        };

        const router = new Router(env);
        await setupSystemRoutes(router, env);

        // Mock fetch to simulate Auth0 token issuance
        // @ts-ignore
        global.fetch = jest.fn(async () => ({
            ok: true,
            json: async () => ({ access_token: newToken, token_type: "Bearer", expires_in: 7200 }),
        }));

        const res = await router.handleRequest(new Request("https://localhost/api/__auth0/token", { method: "POST", headers: { Authorization: "Bearer test" } }), env);

        expect(res.status).toBe(200);
        const json = JSON.parse(await res.text());
        expect(json.access_token).toBe(newToken);
        expect(json.from_cache).toBe(false);
        expect(env.KV_CACHE.get).toHaveBeenCalledWith("auth0:management_token");
        // Ensure KV put was invoked with seconds-based expiration
        expect(env.KV_CACHE.put).toHaveBeenCalled();
        const [cacheKey, cacheValue, cacheOpts] = env.KV_CACHE.put.mock.calls[0];
        expect(cacheKey).toBe("auth0:management_token");
        expect(typeof cacheValue).toBe("string");
        const parsedValue = JSON.parse(cacheValue);
        expect(parsedValue.token).toBe(newToken);
        expect(parsedValue.exp).toBeGreaterThan(now + 1000);
        expect(cacheOpts.expiration).toBeGreaterThan(now + 1000);
    });
});
