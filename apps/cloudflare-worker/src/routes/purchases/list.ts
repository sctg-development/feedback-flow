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

import { ReadyForRefundPurchase } from "../../types/data";
import { getDatabase } from "../../db/db";
import { Router } from "../router";

/**
 * Setup listing routes for purchases (not-refunded, ready-to-refund, refunded)
 */
export const setupPurchaseListRoutes = (router: Router, env: Env) => {
    /**
     * @openapi
     * /api/purchases/not-refunded:
     *   get:
     *     summary: Get non-refunded purchases
     *     description: Returns a paginated list of non-refunded purchases for the authenticated user. Requires read permission.
     *     tags:
     *       - Purchases
     *     security:
     *       - bearerAuth: ["read:api"]
     *       - oauth2: ["read:api"]
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

            // Filter purchases by tester and non-refunded status
            const pagination = {
                page,
                limit,
                sort,
                order,
            };

            const { results: purchases, totalCount } = await db.purchases.notRefunded(testerUuid, pagination);

            // Format response without screenshots
            const formattedPurchases = purchases.map((p) => ({
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
                    total: totalCount,
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
     * /api/purchases/ready-to-refund:
     *   get:
     *     summary: Get purchases ready for refund
     *     description: Returns a paginated list of purchases that are not refunded but have feedback and are ready for refund. Includes feedback data with each purchase. Requires read permission.
     *     tags:
     *       - Purchases
     *     security:
     *       - bearerAuth: ["read:api"]
     *       - oauth2: ["read:api"]
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
     *         description: Successfully retrieved purchases ready for refund
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
     *                     type: object
     *                     properties:
     *                       id:
     *                         type: string
     *                       date:
     *                         type: string
     *                         format: date
     *                       order:
     *                         type: string
     *                       description:
     *                         type: string
     *                       refunded:
     *                         type: boolean
     *                       amount:
     *                         type: number
     *                       feedback:
     *                         type: string
     *                         description: Feedback content provided by the tester
     *                       feedbackDate:
     *                         type: string
     *                         format: date
     *                         description: Date when the feedback was submitted
     *                       publicationDate:
     *                         type: string
     *                         format: date
     *                         description: Date when the purchase was published
     *                       publicationScreenShot:
     *                         type: string
     *                         description: Screenshot of the publication
     *                 total:
     *                   type: integer
     *                 page:
     *                   type: integer
     *                 limit:
     *                   type: integer
     *       403:
     *         description: Unauthorized request
     *       500:
     *         description: Server error
     */
    router.get(
        "/api/purchases/ready-to-refund",
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

            const pagination = {
                page,
                limit,
                sort,
                order,
            };

            const { results: purchases, totalCount } = await db.purchases.readyForRefund(testerUuid, pagination);

            // Format response with enhanced data including feedback
            const formattedPurchases: ReadyForRefundPurchase[] = purchases.map((p) => ({
                id: p.id,
                date: p.date,
                order: p.order,
                description: p.description,
                refunded: p.refunded,
                amount: p.amount,
                screenshot: p.screenshot,
                // Include the feedback data that we now have available
                feedback: p.feedback,
                feedbackDate: p.feedbackDate,
                publicationDate: p.publicationDate,
                publicationScreenShot: p.publicationScreenshot,
            }));

            return new Response(
                JSON.stringify({
                    success: true,
                    data: formattedPurchases,
                    total: totalCount,
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
     *     security:
     *       - bearerAuth: ["read:api"]
     *       - oauth2: ["read:api"]
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

            const pagination = {
                page,
                limit,
                sort,
                order,
            };

            const { results: purchases, totalCount } = await db.purchases.refunded(testerUuid, pagination);

            // Format response without screenshots for better performance
            const formattedPurchases = purchases.map((p) => ({
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
