/*
 * MIT License
 *
 * Copyright (c) 2025
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
 */
import { Router } from "../router";
import { CloudflareD1DB } from "../../db/d1-db";
import { InMemoryDB } from "../../db/in-memory-db";
import { getDatabase } from "../../db/db";

/**
 * Setup system and backup routes
 * 
 * 
 * @param router The router
 * @param env The environment variables
 */
export const setupSystemRoutes = async (router: Router, env: Env) => {
    const db = getDatabase(env);

    // Backup/Restore routes (available for InMemoryDB and CloudflareD1DB)
    if (db instanceof InMemoryDB || db instanceof CloudflareD1DB) {
        /**
         * @openapi
         * /api/backup/json:
         *   get:
         *     summary: Backup database to JSON
         *     description: Exports the entire database as JSON. Only available for in-memory and D1 databases. Requires backup permission.
         *     tags:
         *       - System
         *     responses:
         *       200:
         *         description: Successfully exported database
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *   post:
         *     summary: Restore database from JSON
         *     description: Imports database from JSON. Only available for in-memory and D1 databases. Requires backup permission.
         *     tags:
         *       - System
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *     responses:
         *       200:
         *         description: Successfully imported database
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *       500:
         *         description: Failed to restore database
         */
        router.get(
            "/api/backup/json",
            async () => {
                const json = await db.backupToJson();

                return new Response(json, {
                    status: 200,
                    headers: {
                        ...router.corsHeaders,
                        "Content-Type": "application/json",
                    },
                });
            },
            env.BACKUP_PERMISSION,
        );
        router.post(
            "/api/backup/json",
            async (request) => {
                const json = await request.json();

                // eslint-disable-next-line no-console
                console.log("Restoring from JSON");
                const result = await db.restoreFromJsonString(JSON.stringify(json));

                if (!result.success) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: result.message || "Failed to restore",
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

                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: {
                        ...router.corsHeaders,
                        "Content-Type": "application/json",
                    },
                });
            },
            env.BACKUP_PERMISSION,
        );
    }

    /**
     * POST /api/__auth0/token
     *
     * Request an Auth0 Management API token using the client credentials flow.
     * This endpoint requires the `env.ADMIN_AUTH0_PERMISSION` permission.
     * The following environment variables must be configured in the Cloudflare Worker:
     *  - AUTH0_CLIENT_ID
     *  - AUTH0_CLIENT_SECRET
     *  - AUTH0_DOMAIN
     *
     * Security note: This route should be limited to administrative users
     * and the AUTH0_CLIENT_SECRET should never be returned or logged.
     *
     * @openapi
     * /api/__auth0/token:
     *   post:
     *     summary: Get Auth0 Management API token
     *     description: |
     *       Request an Auth0 Management API JWT token using the Client Credentials grant.
     *       This endpoint requires `ADMIN_AUTH0_PERMISSION` and uses the following
     *       environment variables: `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, and `AUTH0_DOMAIN`.
     *       Returns a JSON response containing access_token, token_type, and expires_in when successful.
     *     tags:
     *       - System
     *       - Auth0
     *     responses:
     *       200:
     *         description: Successfully obtained Auth0 management API token
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 access_token:
     *                   type: string
     *                 token_type:
     *                   type: string
     *                 expires_in:
     *                   type: integer
     *       403:
     *         description: Unauthorized - `ADMIN_AUTH0_PERMISSION` required
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: false
     *                 error:
     *                   type: string
     *       500:
     *         description: Server error while requesting Auth0 token
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     */
    router.post(
        "/api/__auth0/token",
        async () => {
            try {
                // Validate required environment variables
                if (!env.AUTH0_MANAGEMENT_API_CLIENT_ID || !env.AUTH0_MANAGEMENT_API_CLIENT_SECRET || !env.AUTH0_DOMAIN) {
                    return new Response(JSON.stringify({ error: "Auth0 configuration is missing" }, null, 2), {
                        status: 500,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" },
                    });
                }

                // Build the token endpoint URL for Auth0
                const tokenUrl = `https://${env.AUTH0_DOMAIN}/oauth/token`;

                // Audience for the management API: default to api/v2
                const audience = `https://${env.AUTH0_DOMAIN}/api/v2/`;

                // Build the request body for client credentials grant
                const body = {
                    client_id: env.AUTH0_MANAGEMENT_API_CLIENT_ID,
                    client_secret: env.AUTH0_MANAGEMENT_API_CLIENT_SECRET,
                    audience,
                    grant_type: "client_credentials",
                };
                console.log("Requesting Auth0 token from:", tokenUrl, "for audience:", audience);

                // Request a token from Auth0
                const resp = await fetch(tokenUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });

                if (!resp.ok) {
                    const errorText = await resp.text();
                    return new Response(JSON.stringify({ error: `Failed to retrieve token: ${errorText}` }, null, 2), {
                        status: 500,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" },
                    });
                }

                // Parse Auth0 response and return to the client (safely)
                // We type cast the response to a known structure to satisfy TypeScript
                const data = (await resp.json()) as {
                    access_token?: string;
                    token_type?: string;
                    expires_in?: number;
                    [key: string]: any;
                };

                if (!data || !data.access_token) {
                    return new Response(JSON.stringify({ error: "Invalid response from Auth0: no access_token returned" }, null, 2), {
                        status: 500,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" },
                    });
                }

                // Only allow returning the access token and metadata, do not return secrets
                const result = {
                    access_token: data.access_token as string,
                    token_type: data.token_type as string | undefined,
                    expires_in: data.expires_in as number | undefined,
                };

                return new Response(JSON.stringify(result, null, 2), {
                    status: 200,
                    headers: { ...router.corsHeaders, "Content-Type": "application/json" },
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: String(error) }, null, 2), {
                    status: 500,
                    headers: { ...router.corsHeaders, "Content-Type": "application/json" },
                });
            }
        },
        env.ADMIN_AUTH0_PERMISSION,
    );

    // D1-specific debug endpoints
    if (db instanceof CloudflareD1DB) {
        /**
         * Debug endpoint to get the database table names
         * return a json object like
         * {
         *   "tables": [
         * 	"sqlite_sequence",
         * 	"testers",
         * 	"id_mappings",
         * 	"purchases",
         * 	"feedbacks",
         * 	"publications",
         * 	"refunds",
         * 	"schema_version"
         * 	],
         *   "timestamp": "2025-04-18T11:35:40.537Z"
         * }
         *
         * @openapi
         * /api/__d1/schema:
 *   get:
 *     summary: Get database table names (available only for D1)
 *     description: Returns a list of all tables in the database. Requires admin permission.
 *     tags:
 *       - System
 *       - Cloudflare D1
 *     responses:
 *       200:
 *         description: Successfully retrieved table names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tables:
 *                   type: array
 *                   description: List of table names in the database
 *                   items:
 *                     type: string
 *                   example:
 *                     - sqlite_sequence
 *                     - testers
 *                     - id_mappings
 *                     - purchases
 *                     - feedbacks
 *                     - publications
 *                     - refunds
 *                     - schema_version
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Time when the table names were retrieved
 *                   example: "2025-04-18T11:35:40.537Z"
 *       500:
 *         description: Error retrieving table names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 stack:
 *                   type: string
 *       403:
 *         description: Unauthorized - Admin permission required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"

        */
        router.get(
            "/api/__d1/schema",
            async () => {
                try {
                    const database = await getDatabase(env) as CloudflareD1DB;
                    const tableCheck = await database.getTableNames();

                    return new Response(JSON.stringify({
                        tables: tableCheck,
                        timestamp: new Date().toISOString()
                    }, null, 2), {
                        status: 200,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (error) {
                    return new Response(JSON.stringify({
                        error: String(error),
                        stack: error instanceof Error ? error.stack : undefined
                    }, null, 2), {
                        status: 500,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" }
                    });
                }
            },
            env.ADMIN_PERMISSION
        );

        /**
         * Debug endpoint to get the database schema version
         * return a json object like
         * {
         *  "version": {
         * 	"version": 1,
         * 	"description": "Added transaction_id to refunds"
         *  },
         *   "timestamp": "2025-04-18T11:36:40.414Z"
         * }
         */
        /**
        * @openapi
        * /api/__d1/schema_version:
        *   get:
        *     summary: Get database schema version (available only for D1)
        *     description: Returns the current database schema version information. Requires admin permission.
        *     tags:
        *       - System
        *       - Cloudflare D1
        *     responses:
        *       200:
        *         description: Successfully retrieved schema version
        *         content:
        *           application/json:
        *             schema:
        *               type: object
        *               properties:
        *                 version:
        *                   type: object
        *                   description: Schema version details
        *                   properties:
        *                     version:
        *                       type: integer
        *                       description: Current schema version number
        *                       example: 1
        *                     description:
        *                       type: string
        *                       description: Description of the current schema version
        *                       example: "Added transaction_id to refunds"
        *                 timestamp:
        *                   type: string
        *                   format: date-time
        *                   description: Time when the version was retrieved
        *                   example: "2025-04-18T11:36:40.414Z"
        *       500:
        *         description: Error retrieving schema version
        *         content:
        *           application/json:
        *             schema:
        *               type: object
        *               properties:
        *                 error:
        *                   type: string
        *                 stack:
        *                   type: string
        *       403:
        *         description: Unauthorized - Admin permission required
        *         content:
        *           application/json:
        *             schema:
        *               type: object
        *               properties:
        *                 success:
        *                   type: boolean
        *                   example: false
        *                 error:
        *                   type: string
        *                   example: "Unauthorized"
        */
        router.get(
            "/api/__d1/schema_version",
            async () => {
                try {
                    const database = await getDatabase(env) as CloudflareD1DB;
                    const version = await database.getSchemaVersion();

                    return new Response(JSON.stringify({
                        version: version,
                        timestamp: new Date().toISOString()
                    }, null, 2), {
                        status: 200,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (error) {
                    return new Response(JSON.stringify({
                        error: String(error),
                        stack: error instanceof Error ? error.stack : undefined
                    }, null, 2), {
                        status: 500,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" }
                    });
                }
            },
            env.ADMIN_PERMISSION
        );

        /**
         * Debug endpoint to execute migrations (available only for D1)
         * return a json object containing the resulting version like
         * {
         *      "migrations": [
         *      "Schema is up to date (version 1)"
         *      ],
         *   "timestamp": "2025-04-18T11:40:38.748Z"
         * }
         */
        /**
         * @openapi
         * /api/__d1/schema_migrations:
 *   get:
 *     summary: Execute database schema migrations (available only for D1)
 *     description: Checks the current database schema version and runs any pending migrations. Returns migration status information. Requires admin permission.
 *     tags:
 *       - System
 *       - Cloudflare D1
 *     responses:
 *       200:
 *         description: Successfully executed migrations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 migrations:
 *                   type: array
 *                   description: List of migration status messages
 *                   items:
 *                     type: string
 *                     example: "Schema is up to date (version 1)"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Time when the migrations were executed
 *                   example: "2025-04-18T11:40:38.748Z"
 *       500:
 *         description: Error executing migrations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 stack:
 *                   type: string
 *       403:
 *         description: Unauthorized - Admin permission required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *
        */
        router.get(
            "/api/__d1/schema_migrations",
            async () => {
                try {
                    const database = await getDatabase(env) as CloudflareD1DB;
                    const migrations = await database.runMigrations();

                    return new Response(JSON.stringify({
                        migrations: migrations,
                        timestamp: new Date().toISOString()
                    }, null, 2), {
                        status: 200,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (error) {
                    return new Response(JSON.stringify({
                        error: String(error),
                        stack: error instanceof Error ? error.stack : undefined
                    }, null, 2), {
                        status: 500,
                        headers: { ...router.corsHeaders, "Content-Type": "application/json" }
                    });
                }
            },
            env.ADMIN_PERMISSION
        );
    }
};
