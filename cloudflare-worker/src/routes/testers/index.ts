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
                const body = (await request.json()) as unknown as {
                    name?: string;
                    uuid?: string;
                    id?: string;
                    ids?: string[] | string;
                };

                let { name, uuid, id, ids } = body;

                // Accept either id or ids or default to token subject if id is missing
                let idArray: string[] = [];
                if (ids) {
                    idArray = Array.isArray(ids) ? ids : [ids];
                }
                if (id) idArray.push(id);
                if (idArray.length === 0) idArray.push(testerId);

                // Resolve tester by uuid or name
                let tester: any | undefined = undefined;
                if (uuid) {
                    tester = await db.testers.getTesterWithUuid(uuid);
                } else if (name) {
                    tester = await db.testers.find((t) => t.name === name);
                }

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

                // Check for collisions in the DB
                const existing = await db.idMappings.existsMultiple(idArray);
                if (existing.length > 0) {
                    return new Response(
                        JSON.stringify({ success: false, error: "Some IDs already exist in the database", existing }),
                        {
                            status: 409,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Filter only those not already present on the tester
                const toAdd = idArray.filter((i) => !tester.ids.includes(i));
                if (toAdd.length === 0) {
                    return new Response(
                        JSON.stringify({ success: false, name: tester.name, ids: tester.ids, message: "IDs already exist for this tester" }),
                        {
                            status: 209,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Add ids using repository helper
                const updatedIds = await db.testers.addIds(tester.uuid, toAdd);

                return new Response(
                    JSON.stringify({ success: true, name: tester.name, ids: updatedIds || tester.ids }),
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
     * /api/tester/ids:
     *   delete:
     *     summary: Remove ID from existing tester
     *     description: Removes an ID from a tester. Requires admin permission.
     *     tags:
     *       - Testers
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               uuid:
     *                 type: string
     *               name:
     *                 type: string
     *               id:
     *                 type: string
     *             required: [id]
     *     responses:
     *       200:
     *         description: ID successfully removed from tester
     *       400:
     *         description: Invalid request or missing required fields
     *       403:
     *         description: Unauthorized request
     */
    router.delete(
        "/api/tester/ids",
        async (request) => {
            const db = getDatabase(env);

            try {
                const body = (await request.json()) as { uuid?: string; name?: string; id?: string };
                const { uuid, name, id } = body;

                if (!id) {
                    return new Response(JSON.stringify({ success: false, error: 'id is required' }), { status: 400, headers: { ...router.corsHeaders, 'Content-Type': 'application/json' } });
                }

                // Resolve tester by uuid or name
                let tester: any | undefined = undefined;
                if (uuid) {
                    tester = await db.testers.getTesterWithUuid(uuid);
                } else if (name) {
                    tester = await db.testers.find((t) => t.name === name);
                } else {
                    return new Response(JSON.stringify({ success: false, error: 'uuid or name is required' }), { status: 400, headers: { ...router.corsHeaders, 'Content-Type': 'application/json' } });
                }

                if (!tester) {
                    return new Response(JSON.stringify({ success: false, error: 'Tester not found' }), { status: 404, headers: { ...router.corsHeaders, 'Content-Type': 'application/json' } });
                }

                if (!tester.ids.includes(id)) {
                    return new Response(JSON.stringify({ success: false, error: 'ID not assigned to this tester' }), { status: 404, headers: { ...router.corsHeaders, 'Content-Type': 'application/json' } });
                }

                // Remove the id from tester and idMappings
                const newIds = tester.ids.filter((i: string) => i !== id);
                await db.idMappings.delete(id);
                const updated = await db.testers.put({ ...tester, ids: newIds });

                return new Response(JSON.stringify({ success: true, name: tester.name, ids: updated }), { status: 200, headers: { ...router.corsHeaders, 'Content-Type': 'application/json' } });
            } catch (error) {
                return new Response(JSON.stringify({ success: false, error: `Invalid request: ${(error as Error).message}` }), { status: 400, headers: { ...router.corsHeaders, 'Content-Type': 'application/json' } });
            }
        },
        env.ADMIN_PERMISSION,
    );

    /**
     * @openapi
     * /api/testers:
     *   post:
     *     summary: Get testers filtered by OAuth IDs (supports pagination)
     *     description: Returns a list of testers filtered by OAuth IDs provided in the request body. Requires admin permission. If limit is not provided, all matching testers are returned.
     *     tags:
     *       - Testers
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               page:
     *                 type: integer
     *               limit:
     *                 type: integer
     *               ids:
     *                 oneOf:
     *                   - type: string
     *                   - type: array
     *                     items:
     *                       type: string
     *             required: [ids]
     *     responses:
     *       200:
     *         description: Successfully retrieved filtered testers
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
     *       400:
     *         description: Invalid request or missing required fields
     *       403:
     *         description: Unauthorized request
     */
    router.post(
        "/api/testers",
        async (request) => {
            const db = getDatabase(env);
            try {
                const body = (await request.json()) as { page?: number; limit?: number; ids: string | string[] };
                if (!body || !body.ids) {
                    return new Response(JSON.stringify({ success: false, error: 'ids is required' }), { status: 400, headers: { ...router.corsHeaders, 'Content-Type': 'application/json' } });
                }

                const idArray: string[] = typeof body.ids === 'string' ? [body.ids] : body.ids;

                // Find all testers which own at least one of the provided ids
                const testers = await db.testers.filter((t) => t.ids.some((id) => idArray.includes(id)));

                // Default sort by name asc
                const sortedTesters = [...testers].sort((a, b) => (a.name > b.name ? 1 : -1));

                const total = sortedTesters.length;
                let page = body.page || 1;
                let limit = body.limit || total; // if limit not provided, return all

                // When limit is provided, apply pagination
                let paginatedTesters: typeof sortedTesters = sortedTesters;
                if (body.limit) {
                    const start = (page - 1) * limit;
                    const end = start + limit;
                    paginatedTesters = sortedTesters.slice(start, end);
                } else {
                    page = 1;
                    limit = total;
                }

                return new Response(
                    JSON.stringify({ success: true, data: paginatedTesters, total, page, limit }),
                    { status: 200, headers: { ...router.corsHeaders, 'Content-Type': 'application/json' } },
                );
            } catch (error) {
                return new Response(JSON.stringify({ success: false, error: `Invalid request: ${(error as Error).message}` }), { status: 400, headers: { ...router.corsHeaders, 'Content-Type': 'application/json' } });
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
