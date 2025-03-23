/**
 * MIT License
 *
 * Copyright (c) 2025 Ronan LE MEILLAT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { JWTPayload } from "jose";

import { checkPermissions } from "../auth0";

type RouteHandler = (
	request: Request & { params: Record<string, string>; user?: any },
	env: Env,
) => Promise<Response>;

interface Route {
	path: string;
	method: string;
	handler: RouteHandler;
	permission?: string;
}

export class Router {
	jwtPayload: JWTPayload = {};
	userPermissions: string[] = [];
	routes: Route[] = [];
	corsHeaders: Record<string, string>;

	constructor(env: Env) {
		this.corsHeaders = {
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Origin": env.CORS_ORIGIN,
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Content-Type": "application/json",
		};
	}

	get(path: string, handler: RouteHandler, permission?: string) {
		this.routes.push({ path, method: "GET", handler, permission });
	}

	post(path: string, handler: RouteHandler, permission?: string) {
		this.routes.push({ path, method: "POST", handler, permission });
	}

	put(path: string, handler: RouteHandler, permission?: string) {
		this.routes.push({ path, method: "PUT", handler, permission });
	}

	delete(path: string, handler: RouteHandler, permission?: string) {
		this.routes.push({ path, method: "DELETE", handler, permission });
	}

	async handleUnauthorizedRequest(): Promise<Response> {
		return new Response(
			JSON.stringify({ success: false, error: "Unauthorized" }),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	async handleRequest(request: Request, env: Env): Promise<Response> {
		// Handle OPTIONS request for CORS
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: {
					...this.corsHeaders,
					"Access-Control-Allow-Credentials": "true",
				},
			});
		}

		const url = new URL(request.url);
		const { pathname } = url;

		// Apply rate limiting
		const { success } = await env.RATE_LIMITER.limit({ key: pathname });

		if (!success) {
			return new Response(
				JSON.stringify(`429 Failure – rate limit exceeded for ${pathname}`),
				{
					status: 429,
					headers: { ...this.corsHeaders },
				},
			);
		}

		// Find matching route
		for (const route of this.routes) {
			if (route.method !== request.method) continue;

			const match = this.matchPath(route.path, pathname);

			if (!match) continue;

			// Check permission if required
			if (route.permission) {
				if (!request.headers.has("Authorization")) {
					return new Response(
						JSON.stringify({
							success: false,
							error: "Authentication required",
						}),
						{
							status: 401,
							headers: { ...this.corsHeaders },
						},
					);
				}

				const token = request.headers.get("Authorization")?.split(" ")[1];

				if (!token) {
					return new Response(
						JSON.stringify({
							success: false,
							error: "Invalid authorization header",
						}),
						{
							status: 401,
							headers: { ...this.corsHeaders },
						},
					);
				}

				const { access, payload, permissions } = await checkPermissions(
					token,
					route.permission,
					env,
				);

				this.userPermissions = permissions;
				this.jwtPayload = payload;

				if (!access) {
					return new Response(
						JSON.stringify({
							success: false,
							error: "Insufficient permissions",
						}),
						{
							status: 403,
							headers: { ...this.corsHeaders },
						},
					);
				}

				// Add user payload to request
				(request as any).user = payload;
			}

			// Add params to request
			(request as any).params = match;

			try {
				// Execute route handler
				return await route.handler(
					request as Request & { params: Record<string, string>; user?: any },
					env,
				);
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error("Route handler error:", error);

				return new Response(
					JSON.stringify({ success: false, error: "Internal server error" }),
					{
						status: 500,
						headers: { ...this.corsHeaders },
					},
				);
			}
		}

		// No route found
		return new Response(
			JSON.stringify({ success: false, error: "Not found" }),
			{
				status: 404,
				headers: { ...this.corsHeaders },
			},
		);
	}

	private matchPath(
		routePath: string,
		pathname: string,
	): Record<string, string> | null {
		const routeParts = routePath.split("/");
		const pathParts = pathname.split("/");

		if (routeParts.length !== pathParts.length) {
			return null;
		}

		const params: Record<string, string> = {};

		for (let i = 0; i < routeParts.length; i++) {
			const routePart = routeParts[i];
			const pathPart = pathParts[i];

			// Parameter part (starts with :)
			if (routePart.startsWith(":")) {
				const paramName = routePart.slice(1);

				params[paramName] = pathPart;
				continue;
			}

			// Fixed part - must match exactly
			if (routePart !== pathPart) {
				return null;
			}
		}

		return params;
	}
}
