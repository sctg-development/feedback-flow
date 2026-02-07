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

import { getDatabase } from "../../db/db";
import { Router } from "../router";

/**
 * Setup status routes for purchases (purchase-status, purchase-status-batch)
 */
export const setupPurchaseStatusRoutes = (router: Router, env: Env) => {
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

    /**
     * @openapi
     * /api/purchase-status-batch:
     *   post:
     *     summary: Get purchase status for a list of purchase IDs
     *     description: Returns paginated purchase statuses for a provided list of purchase IDs. Requires read permission.
     *     tags:
     *       - Purchases
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - purchaseIds
     *             properties:
     *               purchaseIds:
     *                 type: array
     *                 items:
     *                   type: string
     *                 description: List of purchase IDs to retrieve status for
     *               page:
     *                 type: integer
     *                 default: 1
     *                 description: Page number for pagination
     *               limit:
     *                 type: integer
     *                 default: 10
     *                 description: Number of items per page
     *               sort:
     *                 type: string
     *                 default: date
     *                 enum: [date, order]
     *                 description: Sort field
     *               order:
     *                 type: string
     *                 default: desc
     *                 enum: [asc, desc]
     *                 description: Sort order
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
     *                 pageInfo:
     *                   type: object
     *                   properties:
     *                     totalCount:
     *                       type: integer
     *                     totalPages:
     *                       type: integer
     *                     currentPage:
     *                       type: integer
     *                     hasNextPage:
     *                       type: boolean
     *                     hasPreviousPage:
     *                       type: boolean
     *                     nextPage:
     *                       type: integer
     *                       nullable: true
     *                     previousPage:
     *                       type: integer
     *                       nullable: true
     *       400:
     *         description: Invalid request or missing required fields
     *       403:
     *         description: Unauthorized request
     */
    router.post(
        "/api/purchase-status-batch",
        async (request) => {
            const db = getDatabase(env);
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
                const body = await request.json() as {
                    purchaseIds?: string[];
                    page?: number;
                    limit?: number;
                    sort?: string;
                    order?: string;
                };

                const {
                    purchaseIds = [],
                    page = 1,
                    limit = 10,
                    sort = "date",
                    order = "desc",
                } = body;

                // Validate required fields
                if (!Array.isArray(purchaseIds) || purchaseIds.length === 0) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "purchaseIds must be a non-empty array",
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

                // Get all purchases for the tester
                const allPurchases = await db.purchases.getAll();

                // Filter purchases by ID and ensure they belong to the tester
                const filteredPurchases = allPurchases.filter(
                    (p) => purchaseIds.includes(p.id) && p.testerUuid === tester.uuid
                );

                if (filteredPurchases.length === 0) {
                    return new Response(
                        JSON.stringify({
                            success: true,
                            data: [],
                            pageInfo: {
                                totalCount: 0,
                                totalPages: 0,
                                currentPage: 1,
                                hasNextPage: false,
                                hasPreviousPage: false,
                                nextPage: null,
                                previousPage: null,
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

                // Get detailed status for each filtered purchase
                const purchaseStatuses = [];
                for (const purchase of filteredPurchases) {
                    const feedback = await db.feedbacks.find(
                        (f) => f.purchase === purchase.id
                    );
                    const publication = await db.publications.find(
                        (p) => p.purchase === purchase.id
                    );
                    const refund = await db.refunds.find(
                        (r) => r.purchase === purchase.id
                    );

                    purchaseStatuses.push({
                        purchase: purchase.id,
                        testerUuid: purchase.testerUuid,
                        date: purchase.date,
                        order: purchase.order,
                        description: purchase.description,
                        amount: purchase.amount,
                        refunded: purchase.refunded || false,
                        hasFeedback: feedback !== undefined,
                        hasPublication: publication !== undefined,
                        hasRefund: refund !== undefined,
                        publicationScreenshot: publication?.screenshot,
                        purchaseScreenshot: purchase.screenshot,
                        screenshotSummary: purchase.screenshotSummary,
                        transactionId: refund?.transactionId,
                    });
                }

                // Sort the results
                const sortedResults = purchaseStatuses.sort((a, b) => {
                    let compareValue = 0;
                    if (sort === "date") {
                        compareValue =
                            new Date(a.date).getTime() - new Date(b.date).getTime();
                    } else if (sort === "order") {
                        compareValue = a.order.localeCompare(b.order);
                    }
                    return order === "desc" ? -compareValue : compareValue;
                });

                // Apply pagination
                const totalCount = sortedResults.length;
                const totalPages = Math.ceil(totalCount / limit);
                const offset = (page - 1) * limit;
                const paginatedResults = sortedResults.slice(offset, offset + limit);

                return new Response(
                    JSON.stringify({
                        success: true,
                        data: paginatedResults,
                        pageInfo: {
                            totalCount,
                            totalPages,
                            currentPage: page,
                            hasNextPage: page < totalPages,
                            hasPreviousPage: page > 1,
                            nextPage: page < totalPages ? page + 1 : null,
                            previousPage: page > 1 ? page - 1 : null,
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
                console.error("Error fetching batch purchase status:", error);

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
