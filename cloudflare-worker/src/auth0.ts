/* eslint-disable no-console */
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
import * as jose from "jose";

/**
 * Verify a JWT token against the Auth0 JWKS
 * @param token a JWT token
 * @param env the environment variables
 * @returns a promise that resolves to the payload of the JWT token
 */
export const verifyToken = async (
	token: string,
	env: Env,
): Promise<jose.JWTPayload> => {
	const JWKS = jose.createRemoteJWKSet(
		new URL(`https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`),
	);

	try {
		const joseResult = await jose.jwtVerify(token, JWKS, {
			issuer: `https://${env.AUTH0_DOMAIN}/`,
			audience: env.AUTH0_AUDIENCE,
		});

		const payload = joseResult.payload as jose.JWTPayload;

		return payload;
	} catch (error) {
		console.error(`Invalid token: ${(error as Error).message}`);
		throw new Error(`Invalid token: ${(error as Error).message}`);
	}
};

/**
 * Check if a token has a given permission
 * @param token a JWT token
 * @param permission a permission or an array of permissions
 * @param env the environment variables
 * @returns a promise that resolves to an object with a boolean access field and the payload of the JWT token
 */
export const checkPermissions = async (
	token: string,
	permission: string | string[],
	env: Env,
): Promise<{
	access: boolean;
	payload: jose.JWTPayload;
	permissions: string[];
}> => {
	const payload = await verifyToken(token, env);
	let access = false;
	let permissions: string[] = [];

	if (typeof permission === "string") {
		access = (payload.permissions as string[]).includes(permission);
		if (
			payload.permissions instanceof Array &&
			payload.permissions.every((item) => typeof item === "string")
		) {
			permissions = payload.permissions;
		}
	} else {
		access = permission.some((p) =>
			(payload.permissions as string[]).includes(p),
		);
		if (
			payload.permissions instanceof Array &&
			payload.permissions.every((item) => typeof item === "string")
		) {
			permissions = payload.permissions;
		}
	}

	return { access, payload, permissions };
};
