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
	Purchase,
	PurchaseCreateRequest,
	PurchaseUpdateRequest,
	RefundCreateRequest,
	TesterCreateRequest,
	TesterIdAddRequest,
	purchaseAllowedSortKeys,
	testerAllowedSortKeys,
	TesterSortCriteria,
	PurchaseSortCriteria,
	ReadyForRefundPurchase,
} from "../types/data";
import { InMemoryDB } from "../db/in-memory-db";
import { getDatabase } from "../db/db";
import { CloudflareD1DB } from "../db/d1-db";

import { Router } from "./router";
import { setupTesterRoutes } from "./testers";
import { setupPurchaseRoutes } from "./purchases";
import { setupFeedbackRoutes } from "./feedback";

// Tester Management
const testerRoutes = (router: Router, env: Env) => {
	setupTesterRoutes(router, env);
};

// Purchase Management
const purchaseRoutes = (router: Router, env: Env) => {
	setupPurchaseRoutes(router, env);
};

// Feedback Management
// Feedback Management
const feedbackRoutes = (router: Router, env: Env) => {
	setupFeedbackRoutes(router, env);
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
				const { date, purchase, refundDate, amount, transactionId } =
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
					transactionId,
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
						transactionId: refund.transactionId,
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

// Statistics API Routes
const statsRoutes = (router: Router, env: Env) => {
	/**
	 * @openapi
	 * /api/stats/refund-balance:
	 *   get:
	 *     summary: Get refund balance statistics
	 *     description: Returns the difference between the total purchase amount of refunded purchases and the total refund amount. Requires read permission. Optional parameters (daysLimit or purchaseLimit) require search:api permission.
	 *     tags:
	 *       - Statistics
	 *     parameters:
	 *       - name: daysLimit
	 *         in: query
	 *         description: Limit statistics to purchases from the last N days (requires search:api permission)
	 *         schema:
	 *           type: integer
	 *       - name: purchaseLimit
	 *         in: query
	 *         description: Limit statistics to the last N purchases (requires search:api permission)
	 *         schema:
	 *           type: integer
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved refund balance statistics
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                   example: true
	 *                 purchasedAmount:
	 *                   type: number
	 *                   description: Total amount of refunded purchases
	 *                   example: 123.45
	 *                 refundedAmount:
	 *                   type: number
	 *                   description: Total amount of refunds
	 *                   example: 120.00
	 *                 balance:
	 *                   type: number
	 *                   description: Difference between purchased and refunded amounts (negative means refunded more than purchased)
	 *                   example: 3.45
	 *                 limit:
	 *                   type: object
	 *                   description: Applied limit information
	 *                   properties:
	 *                     type:
	 *                       type: string
	 *                       enum: [default, days, purchases]
	 *                     value:
	 *                       type: integer
	 *       403:
	 *         description: Unauthorized request
	 *       500:
	 *         description: Server error
	 */
	router.get(
		"/api/stats/refund-balance",
		async (request) => {
			const db = getDatabase(env);
			const url = new URL(request.url);

			// Get user ID from authenticated user
			const userId = router.jwtPayload.sub;
			console.log(`User has these permissions: ${JSON.stringify(router.jwtPayload.permissions)}`);

			if (!userId) {
				return router.handleUnauthorizedRequest();
			}

			// Find tester by user ID
			const testerUuid = await db.idMappings.getTesterUuid(userId);

			if (!testerUuid) {
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
				// Parse optional parameters
				const daysLimit = url.searchParams.get("daysLimit");
				const purchaseLimitParam = url.searchParams.get("purchaseLimit");

				let limit = parseInt(env.STATISTICS_LIMIT || "100");
				let limitType = "default";
				let limitValue = limit;

				// Apply days limit if provided
				if (daysLimit) {
					const days = parseInt(daysLimit);
					const cutoffDate = new Date();
					cutoffDate.setDate(cutoffDate.getDate() - days);
					const cutoffDateStr = cutoffDate.toISOString().split("T")[0];
					limitType = "days";
					limitValue = days;

					// Get all refunded purchases and filter by date
					const { results: allRefundedPurchases } = await db.purchases.refunded(testerUuid, { page: 1, limit: 10000, sort: "date", order: "desc" });

					console.log("Days filter debug:");
					console.log("- daysLimit:", daysLimit);
					console.log("- cutoffDate:", cutoffDateStr);
					console.log("- Total refunded purchases:", allRefundedPurchases.length);
					console.log("- First few purchases dates:", allRefundedPurchases.slice(0, 3).map(p => p.date));

					const refundedPurchases = allRefundedPurchases.filter(p => p.date >= cutoffDateStr);

					console.log("- Filtered purchases count:", refundedPurchases.length);
					console.log("- Filtered dates:", refundedPurchases.slice(0, 3).map(p => p.date));

					// Calculate total amount of refunded purchases
					const purchasedAmount = refundedPurchases.reduce((total, purchase) => total + purchase.amount, 0);

					// Get all refunds for the user
					const allRefunds = await db.refunds.getAll();

					// Filter refunds for purchases made by this user in the date range
					const userRefunds = allRefunds.filter((refund) => {
						return refundedPurchases.some(purchase => purchase.id === refund.purchase);
					});

					// Calculate total refunded amount
					const refundedAmount = userRefunds.reduce((total, refund) => total + refund.amount, 0);

					// Calculate the balance
					const balance = refundedAmount - purchasedAmount;

					return new Response(
						JSON.stringify({
							success: true,
							purchasedAmount,
							refundedAmount,
							balance,
							limit: {
								type: limitType,
								value: limitValue,
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
				}

				// Apply purchase limit if provided
				if (purchaseLimitParam) {
					limit = parseInt(purchaseLimitParam);
					limitType = "purchases";
					limitValue = limit;
				}

				// Get refunded purchases (we need their IDs and amounts)
				const { results: refundedPurchases } = await db.purchases.refunded(testerUuid, { page: 1, limit, sort: "date", order: "desc" });

				// Calculate total amount of refunded purchases
				const purchasedAmount = refundedPurchases.reduce((total, purchase) => total + purchase.amount, 0);

				// Get all refunds for the user
				const allRefunds = await db.refunds.getAll();

				// Filter refunds for purchases made by this user
				const userRefunds = allRefunds.filter((refund) => {
					// Check if this refund is for a purchase in the refundedPurchases list
					return refundedPurchases.some(purchase => purchase.id === refund.purchase);
				});

				// Calculate total refunded amount
				const refundedAmount = userRefunds.reduce((total, refund) => total + refund.amount, 0);

				// Calculate the balance (difference) credit/debit credit means that the user has refunded more than they purchased
				const balance = refundedAmount - purchasedAmount;

				return new Response(
					JSON.stringify({
						success: true,
						purchasedAmount,
						refundedAmount,
						balance,
						limit: {
							type: limitType,
							value: limitValue,
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
			} catch (error) {
				return new Response(
					JSON.stringify({
						success: false,
						error: `Error calculating refund balance: ${(error as Error).message}`,
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
		},
		env.READ_PERMISSION,
	);

	/**
	 * @openapi
	 * /api/stats/refund-delay:
	 *   get:
	 *     summary: Get refund delay statistics
	 *     description: Returns statistics about the delay between purchase and refund dates. Requires read permission. Optional parameter (daysLimit) can filter to purchases from the last N days.
	 *     tags:
	 *       - Statistics
	 *     parameters:
	 *       - name: daysLimit
	 *         in: query
	 *         description: Limit statistics to purchases from the last N days
	 *         schema:
	 *           type: integer
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved refund delay statistics
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                   example: true
	 *                 data:
	 *                   type: array
	 *                   items:
	 *                     type: object
	 *                     properties:
	 *                       purchaseId:
	 *                         type: string
	 *                       purchaseAmount:
	 *                         type: number
	 *                       refundAmount:
	 *                         type: number
	 *                       delayInDays:
	 *                         type: number
	 *                       purchaseDate:
	 *                         type: string
	 *                         format: date
	 *                       refundDate:
	 *                         type: string
	 *                         format: date
	 *                       order:
	 *                         type: string
	 *                 averageDelayInDays:
	 *                   type: number
	 *                   description: Average delay between purchase and refund in days
	 *       403:
	 *         description: Unauthorized request
	 *       500:
	 *         description: Server error
	 */
	router.get(
		"/api/stats/refund-delay",
		async (request) => {
			const db = getDatabase(env);
			const url = new URL(request.url);

			// Get user ID from authenticated user
			const userId = router.jwtPayload.sub;

			if (!userId) {
				return router.handleUnauthorizedRequest();
			}

			// Find tester by user ID
			const testerUuid = await db.idMappings.getTesterUuid(userId);

			if (!testerUuid) {
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
				// Parse optional parameters
				const daysLimit = url.searchParams.get("daysLimit");

				// Get refunded purchases (we need their IDs, dates and amounts)
				let purchaseLimit = parseInt(env.STATISTICS_LIMIT || "100");

				// If daysLimit is provided, get all purchases and filter by date
				if (daysLimit) {
					const days = parseInt(daysLimit);
					const cutoffDate = new Date();
					cutoffDate.setDate(cutoffDate.getDate() - days);
					const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

					// Get all refunded purchases to filter by date
					const { results: allRefundedPurchases } = await db.purchases.refunded(testerUuid, { page: 1, limit: 10000, sort: "date", order: "desc" });

					// Filter by date
					const filteredPurchases = allRefundedPurchases.filter(p => p.date >= cutoffDateStr);

					const allRefunds = await db.refunds.getAll();

					// Create delay statistics by matching purchases with their refunds
					const delayStats = [];
					let totalDelayDays = 0;

					for (const purchase of filteredPurchases) {
						const refund = allRefunds.find(r => r.purchase === purchase.id);

						if (refund) {
							// Calculate delay in days
							const purchaseDate = new Date(purchase.date);
							const refundDate = new Date(refund.refundDate);

							// Calculate the difference in days
							const diffTime = refundDate.getTime() - purchaseDate.getTime();
							const delayInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

							totalDelayDays += delayInDays;

							delayStats.push({
								purchaseId: purchase.id,
								purchaseAmount: purchase.amount,
								refundAmount: refund.amount,
								delayInDays,
								purchaseDate: purchase.date,
								refundDate: refund.refundDate,
								order: purchase.order,
							});
						}
					}

					// Calculate average delay
					const averageDelayInDays = delayStats.length > 0
						? Number((totalDelayDays / delayStats.length).toFixed(2))
						: 0;

					return new Response(
						JSON.stringify({
							success: true,
							data: delayStats,
							averageDelayInDays,
						}),
						{
							status: 200,
							headers: {
								...router.corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				// Default behavior: get limited refunded purchases
				const { results: refundedPurchases } = await db.purchases.refunded(testerUuid, { page: 1, limit: purchaseLimit, sort: "date", order: "desc" });

				// Get all refunds for the user
				const allRefunds = await db.refunds.getAll();

				// Create delay statistics by matching purchases with their refunds
				const delayStats = [];
				let totalDelayDays = 0;

				for (const purchase of refundedPurchases) {
					const refund = allRefunds.find(r => r.purchase === purchase.id);

					if (refund) {
						// Calculate delay in days
						const purchaseDate = new Date(purchase.date);
						const refundDate = new Date(refund.refundDate);

						// Calculate the difference in days
						const diffTime = refundDate.getTime() - purchaseDate.getTime();
						const delayInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

						totalDelayDays += delayInDays;

						delayStats.push({
							purchaseId: purchase.id,
							purchaseAmount: purchase.amount,
							refundAmount: refund.amount,
							delayInDays,
							purchaseDate: purchase.date,
							refundDate: refund.refundDate,
							order: purchase.order,
						});
					}
				}

				// Calculate average delay
				const averageDelayInDays = delayStats.length > 0
					? Number((totalDelayDays / delayStats.length).toFixed(2))
					: 0;

				return new Response(
					JSON.stringify({
						success: true,
						data: delayStats,
						averageDelayInDays,
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
				return new Response(
					JSON.stringify({
						success: false,
						error: `Error calculating refund delays: ${(error as Error).message}`,
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
		},
		env.READ_PERMISSION,
	);
	/**
	 * @openapi
	 * /api/stats/purchases:
	 *   get:
	 *     summary: Get purchase statistics
	 *     description: Returns purchase statistics for the authenticated user. Requires read permission.
	 *     tags:
	 *       - Statistics
	 *     responses:
	 *       200:
	 *         description: Successfully retrieved purchase statistics
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                   example: true
	 *                 data:
	 *                   type: object
	 *                   properties:
	 *                     totalPurchases:
	 *                       type: integer
	 *                       example: 10
	 *                     totalRefundedPurchases:
	 *                       type: integer
	 *                       example: 2
	 *                     totalRefundedAmount:
	 *                       type: number
	 *                       example: 50.00
	 *       403:
	 *         description: Unauthorized request
	 */
	router.get("/api/stats/purchases", async () => {
		const db = getDatabase(env);

		// Get user ID from authenticated user
		const userId = router.jwtPayload.sub;

		if (!userId) {
			return router.handleUnauthorizedRequest();
		}

		// Find tester by user ID
		const testerUuid = await db.idMappings.getTesterUuid(userId);

		if (!testerUuid) {
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
			// Get purchase statistics
			const purchaseStats = await db.purchases.getPurchaseStatistics(testerUuid);

			return new Response(
				JSON.stringify({
					success: true,
					data: purchaseStats,
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
			return new Response(
				JSON.stringify({
					success: false,
					error: `Error fetching purchase statistics: ${(error as Error).message}`,
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

	}, env.READ_PERMISSION);
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
 *         - transactionId
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
 *         transactionId:
 *           type: string
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
export const setupRoutes = async (router: Router, env: Env) => {
	const db = getDatabase(env);

	testerRoutes(router, env);
	purchaseRoutes(router, env);
	feedbackRoutes(router, env);
	refundRoutes(router, env);
	statsRoutes(router, env);

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
	if (db instanceof CloudflareD1DB) {
		/** 
		 * Debug endpoint to get the database table names
		 * return a json object like
		 * {
		 *   "tables": [
		 * 	"sqlite_sequence",
		 * 	"testers",
		 * 	"id_mappings",
		 * 	"purchases",
		 * 	"feedbacks",
		 * 	"publications",
		 * 	"refunds",
		 * 	"schema_version"
			 *  ],
		 *   "timestamp": "2025-04-18T11:35:40.537Z"
		 * }
		 */
		/**
		 * @openapi
		 * /api/__d1/schema:
		 *   get:
		 *     summary: Get database table names (available only for D1)
		 *     description: Returns a list of all tables in the database. Requires admin permission.
		 *     tags:
		 *       - System
		 *       - Cloudflare D1
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved table names
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 tables:
		 *                   type: array
		 *                   description: List of table names in the database
		 *                   items:
		 *                     type: string
		 *                   example:
		 *                     - sqlite_sequence
		 *                     - testers
		 *                     - id_mappings
		 *                     - purchases
		 *                     - feedbacks
		 *                     - publications
		 *                     - refunds
		 *                     - schema_version
		 *                 timestamp:
		 *                   type: string
		 *                   format: date-time
		 *                   description: Time when the table names were retrieved
		 *                   example: "2025-04-18T11:35:40.537Z"
		 *       500:
		 *         description: Error retrieving table names
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 error:
		 *                   type: string
		 *                 stack:
		 *                   type: string
		 *       403:
		 *         description: Unauthorized - Admin permission required
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 success:
		 *                   type: boolean
		 *                   example: false
		 *                 error:
		 *                   type: string
		 *                   example: "Unauthorized"
		 */
		router.get(
			"/api/__d1/schema",
			async () => {
				try {
					const db = await getDatabase(env) as CloudflareD1DB;
					const tableCheck = await db.getTableNames();

					return new Response(JSON.stringify({
						tables: tableCheck,
						timestamp: new Date().toISOString()
					}, null, 2), {
						status: 200,
						headers: { ...router.corsHeaders, "Content-Type": "application/json" }
					});
				} catch (error) {
					return new Response(JSON.stringify({
						error: String(error),
						stack: error instanceof Error ? error.stack : undefined
					}, null, 2), {
						status: 500,
						headers: { ...router.corsHeaders, "Content-Type": "application/json" }
					});
				}
			}
			, env.ADMIN_PERMISSION
		);


		/**
		 * Debug endpoint to get the database schema version
		 * return a json object like
		 * {
			 *  "version": {
		 * 	"version": 1,
		 * 	"description": "Added transaction_id to refunds"
			 *  },
		 *   "timestamp": "2025-04-18T11:36:40.414Z"
		 * }
		 */
		/**
		 * @openapi
		 * /api/__d1/schema_version:
		 *   get:
		 *     summary: Get database schema version (available only for D1)
		 *     description: Returns the current database schema version information. Requires admin permission.
		 *     tags:
		 *       - System
		 *       - Cloudflare D1
		 *     responses:
		 *       200:
		 *         description: Successfully retrieved schema version
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 version:
		 *                   type: object
		 *                   description: Schema version details
		 *                   properties:
		 *                     version:
		 *                       type: integer
		 *                       description: Current schema version number
		 *                       example: 1
		 *                     description:
		 *                       type: string
		 *                       description: Description of the current schema version
		 *                       example: "Added transaction_id to refunds"
		 *                 timestamp:
		 *                   type: string
		 *                   format: date-time
		 *                   description: Time when the version was retrieved
		 *                   example: "2025-04-18T11:36:40.414Z"
		 *       500:
		 *         description: Error retrieving schema version
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 error:
		 *                   type: string
		 *                 stack:
		 *                   type: string
		 *       403:
		 *         description: Unauthorized - Admin permission required
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 success:
		 *                   type: boolean
		 *                   example: false
		 *                 error:
		 *                   type: string
		 *                   example: "Unauthorized"
		 */
		router.get(
			"/api/__d1/schema_version",
			async () => {
				try {
					const db = await getDatabase(env) as CloudflareD1DB;
					const version = await db.getSchemaVersion();

					return new Response(JSON.stringify({
						version: version,
						timestamp: new Date().toISOString()
					}, null, 2), {
						status: 200,
						headers: { ...router.corsHeaders, "Content-Type": "application/json" }
					});
				} catch (error) {
					return new Response(JSON.stringify({
						error: String(error),
						stack: error instanceof Error ? error.stack : undefined
					}, null, 2), {
						status: 500,
						headers: { ...router.corsHeaders, "Content-Type": "application/json" }
					});
				}
			}
			, env.ADMIN_PERMISSION
		);

		/**
		 * Debug endpoint to execute migrations (available only for D1)
		 * return a json object containing the resulting version like
		 * {
		 *      "migrations": [
		 *      "Schema is up to date (version 1)"
		 *      ],
		 *   "timestamp": "2025-04-18T11:40:38.748Z"
		 * }
		 */
		/**
		 * @openapi
		 * /api/__d1/schema_migrations:
		 *   get:
		 *     summary: Execute database schema migrations (available only for D1)
		 *     description: Checks the current database schema version and runs any pending migrations. Returns migration status information. Requires admin permission.
		 *     tags:
		 *       - System
		 *       - Cloudflare D1
		 *     responses:
		 *       200:
		 *         description: Successfully executed migrations
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 migrations:
		 *                   type: array
		 *                   description: List of migration status messages
		 *                   items:
		 *                     type: string
		 *                     example: "Schema is up to date (version 1)"
		 *                 timestamp:
		 *                   type: string
		 *                   format: date-time
		 *                   description: Time when the migrations were executed
		 *                   example: "2025-04-18T11:40:38.748Z"
		 *       500:
		 *         description: Error executing migrations
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 error:
		 *                   type: string
		 *                 stack:
		 *                   type: string
		 *       403:
		 *         description: Unauthorized - Admin permission required
		 *         content:
		 *           application/json:
		 *             schema:
		 *               type: object
		 *               properties:
		 *                 success:
		 *                   type: boolean
		 *                   example: false
		 *                 error:
		 *                   type: string
		 *                   example: "Unauthorized"
		 */
		router.get(
			"/api/__d1/schema_migrations",
			async () => {
				try {
					const db = await getDatabase(env) as CloudflareD1DB;
					const migrations = await db.runMigrations();

					return new Response(JSON.stringify({
						migrations: migrations,
						timestamp: new Date().toISOString()
					}, null, 2), {
						status: 200,
						headers: { ...router.corsHeaders, "Content-Type": "application/json" }
					});
				} catch (error) {
					return new Response(JSON.stringify({
						error: String(error),
						stack: error instanceof Error ? error.stack : undefined
					}, null, 2), {
						status: 500,
						headers: { ...router.corsHeaders, "Content-Type": "application/json" }
					});
				}
			}
			, env.ADMIN_PERMISSION
		);
	}
};
