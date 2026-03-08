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

// Short public link information
export interface Link {
  id?: number;
  code: string; // 7-character unique code (0-9, a-z, A-Z)
  purchase: string; // Foreign key to purchase.id
  expiresAt: string; // ISO timestamp for expiration
  createdAt?: string; // ISO timestamp for creation
}

// Complete mock database structure
export interface MockDatabase {
  testers: Tester[];
  purchases: Purchase[];
  feedbacks: Feedback[];
  publications: Publication[];
  refunds: Refund[];
  links: Link[];
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

export interface PurchaseUpdateRequest {
  date?: string;
  order?: string;
  description?: string;
  amount?: number;
  screenshot?: string;
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

// Public link data response (for dispute resolution)
export interface PublicLinkData {
  orderNumber: string;
  orderDate: string;
  purchaseAmount: number;
  purchaseScreenshot: string;
  secondaryScreenshot?: string;
  feedbackDate: string;
  feedbackText: string;
  publicationDate: string;
  publicationScreenshot: string;
  refundAmount?: number;
  refundTransactionId?: string;
  isRefunded: boolean;
}

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

export interface PurchaseSearchResponse {
  success: boolean;
  data: string[];
  error?: string;
}

/**
 * Response type returned by the system endpoint POST /api/__auth0/token
 *
 * This type describes the shape of the successful response that contains a
 * management API token for Auth0. The token can be returned either by making a
 * request to Auth0 or by reading a cached value from Cloudflare KV.
 *
 * Fields:
 * - access_token: The JWT used to access Auth0 Management API (do not expose secrets)
 * - token_type: Usually "Bearer" (optional)
 * - expires_in: Number of seconds the token is valid starting now (optional)
 * - from_cache: boolean that indicates whether the returned token was retrieved from KV cache
 *
 * Use this interface client-side to type-check API responses and handle cached tokens
 * in a predictable way.
 */
export interface Auth0ManagementTokenResponse {
  /** The management access token (JWT). */
  access_token: string;
  /** The token type. Usually "Bearer". */
  token_type?: string;
  /** Seconds until the token expires (relative TTL) */
  expires_in?: number;
  /** True when the token is served from KV cache, false when freshly obtained */
  from_cache: boolean;
}

/**
 * Union type for the API response: either the token or a standard error response
 */
export type Auth0ManagementTokenApiResponse =
  | Auth0ManagementTokenResponse
  | ErrorResponse;

/**
 * Identity object from Auth0 user object (one of multiple identities in a federated login)
 */
export interface Auth0UserIdentity {
  /** Provider specific user ID (e.g. google-oauth2|123456789) */
  user_id: string;
  /** Identity provider (e.g. "google-oauth2", "auth0") */
  provider: string;
  /** Connection (e.g. "Username-Password-Authentication") */
  connection?: string;
  /** True if this identity is a social provider */
  isSocial?: boolean;
}

/**
 * Lightweight representation of an Auth0 Management API user
 * Based on the official Auth0 Management API documentation (https://auth0.com/docs/api/management/v2/#!/Users/get_users)
 */
export interface Auth0User {
  user_id: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  logins_count?: number;
  blocked?: boolean;
  identities?: Auth0UserIdentity[];
  user_metadata?: Record<string, any> | null;
  app_metadata?: Record<string, any> | null;
}

/**
 * Representation of a single permission object returned by the Auth0 Management API
 */
export interface Auth0Permission {
  permission_name: string;
  resource_server_identifier: string;
}

/**
 * Simplified Auth0 role object shape
 */
export interface Auth0Role {
  id: string;
  name: string;
  description?: string;
}
