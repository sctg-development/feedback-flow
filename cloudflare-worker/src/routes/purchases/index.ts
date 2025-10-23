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
    PurchaseCreateRequest,
    PurchaseUpdateRequest,
    Purchase,
    ReadyForRefundPurchase,
} from "../../types/data";
import { getDatabase } from "../../db/db";
import { Router } from "../router";

export const setupPurchaseRoutes = (router: Router, env: Env) => {
    /**
     * @openapi
     * /api/purchase/{purchaseId}:
     *   delete:
     *     summary: Delete a purchase by ID
     *     description: Deletes a purchase record. Requires write permission.
     *     tags:
     *       - Purchases
     *     parameters:
     *       - name: purchaseId
     *         in: path
     *         required: true
     *         description: Purchase ID
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Purchase successfully deleted
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 message:
     *                   type: string
     *       404:
     *         description: Purchase not found or unauthorized request
     */
    router.delete(
        "/api/purchase/:purchaseId",
        async (request) => {
            const db = getDatabase(env);

            const purchaseId = request.params.purchaseId;
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

            await db.purchases.delete(purchaseId);

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Purchase deleted successfully",
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
        env.WRITE_PERMISSION,
    );

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
                const { date, order, description, amount, screenshot, screenshotSummary } = data;

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
                            screenshotSummary,
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
     *     description: Returns information about a specific purchase own by a tester. Requires read permission.
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
                        screenshotSummary: purchase.screenshotSummary,
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

    /**
     * @openapi
     * /api/purchases/refunded-amount:
     *   get:
     *     summary: Get total amount of refunded purchases
     *     description: Returns the total amount of refunded purchases for the authenticated user. Requires read permission.
     *     tags:
     *       - Purchases
     *     responses:
     *       200:
     *         description: Successfully retrieved total refunded amount
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 amount:
     *                   type: number
     *                   description: Total refunded amount
     *                   example: 123.45
     *       403:
     *         description: Unauthorized request
     */
    router.get(
        "/api/purchases/refunded-amount",
        async () => {
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
                // Use the optimized function for getting total refunded amount
                const amount = await db.purchases.refundedAmount(testerUuid);

                return new Response(
                    JSON.stringify({
                        success: true,
                        amount,
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
                        error: `Error fetching refunded amount: ${(error as Error).message}`,
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
     * /api/purchases/not-refunded-amount:
     *   get:
     *     summary: Get total amount of non-refunded purchases
     *     description: Returns the total amount of non-refunded purchases for the authenticated user. Requires read permission.
     *     tags:
     *       - Purchases
     *     responses:
     *       200:
     *         description: Successfully retrieved total non-refunded amount
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 amount:
     *                   type: number
     *                   description: Total non-refunded amount
     *                   example: 456.78
     *       403:
     *         description: Unauthorized request
     */
    router.get(
        "/api/purchases/not-refunded-amount",
        async () => {
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
                // Use the optimized function for getting total non-refunded amount
                const amount = await db.purchases.notRefundedAmount(testerUuid);

                return new Response(
                    JSON.stringify({
                        success: true,
                        amount,
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
                        error: `Error fetching non-refunded amount: ${(error as Error).message}`,
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

    /**
     * @openapi
     * /api/purchase/search:
     *   post:
     *     summary: Search purchases using fuzzy matching
     *     description: Searches for purchases matching the query using fuzzy matching. Supports case-insensitive search, accent-insensitive search, and partial matches. Searches in purchase ID, order number, description, and amount. Requires search permission.
     *     tags:
     *       - Purchases
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 description: Search query (minimum 4 characters)
     *                 example: "amazon"
     *               limit:
     *                 type: number
     *                 description: Maximum number of results (default 50, max 1000)
     *                 default: 50
     *             required:
     *               - query
     *     responses:
     *       200:
     *         description: Search results
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
     *                     type: string
     *                   description: Array of matching purchase IDs
     *                   example: ["uuid-1", "uuid-2"]
     *       400:
     *         description: Invalid request
     *       401:
     *         description: Unauthorized
     */
    router.post(
        "/api/purchase/search",
        async (req: Request, env: Env) => {
            try {
                // Get user ID from JWT
                const userId = router.jwtPayload.sub || "";

                if (!userId) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Unauthorized",
                        }),
                        {
                            status: 401,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Get user's tester UUID
                const db = getDatabase(env);
                const testerUuid = await db.idMappings.getTesterUuid(userId);

                if (!testerUuid) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Tester not found",
                        }),
                        {
                            status: 401,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Parse request body
                const body = await req.json() as Record<string, unknown>;
                const query = body.query as string;
                const limit = (body.limit as number) || 50;

                // Validate query
                if (!query || typeof query !== "string") {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Query is required and must be a string",
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

                if (query.length < 4) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Query must be at least 4 characters long",
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

                // Validate limit
                const normalizedLimit = Math.min(Math.max(1, limit), 1000);

                // Search purchases
                const results = await db.purchases.searchPurchases(testerUuid, query);

                // Apply limit
                const limitedResults = results.slice(0, normalizedLimit);

                return new Response(
                    JSON.stringify({
                        success: true,
                        data: limitedResults,
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
                console.error("Error searching purchases:", error);

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
        env.SEARCH_PERMISSION,
    );

    /**
     * @openapi
     * /api/purchase/{id}:
     *   post:
     *     summary: Update an existing purchase
     *     description: Updates an existing purchase record. Requires write permission.
     *     tags:
     *       - Purchases
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: Purchase ID
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               date:
     *                 type: string
     *                 format: date-time
     *                 description: Purchase date
     *               order:
     *                 type: string
     *                 description: Order number
     *               description:
     *                 type: string
     *                 description: Purchase description
     *               amount:
     *                 type: number
     *                 description: Purchase amount
     *               screenshot:
     *                 type: string
     *                 description: Screenshot data (base64 encoded)
     *               screenshotSummary:
     *                 type: string
     *                 description: Optional screenshot summary
     *     responses:
     *       200:
     *         description: Purchase successfully updated
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 message:
     *                   type: string
     *       400:
     *         description: Invalid request or missing required fields
     *       403:
     *         description: Unauthorized - purchase not found or access denied
     *       404:
     *         description: Purchase not found
     */
    router.post(
        "/api/purchase/:id",
        async (request) => {
            const db = getDatabase(env);

            const purchaseId = request.params.id;
            const userId = router.jwtPayload.sub || "";

            // Find the purchase first to verify ownership
            const existingPurchase = await db.purchases.find(p => p.id === purchaseId);

            if (!existingPurchase) {
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

            // Find tester by user ID and verify ownership
            const testerUuid = await db.idMappings.getTesterUuid(userId);
            if (!testerUuid || existingPurchase.testerUuid !== testerUuid) {
                return new Response(
                    JSON.stringify({ success: false, error: "Purchase not found or access denied" }),
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
                const body = (await request.json()) as PurchaseUpdateRequest;

                // Prepare the updates object with only provided fields
                const updates: Partial<Purchase> = {};

                // Only include fields that are provided in the request body
                if (body.date !== undefined) updates.date = body.date;
                if (body.order !== undefined) updates.order = body.order;
                if (body.description !== undefined) updates.description = body.description;
                if (body.amount !== undefined) updates.amount = body.amount;
                if (body.screenshot !== undefined) updates.screenshot = body.screenshot;
                if (body.screenshotSummary !== undefined) updates.screenshotSummary = body.screenshotSummary;

                // If no valid fields to update, return an error
                if (Object.keys(updates).length === 0) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "No valid fields provided for update"
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

                // Perform the update
                const updateResult = await db.purchases.update(purchaseId, updates);

                if (updateResult) {
                    return new Response(
                        JSON.stringify({
                            success: true,
                            message: "Purchase updated successfully",
                        }),
                        {
                            status: 200,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                } else {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Failed to update purchase"
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
            } catch (error) {
                console.error("Error updating purchase:", error);

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
};
