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
 * Setup amount/total routes for purchases (refunded-amount, not-refunded-amount)
 */
export const setupPurchaseAmountRoutes = (router: Router, env: Env) => {
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
};
