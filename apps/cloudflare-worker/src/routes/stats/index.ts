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

export const setupStatsRoutes = (router: Router, env: Env) => {
    /**
     * @openapi
     * /api/stats/refund-balance:
     *   get:
     *     summary: Get refund balance statistics
     *     description: Returns the difference between the total purchase amount of refunded purchases and the total refund amount. Requires read permission. Optional parameters (daysLimit or purchaseLimit) require search:api permission.
     *     tags:
     *       - Statistics
     *     security:
     *       - bearerAuth: ["read:api"]
     *       - oauth2: ["read:api"]
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
     *     security:
     *       - bearerAuth: ["read:api"]
     *       - oauth2: ["read:api"]
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
     *     security:
     *       - bearerAuth: ["read:api"]
     *       - oauth2: ["read:api"]
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
