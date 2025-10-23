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
import { setupSystemRoutes } from "./system";

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
 * @param router The router
 * @param env The environment variables
 */
export const setupRoutes = async (router: Router, env: Env) => {
	testerRoutes(router, env);
	purchaseRoutes(router, env);
	feedbackRoutes(router, env);
	refundRoutes(router, env);
	statsRoutes(router, env);
	await setupSystemRoutes(router, env);
};
