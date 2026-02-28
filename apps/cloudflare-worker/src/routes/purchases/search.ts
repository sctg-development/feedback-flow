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
 * Setup search routes for purchases (fuzzy search)
 */
export const setupPurchaseSearchRoutes = (router: Router, env: Env) => {
    /**
     * @openapi
     * /api/purchase/search:
     *   post:
     *     summary: Search purchases using fuzzy matching
     *     description: Searches for purchases matching the query using fuzzy matching. Supports case-insensitive search, accent-insensitive search, and partial matches. Searches in purchase ID, order number, description, and amount. Requires search permission.
     *     tags:
     *       - Purchases
     *     security:
     *       - bearerAuth: ["search:api"]
     *       - oauth2: ["search:api"]
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
        async (request) => {
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
                const body = await request.json() as Record<string, unknown>;
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
};
