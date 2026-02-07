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
import { RefundCreateRequest } from "../../types/data";
import { getDatabase } from "../../db/db";
import { Router } from "../router";

export const setupRefundRoutes = (router: Router, env: Env) => {
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
