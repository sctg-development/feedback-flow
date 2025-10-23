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
/**
 * Tester Management Routes
 */
import { v4 as uuidv4 } from "uuid";
import {
    TesterCreateRequest,
    TesterIdAddRequest,
    testerAllowedSortKeys,
    TesterSortCriteria,
} from "../../types/data";
import { getDatabase } from "../../db/db";
import { Router } from "../router";

export const setupTesterRoutes = (router: Router, env: Env) => {
    /**
     * @openapi
     * /api/testers:
     *   get:
     *     summary: Get all testers with pagination and sorting
     *     description: Returns a paginated list of testers. Requires admin permission.
     *     tags:
     *       - Testers
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
     *           default: name
     *       - name: order
     *         in: query
     *         description: Sort order
     *         schema:
     *           type: string
     *           enum: [asc, desc]
     *           default: asc
     *     responses:
     *       200:
     *         description: Successfully retrieved testers
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
     *                     $ref: '#/components/schemas/Tester'
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
        "/api/testers",
        async (request) => {
            const db = getDatabase(env);
            const url = new URL(request.url);
            const page = parseInt(url.searchParams.get("page") || "1");
            const limit = parseInt(url.searchParams.get("limit") || "10");
            const sort = url.searchParams.get("sort") || "name";
            const order = url.searchParams.get("order") || "asc";

            // Get all testers
            const testers = await db.testers.getAll();

            // Ensure sort is a valid key
            const sortKey = testerAllowedSortKeys.includes(sort as TesterSortCriteria)
                ? (sort as TesterSortCriteria)
                : "name";

            // Apply sorting
            const sortedTesters = [...testers].sort((a, b) => {
                if (order === "asc") {
                    return a[sortKey] > b[sortKey] ? 1 : -1;
                } else {
                    return a[sortKey] < b[sortKey] ? 1 : -1;
                }
            });

            // Apply pagination
            const start = (page - 1) * limit;
            const end = start + limit;
            const paginatedTesters = sortedTesters.slice(start, end);

            return new Response(
                JSON.stringify({
                    success: true,
                    data: paginatedTesters,
                    total: testers.length,
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
        env.ADMIN_PERMISSION,
    );

    /**
     * @openapi
     * /api/tester:
     *   post:
     *     summary: Add a new tester
     *     description: Creates a new tester with the provided details. Requires admin permission.
     *     tags:
     *       - Testers
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/TesterCreateRequest'
     *     responses:
     *       201:
     *         description: Tester successfully created
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 uuid:
     *                   type: string
     *       400:
     *         description: Invalid request or missing required fields
     *       409:
     *         description: ID already exists in the database
     *       500:
     *         description: Failed to create tester
     */
    router.post(
        "/api/tester",
        async (request) => {
            const db = getDatabase(env);

            try {
                const { name, ids: _ids } =
                    (await request.json()) as TesterCreateRequest;

                if (!name || !_ids) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Name and at least one is are required",
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

                // Check ID must be unique for the whole database
                // TODO: might be very resource intensive with a large database
                for (const _id of _ids) {
                    if (await db.idMappings.exists(_id)) {
                        return new Response(
                            JSON.stringify({
                                success: false,
                                error: "ID already exists in the database",
                            }),
                            {
                                status: 409,
                                headers: {
                                    ...router.corsHeaders,
                                    "Content-Type": "application/json",
                                },
                            },
                        );
                    }
                }

                const uuid = uuidv4();
                let ids: string[] = [];

                if (typeof _ids === "string") {
                    ids = [_ids];
                } else {
                    ids = _ids;
                }
                // Add to the database
                const dbInsert = await db.testers.put({ uuid, name, ids });

                if (!dbInsert) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Failed to create tester",
                        }),
                        {
                            status: 500,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                } else {
                    return new Response(JSON.stringify({ success: true, uuid }), {
                        status: 201,
                        headers: {
                            ...router.corsHeaders,
                            "Content-Type": "application/json",
                        },
                    });
                }
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
        env.ADMIN_PERMISSION,
    );

    /**
     * @openapi
     * /api/tester/ids:
     *   post:
     *     summary: Add ID to existing tester
     *     description: Adds a new ID to an existing tester. Requires admin permission.
     *     tags:
     *       - Testers
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/TesterIdAddRequest'
     *     responses:
     *       200:
     *         description: ID successfully added to tester
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 name:
     *                   type: string
     *                 ids:
     *                   type: array
     *                   items:
     *                     type: string
     *       209:
     *         description: ID already exists for this tester
     *       400:
     *         description: Invalid request or missing required fields
     *       404:
     *         description: Tester not found
     *       409:
     *         description: ID already exists in the database
     */
    router.post(
        "/api/tester/ids",
        async (request) => {
            const db = getDatabase(env);

            try {
                const testerId = router.jwtPayload.sub;

                if (!testerId) {
                    return router.handleUnauthorizedRequest();
                }

                let { name, id } = (await request.json()) as TesterIdAddRequest;

                if (!name) {
                    return new Response(
                        JSON.stringify({ success: false, error: "name is required" }),
                        {
                            status: 400,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }
                if (!id) {
                    id = testerId;
                }

                // Check ID must be unique for the whole database
                if (await db.idMappings.exists(id)) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "ID already exists in the database",
                        }),
                        {
                            status: 409,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Find tester in the database
                const tester = await db.testers.find((t) => t.name === name);

                if (!tester) {
                    return new Response(
                        JSON.stringify({ success: false, error: "Tester not found" }),
                        {
                            status: 404,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Check if ID already exists to avoid duplicates
                if (tester.ids.includes(id)) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            name: tester.name,
                            ids: tester.ids,
                            message: "ID already exists for this tester",
                        }),
                        {
                            status: 209,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Update the database
                const ids = await db.testers.put({
                    ...tester,
                    ids: [...tester.ids, id],
                });

                return new Response(
                    JSON.stringify({ success: true, name: tester.name, ids }),
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

    /**
     * @openapi
     * /api/tester:
     *   get:
     *     summary: Get tester info by ID
     *     description: Returns information about the authenticated tester. Requires admin permission.
     *     tags:
     *       - Testers
     *     responses:
     *       200:
     *         description: Successfully retrieved tester info
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: object
     *                   properties:
     *                     uuid:
     *                       type: string
     *                     nom:
     *                       type: string
     *                     ids:
     *                       type: array
     *                       items:
     *                         type: string
     *       403:
     *         description: Unauthorized request
     *       404:
     *         description: Tester not found
     */
    router.get(
        "/api/tester",
        async () => {
            const db = getDatabase(env);

            // Get user ID from authenticated user
            const userId = router.jwtPayload.sub;

            if (!userId) {
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
            // Find tester in the database
            const tester = await db.testers.find((t) => t.ids.includes(userId));

            if (!tester) {
                return new Response(
                    JSON.stringify({ success: false, error: "Tester not found" }),
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
                        uuid: tester.uuid,
                        nom: tester.name,
                        ids: tester.ids,
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
        env.ADMIN_PERMISSION,
    );
};
