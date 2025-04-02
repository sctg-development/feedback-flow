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
	TesterCreateRequest,
	TesterIdAddRequest,
	purchaseAllowedSortKeys,
	testerAllowedSortKeys,
	TesterSortCriteria,
	PurchaseSortCriteria,
} from "../types/data";
import { InMemoryDB } from "../db/in-memory-db";
import { getDatabase } from "../db/db";
import { CloudflareD1DB } from "../db/d1-db";

import { Router } from "./router";

// Tester Management
const testerRoutes = (router: Router, env: Env) => {
	/**
	 * @openapi
	 * /api/testers:
	 *   get:
	 *     summary: Get all testers with pagination and sorting
	 *     description: Returns a paginated list of testers. Requires admin permission.
	 *     tags:
	 *       - Testers
	 *     parameters:
	 *       - name: page
	 *         in: query
	 *         description: Page number
	 *         schema:
	 *           type: integer
	 *           default: 1
	 *       - name: limit
	 *         in: query
	 *         description: Number of items per page
	 *         schema:
	 *           type: integer
	 *           default: 10
	 *       - name: sort
	 *         in: query
	 *         description: Sort field
	 *         schema:
	 *           type: string
	 *           default: name
	 *       - name: order
	 *         in: query
	 *         description: Sort order
	 *         schema:
	 *           type: string
	 *           enum: [asc, desc]
	 *           default: asc
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved testers
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 data:
	 *                   type: array
	 *                   items:
	 *                     $ref: '#/components/schemas/Tester'
	 *                 total:
	 *                   type: integer
	 *                 page:
	 *                   type: integer
	 *                 limit:
	 *                   type: integer
	 *       403:
	 *         description: Unauthorized request
	 */
	router.get(
		"/api/testers",
		async (request) => {
			const db = getDatabase(env);
			const url = new URL(request.url);
			const page = parseInt(url.searchParams.get("page") || "1");
			const limit = parseInt(url.searchParams.get("limit") || "10");
			const sort = url.searchParams.get("sort") || "name";
			const order = url.searchParams.get("order") || "asc";

			// Get all testers
			const testers = await db.testers.getAll();

			// Ensure sort is a valid key
			const sortKey = testerAllowedSortKeys.includes(sort as TesterSortCriteria)
				? (sort as TesterSortCriteria)
				: "name";

			// Apply sorting
			const sortedTesters = [...testers].sort((a, b) => {
				if (order === "asc") {
					return a[sortKey] > b[sortKey] ? 1 : -1;
				} else {
					return a[sortKey] < b[sortKey] ? 1 : -1;
				}
			});

			// Apply pagination
			const start = (page - 1) * limit;
			const end = start + limit;
			const paginatedTesters = sortedTesters.slice(start, end);

			return new Response(
				JSON.stringify({
					success: true,
					data: paginatedTesters,
					total: testers.length,
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
		env.ADMIN_PERMISSION,
	);

	/**
	 * @openapi
	 * /api/tester:
	 *   post:
	 *     summary: Add a new tester
	 *     description: Creates a new tester with the provided details. Requires admin permission.
	 *     tags:
	 *       - Testers
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             $ref: '#/components/schemas/TesterCreateRequest'
	 *     responses:
	 *       201:
	 *         description: Tester successfully created
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 uuid:
	 *                   type: string
	 *       400:
	 *         description: Invalid request or missing required fields
	 *       409:
	 *         description: ID already exists in the database
	 *       500:
	 *         description: Failed to create tester
	 */
	router.post(
		"/api/tester",
		async (request) => {
			const db = getDatabase(env);

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

				// Check ID must be unique for the whole database
				// TODO: might be very resource intensive with a large database
				for (const _id of _ids) {
					if (await db.idMappings.exists(_id)) {
						return new Response(
							JSON.stringify({
								success: false,
								error: "ID already exists in the database",
							}),
							{
								status: 409,
								headers: {
									...router.corsHeaders,
									"Content-Type": "application/json",
								},
							},
						);
					}
				}

				const uuid = uuidv4();
				let ids: string[] = [];

				if (typeof _ids === "string") {
					ids = [_ids];
				} else {
					ids = _ids;
				}
				// Add to the database
				const dbInsert = await db.testers.put({ uuid, name, ids });

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

	/**
	 * @openapi
	 * /api/tester/ids:
	 *   post:
	 *     summary: Add ID to existing tester
	 *     description: Adds a new ID to an existing tester. Requires admin permission.
	 *     tags:
	 *       - Testers
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             $ref: '#/components/schemas/TesterIdAddRequest'
	 *     responses:
	 *       200:
	 *         description: ID successfully added to tester
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 name:
	 *                   type: string
	 *                 ids:
	 *                   type: array
	 *                   items:
	 *                     type: string
	 *       209:
	 *         description: ID already exists for this tester
	 *       400:
	 *         description: Invalid request or missing required fields
	 *       404:
	 *         description: Tester not found
	 *       409:
	 *         description: ID already exists in the database
	 */
	router.post(
		"/api/tester/ids",
		async (request) => {
			const db = getDatabase(env);

			try {
				const testerId = router.jwtPayload.sub;

				if (!testerId) {
					return router.handleUnauthorizedRequest();
				}

				let { name, id } = (await request.json()) as TesterIdAddRequest;

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
				if (!id) {
					id = testerId;
				}

				// Check ID must be unique for the whole database
				if (await db.idMappings.exists(id)) {
					return new Response(
						JSON.stringify({
							success: false,
							error: "ID already exists in the database",
						}),
						{
							status: 409,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				// Find tester in the database
				const tester = await db.testers.find((t) => t.name === name);

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
				if (tester.ids.includes(id)) {
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
				const ids = await db.testers.put({
					...tester,
					ids: [...tester.ids, id],
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

	/**
	 * @openapi
	 * /api/tester:
	 *   get:
	 *     summary: Get tester info by ID
	 *     description: Returns information about the authenticated tester. Requires admin permission.
	 *     tags:
	 *       - Testers
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved tester info
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 data:
	 *                   type: object
	 *                   properties:
	 *                     uuid:
	 *                       type: string
	 *                     nom:
	 *                       type: string
	 *                     ids:
	 *                       type: array
	 *                       items:
	 *                         type: string
	 *       403:
	 *         description: Unauthorized request
	 *       404:
	 *         description: Tester not found
	 */
	router.get(
		"/api/tester",
		async () => {
			const db = getDatabase(env);

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
			const tester = await db.testers.find((t) => t.ids.includes(userId));

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
	/**
	 * @openapi
	 * /api/purchase:
	 *   post:
	 *     summary: Add a new purchase
	 *     description: Creates a new purchase record. Requires write permission.
	 *     tags:
	 *       - Purchases
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             $ref: '#/components/schemas/PurchaseCreateRequest'
	 *     responses:
	 *       201:
	 *         description: Purchase successfully created
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 id:
	 *                   type: string
	 *       400:
	 *         description: Invalid request or missing required fields
	 */
	router.post(
		"/api/purchase",
		async (request) => {
			const db = getDatabase(env);

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
				const testerUuid = (await db.testers.getTesterWithId(testerId || ""))
					?.uuid;

				if (!testerId || !testerUuid) {
					return router.handleUnauthorizedRequest();
				}
				//  TODO: Better error handling
				const dbInsert =
					(
						await db.purchases.put(testerUuid, {
							id,
							date,
							order,
							description,
							amount,
							screenshot,
							testerUuid,
							refunded: false,
						})
					).length > 0;

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

	/**
	 * @openapi
	 * /api/purchase/{id}:
	 *   get:
	 *     summary: Get purchase by ID
	 *     description: Returns information about a specific purchase. Requires read permission.
	 *     tags:
	 *       - Purchases
	 *     parameters:
	 *       - name: id
	 *         in: path
	 *         required: true
	 *         description: Purchase ID
	 *         schema:
	 *           type: string
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved purchase info
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 data:
	 *                   $ref: '#/components/schemas/Purchase'
	 *       404:
	 *         description: Purchase not found
	 */
	router.get(
		"/api/purchase/:id",
		async (request) => {
			const db = getDatabase(env);

			const purchaseId = request.params.id;
			const userId = router.jwtPayload.sub || "";

			// Find purchase in the database
			const purchase = await db.purchases.find(p => p.id === purchaseId);

			// Find tester by user ID
			const testerUuid = await db.idMappings.getTesterUuid(userId);
			if (!purchase || purchase.testerUuid !== testerUuid) {
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

	/**
	 * @openapi
	 * /api/purchases/not-refunded:
	 *   get:
	 *     summary: Get non-refunded purchases
	 *     description: Returns a paginated list of non-refunded purchases for the authenticated user. Requires read permission.
	 *     tags:
	 *       - Purchases
	 *     parameters:
	 *       - name: page
	 *         in: query
	 *         description: Page number
	 *         schema:
	 *           type: integer
	 *           default: 1
	 *       - name: limit
	 *         in: query
	 *         description: Number of items per page
	 *         schema:
	 *           type: integer
	 *           default: 10
	 *       - name: sort
	 *         in: query
	 *         description: Sort field
	 *         schema:
	 *           type: string
	 *           default: date
	 *       - name: order
	 *         in: query
	 *         description: Sort order
	 *         schema:
	 *           type: string
	 *           enum: [asc, desc]
	 *           default: desc
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved purchases
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 data:
	 *                   type: array
	 *                   items:
	 *                     $ref: '#/components/schemas/PurchaseSummary'
	 *                 total:
	 *                   type: integer
	 *                 page:
	 *                   type: integer
	 *                 limit:
	 *                   type: integer
	 *       403:
	 *         description: Unauthorized request
	 */
	router.get(
		"/api/purchases/not-refunded",
		async (request) => {
			const db = getDatabase(env);
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
			const tester = await db.testers.find((t) => t.ids.includes(userId || ""));

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
			const purchases = await db.purchases.filter(
				(p) => p.testerUuid === tester.uuid && !p.refunded,
			);

			// Ensure sort is a valid key
			const sortKey = purchaseAllowedSortKeys.includes(
				sort as PurchaseSortCriteria,
			)
				? (sort as PurchaseSortCriteria)
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

	/**
	 * @openapi
	 * /api/purchases/refunded:
	 *   get:
	 *     summary: Get refunded purchases
	 *     description: Returns a paginated list of refunded purchases for the authenticated user. Requires read permission.
	 *     tags:
	 *       - Purchases
	 *     parameters:
	 *       - name: page
	 *         in: query
	 *         description: Page number
	 *         schema:
	 *           type: integer
	 *           default: 1
	 *       - name: limit
	 *         in: query
	 *         description: Number of items per page
	 *         schema:
	 *           type: integer
	 *           default: 10
	 *       - name: sort
	 *         in: query
	 *         description: Sort field
	 *         schema:
	 *           type: string
	 *           default: date
	 *       - name: order
	 *         in: query
	 *         description: Sort order
	 *         schema:
	 *           type: string
	 *           enum: [asc, desc]
	 *           default: desc
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved purchases
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 data:
	 *                   type: array
	 *                   items:
	 *                     $ref: '#/components/schemas/PurchaseSummary'
	 *                 total:
	 *                   type: integer
	 *                 page:
	 *                   type: integer
	 *                 limit:
	 *                   type: integer
	 *       403:
	 *         description: Unauthorized request
	 */
	router.get(
		"/api/purchases/refunded",
		async (request) => {
			const db = getDatabase(env);
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
			const tester = await db.testers.find((t) => t.ids.includes(userId || ""));

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
			const purchases = await db.purchases.filter(
				(p) => p.testerUuid === tester.uuid && p.refunded,
			);

			// Ensure sort is a valid key
			const sortKey = purchaseAllowedSortKeys.includes(
				sort as PurchaseSortCriteria,
			)
				? (sort as PurchaseSortCriteria)
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
	/**
	 * @openapi
	 * /api/purchase-status:
	 *   get:
	 *     summary: Get purchase status with pagination
	 *     description: Returns a paginated list of purchase statuses for the authenticated user. Requires read permission.
	 *     tags:
	 *       - Purchases
	 *     parameters:
	 *       - name: limitToNotRefunded
	 *         in: query
	 *         description: Limit to non-refunded purchases
	 *         schema:
	 *           type: boolean
	 *           default: false
	 *       - name: page
	 *         in: query
	 *         description: Page number
	 *         schema:
	 *           type: integer
	 *           default: 1
	 *       - name: limit
	 *         in: query
	 *         description: Number of items per page
	 *         schema:
	 *           type: integer
	 *           default: 10
	 *       - name: sort
	 *         in: query
	 *         description: Sort field
	 *         schema:
	 *           type: string
	 *           default: date
	 *       - name: order
	 *         in: query
	 *         description: Sort order
	 *         schema:
	 *           type: string
	 *           enum: [asc, desc]
	 *           default: desc
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved purchase statuses
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 data:
	 *                   type: array
	 *                   items:
	 *                     $ref: '#/components/schemas/PurchaseStatus'
	 *                 total:
	 *                   type: integer
	 *                 page:
	 *                   type: integer
	 *                 limit:
	 *                   type: integer
	 *       400:
	 *         description: Invalid request
	 *       403:
	 *         description: Unauthorized request
	 */
	router.get(
		"/api/purchase-status",
		async (request) => {
			const db = getDatabase(env);
			const url = new URL(request.url);
			const limitToNotRefunded =
				url.searchParams.get("limitToNotRefunded") === "true";
			const page = parseInt(url.searchParams.get("page") || "1");
			const limit = parseInt(url.searchParams.get("limit") || "10");
			const sort = url.searchParams.get("sort") || "date";
			const order = url.searchParams.get("order") || "desc";
			const testerId = router.jwtPayload.sub;

			if (!testerId) {
				return router.handleUnauthorizedRequest();
			}
			// Find tester by user ID
			const tester = await db.testers.find((t) => t.ids.includes(testerId));

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

			try {
				const purchases = await db.purchases.getPurchaseStatus(
					tester.uuid,
					limitToNotRefunded,
					page,
					limit,
					sort,
					order,
				);

				return new Response(
					JSON.stringify({
						success: true,
						data: purchases.results,
						total: purchases.pageInfo.totalCount,
						page: purchases.pageInfo.currentPage,
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
			} catch (error) {
				console.error("Error fetching purchase status:", error);

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
		env.READ_PERMISSION,
	);
};

// Feedback Management
const feedbackRoutes = (router: Router, env: Env) => {
	/**
	 * @openapi
	 * /api/feedback:
	 *   post:
	 *     summary: Add feedback
	 *     description: Creates a new feedback record. Requires write permission.
	 *     tags:
	 *       - Feedback
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             $ref: '#/components/schemas/FeedbackCreateRequest'
	 *     responses:
	 *       201:
	 *         description: Feedback successfully created
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 id:
	 *                   type: string
	 *       400:
	 *         description: Invalid request or missing required fields
	 */
	router.post(
		"/api/feedback",
		async (request) => {
			const db = getDatabase(env);

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
				const id = await db.feedbacks.put(testerId, {
					date,
					purchase,
					feedback,
				});

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

	/**
	 * @openapi
	 * /api/publish:
	 *   post:
	 *     summary: Record publication of feedback
	 *     description: Records the publication of feedback. Requires write permission.
	 *     tags:
	 *       - Feedback
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             $ref: '#/components/schemas/PublishCreateRequest'
	 *     responses:
	 *       201:
	 *         description: Publication successfully recorded
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 id:
	 *                   type: string
	 *       400:
	 *         description: Invalid request or missing required fields
	 */
	router.post(
		"/api/publish",
		async (request) => {
			const db = getDatabase(env);

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
				const id = await db.publications.put(testerId, {
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

	/**
	 * @openapi
	 * /api/publish/{id}:
	 *   get:
	 *     summary: Get publication info
	 *     description: Returns information about a specific publication. Requires read permission.
	 *     tags:
	 *       - Feedback
	 *     parameters:
	 *       - name: id
	 *         in: path
	 *         required: true
	 *         description: Purchase ID
	 *         schema:
	 *           type: string
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved publication info
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 data:
	 *                   $ref: '#/components/schemas/Publication'
	 *       404:
	 *         description: Publication not found
	 */
	router.get(
		"/api/publish/:id",
		async (request) => {
			const db = getDatabase(env);
			const { id } = request.params;

			// Find publication in the database
			const publication = await db.publications.find((p) => p.purchase === id);

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
	/**
	 * @openapi
	 * /api/refund:
	 *   post:
	 *     summary: Record refund
	 *     description: Records a refund for a purchase. Requires write permission.
	 *     tags:
	 *       - Refunds
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             $ref: '#/components/schemas/RefundCreateRequest'
	 *     responses:
	 *       201:
	 *         description: Refund successfully recorded
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 id:
	 *                   type: string
	 *       400:
	 *         description: Invalid request or missing required fields
	 */
	router.post(
		"/api/refund",
		async (request) => {
			const db = getDatabase(env);

			try {
				const { date, purchase, refundDate, amount } =
					(await request.json()) as RefundCreateRequest;

				if (!date || !purchase || !refundDate || amount === undefined) {
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
				const id = await db.refunds.put(testerId, {
					date,
					purchase,
					refundDate,
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

	/**
	 * @openapi
	 * /api/refund/{id}:
	 *   get:
	 *     summary: Get refund info
	 *     description: Returns information about a specific refund. Requires read permission.
	 *     tags:
	 *       - Refunds
	 *     parameters:
	 *       - name: id
	 *         in: path
	 *         required: true
	 *         description: Purchase ID
	 *         schema:
	 *           type: string
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved refund info
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 data:
	 *                   $ref: '#/components/schemas/Refund'
	 *       404:
	 *         description: Refund not found
	 */
	router.get(
		"/api/refund/:id",
		async (request) => {
			const db = getDatabase(env);
			const { id } = request.params;

			// Find refund in the database
			const refund = await db.refunds.find((r) => r.purchase === id);

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
						refundDate: refund.refundDate,
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
 * @openapi
 * components:
 *   schemas:
 *     Tester:
 *       type: object
 *       properties:
 *         uuid:
 *           type: string
 *         name:
 *           type: string
 *         ids:
 *           type: array
 *           items:
 *             type: string
 *     TesterCreateRequest:
 *       type: object
 *       required:
 *         - name
 *         - ids
 *       properties:
 *         name:
 *           type: string
 *         ids:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *     TesterIdAddRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         id:
 *           type: string
 *     Purchase:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         order:
 *           type: string
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *         screenshot:
 *           type: string
 *     PurchaseSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         order:
 *           type: string
 *         description:
 *           type: string
 *         refunded:
 *           type: boolean
 *         amount:
 *           type: number
 *     PurchaseStatus:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         order:
 *           type: string
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *         refunded:
 *           type: boolean
 *     PurchaseCreateRequest:
 *       type: object
 *       required:
 *         - date
 *         - order
 *         - description
 *         - amount
 *         - screenshot
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         order:
 *           type: string
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *         screenshot:
 *           type: string
 *     FeedbackCreateRequest:
 *       type: object
 *       required:
 *         - date
 *         - purchase
 *         - feedback
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         purchase:
 *           type: string
 *         feedback:
 *           type: string
 *     PublishCreateRequest:
 *       type: object
 *       required:
 *         - date
 *         - purchase
 *         - screenshot
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         purchase:
 *           type: string
 *         screenshot:
 *           type: string
 *     Publication:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         purchase:
 *           type: string
 *         screenshot:
 *           type: string
 *     RefundCreateRequest:
 *       type: object
 *       required:
 *         - date
 *         - purchase
 *         - refundDate
 *         - amount
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         purchase:
 *           type: string
 *         refundDate:
 *           type: string
 *           format: date-time
 *         amount:
 *           type: number
 *     Refund:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         purchase:
 *           type: string
 *         refundDate:
 *           type: string
 *           format: date-time
 *         amount:
 *           type: number
 */

/**
 * Setup routes
 * @openapi
 * /api/backup/json:
 *   get:
 *     summary: Backup database to JSON
 *     description: Exports the entire database as JSON. Only available for in-memory and D1 databases. Requires backup permission.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Successfully exported database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *   post:
 *     summary: Restore database from JSON
 *     description: Imports database from JSON. Only available for in-memory and D1 databases. Requires backup permission.
 *     tags:
 *       - System
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully imported database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       500:
 *         description: Failed to restore database
 * 
 * @param router The router
 * @param env The environment variables
 */
export const setupRoutes = (router: Router, env: Env) => {
	const db = getDatabase(env);

	testerRoutes(router, env);
	purchaseRoutes(router, env);
	feedbackRoutes(router, env);
	refundRoutes(router, env);

	// Only allow backup route for in-memory database
	if (db instanceof InMemoryDB || db instanceof CloudflareD1DB) {
		router.get(
			"/api/backup/json",
			async () => {
				const json = await db.backupToJson();

				return new Response(json, {
					status: 200,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				});
			},
			env.BACKUP_PERMISSION,
		);
		router.post(
			"/api/backup/json",
			async (request) => {
				const json = await request.json();

				// eslint-disable-next-line no-console
				console.log("Restoring from JSON");
				const result = await db.restoreFromJsonString(JSON.stringify(json));

				if (!result.success) {
					return new Response(
						JSON.stringify({
							success: false,
							error: result.message || "Failed to restore",
						}),
						{
							status: 500,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: {
						...router.corsHeaders,
						"Content-Type": "application/json",
					},
				});
			},
			env.BACKUP_PERMISSION,
		);
	}
};
