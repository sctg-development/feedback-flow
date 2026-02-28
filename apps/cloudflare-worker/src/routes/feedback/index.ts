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
import { FeedbackCreateRequest, PublishCreateRequest } from "../../types/data";
import { getDatabase } from "../../db/db";
import { Router } from "../router";

export const setupFeedbackRoutes = (router: Router, env: Env) => {
    /**
     * @openapi
     * /api/feedback:
     *   post:
     *     summary: Add feedback
     *     description: Creates a new feedback record. Requires write permission.
     *     tags:
     *       - Feedback
     *     security:
     *       - bearerAuth: ["write:api"]
     *       - oauth2: ["write:api"]
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
     *     security:
     *       - bearerAuth: ["write:api"]
     *       - oauth2: ["write:api"]
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
     *     security:
     *       - bearerAuth: ["read:api"]
     *       - oauth2: ["read:api"]
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
