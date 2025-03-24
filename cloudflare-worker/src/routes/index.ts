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
import { v4 as uuidv4 } from "uuid";

import {
	FeedbackCreateRequest,
	PublishCreateRequest,
	PurchaseCreateRequest,
	RefundCreateRequest,
	SortKey,
	TesterCreateRequest,
	TesterIdAddRequest,
	validSortKeys,
} from "../types/data";

import { Router } from "./router";
// Use the mock database
import { mockDb as db } from "./mockDb";

// Tester Management
const testerRoutes = (router: Router, env: Env) => {
	// Add a tester
	router.post(
		"/api/tester",
		async (request) => {
			try {
				const { name, ids: _ids } =
					(await request.json()) as TesterCreateRequest;

				if (!name || !_ids) {
					return new Response(
						JSON.stringify({
							success: false,
							error: "Name and at least one is are required",
						}),
						{
							status: 400,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				const uuid = uuidv4();
				let ids: string[] = [];

				if (typeof _ids === "string") {
					ids = [_ids];
				} else {
					ids = _ids;
				}
				// Add to the database
				const dbInsert = db.testers.put({ uuid, name, ids });

				if (!dbInsert) {
					return new Response(
						JSON.stringify({
							success: false,
							error: "Failed to create tester",
						}),
						{
							status: 500,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				} else {
					return new Response(JSON.stringify({ success: true, uuid }), {
						status: 201,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					});
				}
			} catch (error) {
				return new Response(
					JSON.stringify({
						success: false,
						error: `Invalid request: ${(error as Error).message}`,
					}),
					{
						status: 400,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}
		},
		env.ADMIN_PERMISSION,
	);

	// Add ID to tester
	router.post(
		"/api/tester/ids",
		async (request) => {
			try {
				const testerId = router.jwtPayload.sub;

				if (!testerId) {
					return router.handleUnauthorizedRequest();
				}

				const { name } = (await request.json()) as TesterIdAddRequest;

				if (!name) {
					return new Response(
						JSON.stringify({ success: false, error: "name is required" }),
						{
							status: 400,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				// Find tester in the database
				const tester = db.testers.find((t) => t.name === name);

				if (!tester) {
					return new Response(
						JSON.stringify({ success: false, error: "Tester not found" }),
						{
							status: 404,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				// Check if ID already exists to avoid duplicates
				if (tester.ids.includes(testerId)) {
					return new Response(
						JSON.stringify({
							success: false,
							name: tester.name,
							ids: tester.ids,
							message: "ID already exists for this tester",
						}),
						{
							status: 209,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				// Update the database
				const ids = db.testers.put({
					...tester,
					ids: [...tester.ids, testerId],
				});

				return new Response(
					JSON.stringify({ success: true, name: tester.name, ids }),
					{
						status: 200,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			} catch (error) {
				return new Response(
					JSON.stringify({
						success: false,
						error: `Invalid request: ${(error as Error).message}`,
					}),
					{
						status: 400,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}
		},
		env.ADMIN_PERMISSION,
	);

	// Get tester info by one of their IDs
	router.get(
		"/api/tester",
		async () => {
			// Get user ID from authenticated user
			const userId = router.jwtPayload.sub;

			if (!userId) {
				return new Response(
					JSON.stringify({ success: false, error: "Unauthorized" }),
					{
						status: 403,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}
			// Find tester in the database
			const tester = db.testers.find((t) => t.ids.includes(userId));

			if (!tester) {
				return new Response(
					JSON.stringify({ success: false, error: "Tester not found" }),
					{
						status: 404,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}

			return new Response(
				JSON.stringify({
					success: true,
					data: {
						uuid: tester.uuid,
						nom: tester.name,
						ids: tester.ids,
					},
				}),
				{
					status: 200,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				},
			);
		},
		env.ADMIN_PERMISSION,
	);
};

// Purchase Management
const purchaseRoutes = (router: Router, env: Env) => {
	// Add a purchase
	router.post(
		"/api/purchase",
		async (request) => {
			try {
				const data = (await request.json()) as PurchaseCreateRequest;
				const { date, order, description, amount, screenshot } = data;

				// Validate required fields
				if (
					!date ||
					!order ||
					!description ||
					amount === undefined ||
					!screenshot
				) {
					return new Response(
						JSON.stringify({
							success: false,
							error: "All fields are required",
						}),
						{
							status: 400,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				//  Add to the database
				const id = uuidv4();
				const testerId = router.jwtPayload.sub;
				const testerUuid = db.testers.getTesterWithId(testerId || "")?.uuid;

				if (!testerId || !testerUuid) {
					return router.handleUnauthorizedRequest();
				}
				//  TODO: Better error handling
				const dbInsert =
					db.purchases.put(testerUuid, {
						id,
						date,
						order,
						description,
						amount,
						screenshot,
						testerUuid,
						refunded: false,
					}).length > 0;

				return new Response(JSON.stringify({ success: dbInsert, id }), {
					status: 201,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				});
			} catch (error) {
				return new Response(
					JSON.stringify({
						success: false,
						error: `Invalid request: ${(error as Error).message}`,
					}),
				);
			}
		},
		env.WRITE_PERMISSION,
	);

	// Get purchase by ID
	router.get(
		"/api/purchase/:id",
		async (request) => {
			const { id } = request.params;

			// Find purchase in the database
			const purchase = db.purchases.find((p) => p.id === id);

			if (!purchase) {
				return new Response(
					JSON.stringify({ success: false, error: "Purchase not found" }),
					{
						status: 404,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}

			return new Response(
				JSON.stringify({
					success: true,
					data: {
						id: purchase.id,
						date: purchase.date,
						order: purchase.order,
						description: purchase.description,
						amount: purchase.amount,
						screenshot: purchase.screenshot,
					},
				}),
				{
					status: 200,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				},
			);
		},
		env.READ_PERMISSION,
	);

	// Get non-refunded purchases (with pagination)
	router.get(
		"/api/purchases/not-refunded",
		async (request) => {
			const url = new URL(request.url);
			const page = parseInt(url.searchParams.get("page") || "1");
			const limit = parseInt(url.searchParams.get("limit") || "10");
			const sort = url.searchParams.get("sort") || "date";
			const order = url.searchParams.get("order") || "desc";

			// Get user ID from authenticated user
			const userId = router.jwtPayload.sub;

			if (!userId) {
				return router.handleUnauthorizedRequest();
			}

			// Find tester by user ID
			const tester = db.testers.find((t) => t.ids.includes(userId || ""));

			if (!tester) {
				return new Response(
					JSON.stringify({ success: false, error: "Unauthorized" }),
					{
						status: 403,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}

			// Filter purchases by tester and non-refunded status
			const purchases = db.purchases.filter(
				(p) => p.testerUuid === tester.uuid && !p.refunded,
			);

			// Ensure sort is a valid key
			const sortKey = validSortKeys.includes(sort as SortKey)
				? (sort as SortKey)
				: "date";

			// Apply sorting
			const sortedPurchases = [...purchases].sort((a, b) => {
				if (order === "asc") {
					return a[sortKey] > b[sortKey] ? 1 : -1;
				} else {
					return a[sortKey] < b[sortKey] ? 1 : -1;
				}
			});

			// Apply pagination
			const start = (page - 1) * limit;
			const end = start + limit;
			const paginatedPurchases = sortedPurchases.slice(start, end);

			// Format response without screenshots
			const formattedPurchases = paginatedPurchases.map((p) => ({
				id: p.id,
				date: p.date,
				order: p.order,
				description: p.description,
				refunded: p.refunded,
				amount: p.amount,
			}));

			return new Response(
				JSON.stringify({
					success: true,
					data: formattedPurchases,
					total: purchases.length,
					page,
					limit,
				}),
				{
					status: 200,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				},
			);
		},
		env.READ_PERMISSION,
	);

	// Get refunded purchases (with pagination)
	router.get(
		"/api/purchases/refunded",
		async (request) => {
			const url = new URL(request.url);
			const page = parseInt(url.searchParams.get("page") || "1");
			const limit = parseInt(url.searchParams.get("limit") || "10");
			const sort = url.searchParams.get("sort") || "date";
			const order = url.searchParams.get("order") || "desc";

			// Get user ID from authenticated user
			const userId = router.jwtPayload.sub;

			if (!userId) {
				return router.handleUnauthorizedRequest();
			}

			// Find tester by user ID
			const tester = db.testers.find((t) => t.ids.includes(userId || ""));

			if (!tester) {
				return new Response(
					JSON.stringify({ success: false, error: "Unauthorized" }),
					{
						status: 403,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}

			// Filter purchases by tester and refunded status
			const purchases = db.purchases.filter(
				(p) => p.testerUuid === tester.uuid && p.refunded,
			);

			// Ensure sort is a valid key
			const sortKey = validSortKeys.includes(sort as SortKey)
				? (sort as SortKey)
				: "date";

			// Apply sorting
			const sortedPurchases = [...purchases].sort((a, b) => {
				if (order === "asc") {
					return a[sortKey] > b[sortKey] ? 1 : -1;
				} else {
					return a[sortKey] < b[sortKey] ? 1 : -1;
				}
			});

			// Apply pagination
			const start = (page - 1) * limit;
			const end = start + limit;
			const paginatedPurchases = sortedPurchases.slice(start, end);

			// Format response without screenshots
			const formattedPurchases = paginatedPurchases.map((p) => ({
				id: p.id,
				date: p.date,
				order: p.order,
				description: p.description,
				refunded: p.refunded,
				amount: p.amount,
			}));

			return new Response(
				JSON.stringify({
					success: true,
					data: formattedPurchases,
					total: purchases.length,
					page,
					limit,
				}),
				{
					status: 200,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				},
			);
		},
		env.READ_PERMISSION,
	);
};

// Feedback Management
const feedbackRoutes = (router: Router, env: Env) => {
	// Add feedback
	router.post(
		"/api/feedback",
		async (request) => {
			try {
				const { date, purchase, feedback } =
					(await request.json()) as FeedbackCreateRequest;

				if (!date || !purchase || !feedback) {
					return new Response(
						JSON.stringify({
							success: false,
							error: "Date and purchase ID are required",
						}),
						{
							status: 400,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				//  Add to the database
				const testerId = router.jwtPayload.sub;

				if (!testerId) {
					return router.handleUnauthorizedRequest();
				}
				const id = db.feedbacks.put(testerId, { date, purchase, feedback });

				// TODO: check id for error handling
				return new Response(JSON.stringify({ success: true, id }), {
					status: 201,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				});
			} catch (error) {
				return new Response(
					JSON.stringify({
						success: false,
						error: `Invalid request: ${(error as Error).message}`,
					}),
				);
			}
		},
		env.WRITE_PERMISSION,
	);

	// Record publication of feedback
	router.post(
		"/api/publish",
		async (request) => {
			try {
				const { date, purchase, screenshot } =
					(await request.json()) as PublishCreateRequest;

				if (!date || !purchase || !screenshot) {
					return new Response(
						JSON.stringify({
							success: false,
							error: "All fields are required",
						}),
						{
							status: 400,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				const testerId = router.jwtPayload.sub;

				if (!testerId) {
					return router.handleUnauthorizedRequest();
				}
				// Add to database
				const id = db.publications.put(testerId, {
					date,
					purchase,
					screenshot,
				});

				return new Response(JSON.stringify({ success: true, id }), {
					status: 201,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				});
			} catch (error) {
				return new Response(
					JSON.stringify({
						success: false,
						error: `Invalid request: ${(error as Error).message}`,
					}),
				);
			}
		},
		env.WRITE_PERMISSION,
	);

	// Get publication info
	router.get(
		"/api/publish/:id",
		async (request) => {
			const { id } = request.params;

			// Find publication in the database
			const publication = db.publications.find((p) => p.purchase === id);

			if (!publication) {
				return new Response(
					JSON.stringify({ success: false, error: "Publication not found" }),
					{
						status: 404,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}

			return new Response(
				JSON.stringify({
					success: true,
					data: {
						date: publication.date,
						purchase: publication.purchase,
						screenshot: publication.screenshot,
					},
				}),
				{
					status: 200,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				},
			);
		},
		env.READ_PERMISSION,
	);
};

// Refund Management
const refundRoutes = (router: Router, env: Env) => {
	// Record refund
	router.post(
		"/api/refund",
		async (request) => {
			try {
				const { date, purchase, refunddate, amount } =
					(await request.json()) as RefundCreateRequest;

				if (!date || !purchase || !refunddate || amount === undefined) {
					return new Response(
						JSON.stringify({
							success: false,
							error: "All fields are required",
						}),
						{
							status: 400,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				// Add to database
				const testerId = router.jwtPayload.sub;

				if (!testerId) {
					return router.handleUnauthorizedRequest();
				}
				const id = db.refunds.put(testerId, {
					date,
					purchase,
					refunddate,
					amount,
				});

				return new Response(JSON.stringify({ success: true, id }), {
					status: 201,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				});
			} catch (error) {
				return new Response(
					JSON.stringify({
						success: false,
						error: `Invalid request: ${(error as Error).message}`,
					}),
					{
						status: 400,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}
		},
		env.WRITE_PERMISSION,
	);

	// Get refund info
	router.get(
		"/api/refund/:id",
		async (request) => {
			const { id } = request.params;

			// Find refund in the database
			const refund = db.refunds.find((r) => r.purchase === id);

			if (!refund) {
				return new Response(
					JSON.stringify({ success: false, error: "Refund not found" }),
					{
						status: 404,
						headers: {
							...router.corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}

			return new Response(
				JSON.stringify({
					success: true,
					data: {
						date: refund.date,
						purchase: refund.purchase,
						refunddate: refund.refunddate,
						amount: refund.amount,
					},
				}),
				{
					status: 200,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				},
			);
		},
		env.READ_PERMISSION,
	);
};

/**
 * Setup routes
 * @param router The router
 * @param env The environment variables
 */
export const setupRoutes = (router: Router, env: Env) => {
	testerRoutes(router, env);
	purchaseRoutes(router, env);
	feedbackRoutes(router, env);
	refundRoutes(router, env);
};
