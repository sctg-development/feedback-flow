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

import { PublicLinkData } from "../../types/data";
import { getDatabase } from "../../db/db";
import { Router } from "../router";
import { validateShortCode } from "../../utilities/short-link-generator";

/**
 * Setup routes for short public dispute resolution links
 * These routes allow testers to generate secure short links to share dispute information publicly
 * and allow the public to view that information during the link's validity period
 */
export const setupLinksRoutes = (router: Router, env: Env) => {
    /**
     * @openapi
     * /api/link/public:
     *   post:
     *     summary: Generate a short public link for dispute resolution
     *     description: |
     *       Creates a short public link that allows sharing dispute information.
     *       The link is only valid if the purchase has:
     *       - A feedback entry (feedback created)
     *       - A publication entry (feedback published)
     *       
     *       The link will expire after the specified duration (in seconds).
     *       Requires write:api permission.
     *     tags:
     *       - Links
     *     parameters:
     *       - name: duration
     *         in: query
     *         required: true
     *         description: Duration in seconds for which the link should be valid
     *         schema:
     *           type: integer
     *           minimum: 60
     *           maximum: 31536000
     *           example: 3600
     *       - name: purchase
     *         in: query
     *         required: true
     *         description: The UUID of the purchase to create a link for
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Short link successfully generated
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 code:
     *                   type: string
     *                   description: 7-character unique code (0-9, a-z, A-Z)
     *                   example: "aBc1234"
     *                 url:
     *                   type: string
     *                   description: Full URL for accessing the dispute resolution page
     *                   example: "/link/aBc1234"
     *       400:
     *         description: Invalid request or purchase not eligible
     *       401:
     *         description: Unauthorized - authentication required
     *       404:
     *         description: Purchase not found or not owned by user
     */
    router.post(
        "/api/link/public",
        async (request) => {
            try {
                const db = getDatabase(env);
                const url = new URL(request.url);
                const durationSeconds = parseInt(url.searchParams.get("duration") || "0");
                const purchaseId = url.searchParams.get("purchase");

                // Validate parameters
                if (!purchaseId) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Purchase ID is required",
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

                if (isNaN(durationSeconds) || durationSeconds < 60 || durationSeconds > 31536000) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Duration must be between 60 and 31536000 seconds",
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

                // Get authenticated user
                const userId = router.jwtPayload.sub || "";
                if (!userId) {
                    return router.handleUnauthorizedRequest();
                }

                // Get the purchase and verify ownership
                const purchase = await db.purchases.find((p) => p.id === purchaseId);
                if (!purchase) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Purchase not found",
                        }),
                        {
                            status: 404,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Verify that the user owns this purchase
                const testerUuid = await db.idMappings.getTesterUuid(userId);
                if (!testerUuid || purchase.testerUuid !== testerUuid) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "You do not have permission to access this purchase",
                        }),
                        {
                            status: 403,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Verify that the purchase has both feedback and publication
                const feedback = await db.feedbacks.find(
                    (f) => f.purchase === purchaseId
                );
                const publication = await db.publications.find(
                    (p) => p.purchase === purchaseId
                );

                if (!feedback || !publication) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Purchase must have both feedback and publication before creating a link",
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

                // Generate the short link code
                const code = await db.links.generate(purchaseId, durationSeconds);

                return new Response(
                    JSON.stringify({
                        success: true,
                        code,
                        url: `link/${code}`,
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
                console.error("Error generating short link:", error);

                return new Response(
                    JSON.stringify({
                        success: false,
                        error: `Failed to generate link: ${(error as Error).message}`,
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
        env.WRITE_PERMISSION,
    );

    /**
     * @openapi
     * /api/link/{code}:
     *   get:
     *     summary: Access public dispute resolution information
     *     description: |
     *       Retrieves complete dispute resolution information for a valid short link.
     *       This endpoint requires no authentication and provides:
     *       - Purchase details (order number, date, amount, screenshot)
     *       - Feedback details (creation date, content)
     *       - Publication details (publication date, screenshot)
     *       - Refund details if the purchase was refunded (amount, transaction ID)
     *       
     *       The link must be valid (code format correct and not expired).
     *       
     *       No permission required - public endpoint accessible with valid link code.
     *     tags:
     *       - Links
     *     parameters:
     *       - name: code
     *         in: path
     *         required: true
     *         description: The 7-character unique link code
     *         schema:
     *           type: string
     *           pattern: "^[0-9a-zA-Z]{7}$"
     *           example: "aBc1234"
     *     responses:
     *       200:
     *         description: Dispute resolution information successfully retrieved
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   type: object
     *                   properties:
     *                     orderNumber:
     *                       type: string
     *                       description: The order number for the purchase
     *                       example: "102-1234567-1234567"
     *                     orderDate:
     *                       type: string
     *                       format: date
     *                       description: Date of the purchase
     *                       example: "2024-03-15"
     *                     purchaseAmount:
     *                       type: number
     *                       description: Amount paid for the purchase
     *                       example: 99.99
     *                     purchaseScreenshot:
     *                       type: string
     *                       description: Base64-encoded screenshot of the purchase
     *                     secondaryScreenshot:
     *                       type: string
     *                       description: Optional secondary screenshot (e.g., from publication)
     *                     feedbackDate:
     *                       type: string
     *                       format: date
     *                       description: Date when feedback was submitted
     *                       example: "2024-03-16"
     *                     feedbackText:
     *                       type: string
     *                       description: The feedback text provided by the tester
     *                     publicationDate:
     *                       type: string
     *                       format: date
     *                       description: Date when the feedback was published
     *                       example: "2024-03-17"
     *                     publicationScreenshot:
     *                       type: string
     *                       description: Base64-encoded screenshot of the publication
     *                     isRefunded:
     *                       type: boolean
     *                       description: Whether the purchase has been refunded
     *                       example: false
     *                     refundAmount:
     *                       type: number
     *                       description: Amount refunded (only if isRefunded is true)
     *                       example: 99.99
     *                     refundTransactionId:
     *                       type: string
     *                       description: Transaction ID of the refund (if available)
     *       400:
     *         description: Invalid link code format
     *       404:
     *         description: Link not found or expired
     */
    router.get(
        "/api/link/:code",
        async (request) => {
            try {
                const code = request.params.code;

                // Validate code format (must be 7 characters, alphanumeric)
                if (!validateShortCode(code)) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Invalid link code format",
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

                const db = getDatabase(env);

                // Get the purchase ID from the link (handles expiration check)
                const purchaseId = await db.links.getPurchaseByCode(code);
                if (!purchaseId) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Link not found or has expired",
                        }),
                        {
                            status: 404,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Fetch purchase information
                const purchase = await db.purchases.find((p) => p.id === purchaseId);
                if (!purchase) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Associated purchase not found",
                        }),
                        {
                            status: 404,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Fetch feedback information
                const feedback = await db.feedbacks.find(
                    (f) => f.purchase === purchaseId
                );
                if (!feedback) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Feedback information not found",
                        }),
                        {
                            status: 404,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Fetch publication information
                const publication = await db.publications.find(
                    (p) => p.purchase === purchaseId
                );
                if (!publication) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Publication information not found",
                        }),
                        {
                            status: 404,
                            headers: {
                                ...router.corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Fetch refund information if it exists
                const refund = await db.refunds.find(
                    (r) => r.purchase === purchaseId
                );

                // Compile the public response data
                const data: PublicLinkData = {
                    orderNumber: purchase.order,
                    orderDate: purchase.date,
                    purchaseAmount: purchase.amount,
                    purchaseScreenshot: purchase.screenshot,
                    secondaryScreenshot: purchase.screenshotSummary,
                    feedbackDate: feedback.date,
                    feedbackText: feedback.feedback,
                    publicationDate: publication.date,
                    publicationScreenshot: publication.screenshot,
                    isRefunded: purchase.refunded,
                };

                // Add refund information if refunded
                if (refund) {
                    data.refundAmount = refund.amount;
                    data.refundTransactionId = refund.transactionId;
                }

                return new Response(
                    JSON.stringify({
                        success: true,
                        data,
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
                console.error("Error retrieving link data:", error);

                return new Response(
                    JSON.stringify({
                        success: false,
                        error: `Failed to retrieve link data: ${(error as Error).message}`,
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
    );

    /**
     * @openapi
     * /api/links/expired:
     *   delete:
     *     summary: Delete all expired short links
     *     description: |
     *       Removes all expired short links from the database.
     *       This endpoint is typically called as a maintenance task to clean up
     *       links that have passed their expiration date.
     *       
     *       Requires admin:api permission.
     *     tags:
     *       - Links
     *     responses:
     *       200:
     *         description: Expired links successfully deleted
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 deletedCount:
     *                   type: integer
     *                   description: Number of expired links that were deleted
     *                   example: 5
     *       401:
     *         description: Unauthorized - authentication required
     *       403:
     *         description: Insufficient permissions - admin:api permission required
     */
    router.delete(
        "/api/links/expired",
        async (request) => {
            try {
                const db = getDatabase(env);

                // Delete all expired links and get the count
                const deletedCount = await db.links.cleanupExpired();

                return new Response(
                    JSON.stringify({
                        success: true,
                        deletedCount,
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
                console.error("Error deleting expired links:", error);

                return new Response(
                    JSON.stringify({
                        success: false,
                        error: `Failed to delete expired links: ${(error as Error).message}`,
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
        env.ADMIN_PERMISSION,
    );
};
