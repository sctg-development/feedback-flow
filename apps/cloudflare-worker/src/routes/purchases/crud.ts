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
} from "../../types/data";
import { getDatabase } from "../../db/db";
import { Router } from "../router";

/**
 * Setup CRUD routes for purchases (Create, Read, Update, Delete)
 */
export const setupPurchaseCrudRoutes = (router: Router, env: Env) => {
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
