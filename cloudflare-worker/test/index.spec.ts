// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

import worker from '../src/index';
import * as jose from 'jose';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

// describe('Hello World worker', () => {
// 	it('responds with Hello World! (unit style)', async () => {
// 		const request = new IncomingRequest('http://example.com');
// 		// Create an empty context to pass to `worker.fetch()`.
// 		const ctx = createExecutionContext();
// 		const response = await worker.fetch(request, env, ctx);

// 		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
// 		await waitOnExecutionContext(ctx);
// 		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
// 	});

// 	it('responds with Hello World! (integration style)', async () => {
// 		const response = await SELF.fetch('https://example.com');

// 		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
// 	});

// 	// check with a fake JWKT token
// 	it('responds with Hello World! (integration style)', async () => {
// 		const request = new IncomingRequest('http://example.com', {
// 			headers: {
// 				Authorization: 'Bearer fake-jwt-token',
// 			},
// 		});
// 		const ctx = createExecutionContext();
// 		const response = await worker.fetch(request, env, ctx);

// 		await waitOnExecutionContext(ctx);
// 		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
// 	});
// });

// Test configuration
console.log(env);
const API_BASE_URL = env.API_BASE_URL || 'http://localhost:8787';
const AUTH0_TOKEN = env.AUTH0_TOKEN || '';

if (!AUTH0_TOKEN) {
	throw new Error('AUTH0_TOKEN environment variable is required');
}

// Test state
let testerId: string;
let testerUuid: string;
let purchaseId: string;

// HTTP client with authorization
const api = {
	post: async (path: string, data: any) => {
		const request = new IncomingRequest(`${API_BASE_URL}${path}`, {
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${AUTH0_TOKEN}`
			},
			method: 'POST',
			body: data,
		});
		console.log(request); 
		return worker.fetch(request, env as any);
	},
	get: async (path: string) => {
		const request =  new IncomingRequest(`${API_BASE_URL}${path}`, {
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${AUTH0_TOKEN}`
			},
			method: 'GET',
		});
		console.log(request);
		return worker.fetch(request, env as any);
	},
}

describe('Offline Feedback Flow API', () => {
	beforeAll(async () => {
		const decodedToken = jose.decodeJwt(AUTH0_TOKEN);
		testerId = decodedToken.sub as string;

		console.log(`Using Auth0 user ID: ${testerId}`);
	});

	it('01. Should create a new tester', async () => {
		expect(testerId).toBeDefined();
		expect(testerId).toMatch(/^[a-zA-Z0-9|]{8,30}$/);
		const response = await api.post('/tester', {
			name: 'TESTER'
		});

		console.log(response);
		expect(response.status).toBe(201);
		expect(response.data.success).toBe(true);
		expect(response.data.uuid).toBeDefined();

		testerUuid = response.data.uuid;
		console.log(`Created tester with UUID: ${testerUuid}`);
	});
});