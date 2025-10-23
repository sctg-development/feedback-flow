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
	FeedbackCreateRequest,
	PublishCreateRequest,
	Purchase,
	PurchaseCreateRequest,
	PurchaseUpdateRequest,
	RefundCreateRequest,
	TesterCreateRequest,
	TesterIdAddRequest,
	purchaseAllowedSortKeys,
	testerAllowedSortKeys,
	TesterSortCriteria,
	PurchaseSortCriteria,
	ReadyForRefundPurchase,
} from "../types/data";
import { InMemoryDB } from "../db/in-memory-db";
import { getDatabase } from "../db/db";
import { CloudflareD1DB } from "../db/d1-db";

import { Router } from "./router";
import { setupTesterRoutes } from "./testers";
import { setupPurchaseRoutes } from "./purchases";
import { setupFeedbackRoutes } from "./feedback";
import { setupRefundRoutes } from "./refunds";
import { setupStatsRoutes } from "./stats";

// Tester Management
const testerRoutes = (router: Router, env: Env) => {
	setupTesterRoutes(router, env);
};

// Purchase Management
const purchaseRoutes = (router: Router, env: Env) => {
	setupPurchaseRoutes(router, env);
};

// Feedback Management
// Feedback Management
const feedbackRoutes = (router: Router, env: Env) => {
	setupFeedbackRoutes(router, env);
};

// Refund Management
// Refund Management
const refundRoutes = (router: Router, env: Env) => {
	setupRefundRoutes(router, env);
};

// Statistics API Routes
// Statistics API Routes
const statsRoutes = (router: Router, env: Env) => {
	setupStatsRoutes(router, env);
};

/**
 * @openapi
 * components:
 *   schemas:
 *     Tester:
 *       type: object
 *       properties:
 *         uuid:
 *           type: string
 *         name:
 *           type: string
 *         ids:
 *           type: array
 *           items:
 *             type: string
 *     TesterCreateRequest:
 *       type: object
 *       required:
 *         - name
 *         - ids
 *       properties:
 *         name:
 *           type: string
 *         ids:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *     TesterIdAddRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         id:
 *           type: string
 *     Purchase:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         order:
 *           type: string
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *         screenshot:
 *           type: string
 *     PurchaseSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         order:
 *           type: string
 *         description:
 *           type: string
 *         refunded:
 *           type: boolean
 *         amount:
 *           type: number
 *     PurchaseStatus:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         order:
 *           type: string
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *         refunded:
 *           type: boolean
 *     PurchaseCreateRequest:
 *       type: object
 *       required:
 *         - date
 *         - order
 *         - description
 *         - amount
 *         - screenshot
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         order:
 *           type: string
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *         screenshot:
 *           type: string
 *     FeedbackCreateRequest:
 *       type: object
 *       required:
 *         - date
 *         - purchase
 *         - feedback
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         purchase:
 *           type: string
 *         feedback:
 *           type: string
 *     PublishCreateRequest:
 *       type: object
 *       required:
 *         - date
 *         - purchase
 *         - screenshot
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         purchase:
 *           type: string
 *         screenshot:
 *           type: string
 *     Publication:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         purchase:
 *           type: string
 *         screenshot:
 *           type: string
 *     RefundCreateRequest:
 *       type: object
 *       required:
 *         - date
 *         - purchase
 *         - refundDate
 *         - amount
 *         - transactionId
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         purchase:
 *           type: string
 *         refundDate:
 *           type: string
 *           format: date-time
 *         amount:
 *           type: number
 *     Refund:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         purchase:
 *           type: string
 *         refundDate:
 *           type: string
 *           format: date-time
 *         amount:
 *           type: number
 *         transactionId:
 *           type: string
 */

/**
 * Setup routes
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
 * 
 * @param router The router
 * @param env The environment variables
 */
export const setupRoutes = async (router: Router, env: Env) => {
	const db = getDatabase(env);

	testerRoutes(router, env);
	purchaseRoutes(router, env);
	feedbackRoutes(router, env);
	refundRoutes(router, env);
	statsRoutes(router, env);

	if (db instanceof InMemoryDB || db instanceof CloudflareD1DB) {
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
			 *  ],
		 *   "timestamp": "2025-04-18T11:35:40.537Z"
		 * }
		 */
		/**
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
					const db = await getDatabase(env) as CloudflareD1DB;
					const tableCheck = await db.getTableNames();

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
			}
			, env.ADMIN_PERMISSION
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
					const db = await getDatabase(env) as CloudflareD1DB;
					const version = await db.getSchemaVersion();

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
			}
			, env.ADMIN_PERMISSION
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
		 */
		router.get(
			"/api/__d1/schema_migrations",
			async () => {
				try {
					const db = await getDatabase(env) as CloudflareD1DB;
					const migrations = await db.runMigrations();

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
			}
			, env.ADMIN_PERMISSION
		);
	}
};
