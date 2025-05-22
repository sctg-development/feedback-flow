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
 * Types for feedback flow application data
 */

// Tester information
export interface Tester {
  uuid: string;
  name: string;
  ids: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface for the OAuth ID to tester UUID mapping
 */
export interface IdMapping {
  id: string; // OAuth ID (primary key)
  testerUuid: string; // Reference to tester UUID
  created_at?: string;
}

// Purchase information
export interface Purchase {
  id: string;
  date: string;
  order: string;
  description: string;
  amount: number;
  screenshot: string;
  testerUuid: string;
  refunded: boolean;
  /**
   * Optional text summary of the screenshot contents
   */
  screenshotSummary?: string;
  created_at?: string;
  updated_at?: string;
}

// Feedback information
export interface Feedback {
  date: string;
  purchase: string; // Foreign key to purchase.id
  feedback: string;
  created_at?: string;
}

// Publication information
export interface Publication {
  date: string;
  purchase: string; // Foreign key to purchase.id
  screenshot: string;
  create_at?: string;
}

// Refund information
export interface Refund {
  date: string;
  purchase: string; // Foreign key to purchase.id
  refundDate: string;
  amount: number;
  created_at?: string;
  transactionId?: string; // Optional transaction ID for refund
}

// Complete mock database structure
export interface MockDatabase {
  testers: Tester[];
  purchases: Purchase[];
  feedbacks: Feedback[];
  publications: Publication[];
  refunds: Refund[];
}

// API request/response types
export interface TesterCreateRequest {
  /**
   * Tester name
   */
  name: string;
  /**
   * Tester ID (e.g., OAuth ID) as string or array of strings
   */
  ids: string | string[];
}

/**
 * Response type for the GET /api/testers endpoint
 */
export interface GetTestersResponse {
  /**
   * Indicates if the request was successful
   */
  success: boolean;

  /**
   * Array of testers with pagination applied
   */
  data: Array<Tester>;

  /**
   * Total number of testers (before pagination)
   */
  total: number;

  /**
   * Current page number
   */
  page: number;

  /**
   * Number of items per page
   */
  limit: number;
}

/**
 * Response type for the POST /api/tester endpoint
 */
export interface TesterCreateResponse {
  /**
   * Indicates if the request was successful
   */
  success: boolean;

  /**
   * The UUID assigned to the newly created tester
   * Only present when success is true
   */
  uuid?: string;

  /**
   * Error message
   * Only present when success is false
   */
  error?: string;
}
export interface TesterIdAddRequest {
  name: string;
  id: string;
}

export interface PurchaseCreateRequest {
  date: string;
  order: string;
  description: string;
  amount: number;
  screenshot: string;
  /**
   * Optional text summary of the screenshot contents
   */
  screenshotSummary?: string;
}

export interface FeedbackCreateRequest {
  date: string;
  purchase: string;
  feedback?: string;
}

export interface PublishCreateRequest {
  date: string;
  purchase: string;
  screenshot: string;
}

export interface RefundCreateRequest {
  date: string;
  purchase: string;
  refundDate: string;
  amount: number;
  transactionId?: string; // Ajout du nouveau champ optionnel
}

// Success response pattern
export interface SuccessResponse {
  success: boolean;
  id?: string;
  uuid?: string;
  ids?: string[];
  data?: any;
  total?: number;
  page?: number;
  limit?: number;
}

// Error response pattern
export interface ErrorResponse {
  success: boolean;
  error: string;
}

export type OrderCriteria = "asc" | "desc";

// Define valid sort keys for purchases
export const purchaseAllowedSortKeys = [
  "id",
  "date",
  "order",
  "description",
  "amount",
] as const;
export type PurchaseSortCriteria = (typeof purchaseAllowedSortKeys)[number];

// Define valid sort keys for testers
export const testerAllowedSortKeys = ["uuid", "name"] as const;
export type TesterSortCriteria = (typeof testerAllowedSortKeys)[number];

/**
 * Represents a purchase that is ready for refund with complete feedback and publication data
 * A purchase is considered "ready for refund" when it:
 * 1. Has not been refunded yet (refunded === false)
 * 2. Has an associated feedback (feedback is present)
 * 3. Has been published (publicationScreenShot is present)
 */
export interface ReadyForRefundPurchase {
  /**
   * Unique identifier of the purchase
   */
  id: string;

  /**
   * ISO date string when the purchase was made
   */
  date: string;

  /**
   * Order number or identifier for the purchase
   */
  order: string;

  /**
   * Description of the purchased item or service
   */
  description: string;

  /**
   * Whether the purchase has been refunded
   * Should be false for purchases in the "ready for refund" list
   */
  refunded: boolean;

  /**
   * Amount of the purchase in the default currency
   */
  amount: number;

  /**
   * Screenshot of the purchase receipt, stored as a base64 data URL
   */
  screenshot: string;

  /**
   * Feedback content provided by the tester for this purchase
   */
  feedback: string;

  /**
   * ISO date string when the feedback was submitted
   */
  feedbackDate: string;

  /**
   * ISO date string when the feedback was published
   */
  publicationDate?: string;

  /**
   * Screenshot of the published feedback, stored as a base64 data URL
   */
  publicationScreenShot?: string;
}

export interface RefundDelayResponse {
  success: boolean;
  data: RefundDelayData[];
  averageDelayInDays: number;
}

export interface RefundDelayData {
  purchaseId: string;
  purchaseAmount: number;
  refundAmount: number;
  delayInDays: number;
  purchaseDate: Date;
  refundDate: Date;
  order: string;
}

export interface RefundBalanceResponse {
  success: boolean;
  purchasedAmount: number;
  refundedAmount: number;
  balance: number;
}

export interface PurchasesStatisticsData {
  nbRefunded: number;
  nbNotRefunded: number;
  nbReadyForRefund: number;
  nbTotal: number;
  totalRefundedAmount: number;
  totalNotRefundedAmount: number;
  totalPurchaseAmount: number;
}

export interface PurchaseStatisticsResponse {
  success: boolean;
  data: PurchasesStatisticsData;
  error?: string;
}
