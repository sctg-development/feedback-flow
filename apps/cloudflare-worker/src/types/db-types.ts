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

import type {
    Feedback,
    IdMapping,
    Link,
    Publication,
    Purchase,
    PurchasesStatisticsData,
    Refund,
    Tester,
} from "./data";

export const DEFAULT_PAGINATION = {
    page: 1,
    limit: 10,
    sort: "date",
    order: "desc",
};

/**
 * Interface for database structure
 */
export interface DATABASESCHEMA {
    ids: IdMapping[];
    testers: Tester[];
    purchases: Purchase[];
    feedbacks: Feedback[];
    publications: Publication[];
    refunds: Refund[];
    links: Link[];
}

export interface PurchaseStatusResponse {
    results: PurchaseStatus[];
    pageInfo: {
        totalCount: number;
        totalPages: number;
        currentPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        nextPage: number | null;
        previousPage: number | null;
    };
}

export interface PurchaseStatus {
    purchase: string;
    testerUuid: string;
    date: string;
    order: string;
    description: string;
    amount: number;
    refunded: boolean;
    hasFeedback: boolean;
    hasPublication: boolean;
    hasRefund: boolean;
    purchaseScreenshot?: string;
    publicationScreenshot?: string;
    screenshotSummary?: string;
    transactionId?: string;
}

/**
 * IdMappings repository interface (async version)
 */
export interface IdMappingsRepository {
    /**
     * Check if an ID exists in the database
     * @param id The OAuth ID to check
     */
    exists(id: string): Promise<boolean>;

    /**
     * Check if multiple IDs exist in the database
     * @param ids Array of OAuth IDs to check
     */
    existsMultiple(ids: string[]): Promise<string[]>;

    /**
     * Get the tester UUID associated with an ID
     * @param id The OAuth ID to look up
     */
    getTesterUuid(id: string): Promise<string | undefined>;

    /**
     * Add a new ID to tester mapping
     * @param id The OAuth ID
     * @param testerUuid The associated tester UUID
     */
    put(id: string, testerUuid: string): Promise<boolean>;

    /**
     * Add multiple ID to tester mappings
     * @param ids Array of OAuth IDs
     * @param testerUuid The associated tester UUID
     */
    putMultiple(ids: string[], testerUuid: string): Promise<string[]>;

    /**
     * Delete an ID mapping
     * @param id The OAuth ID to delete
     */
    delete(id: string): Promise<boolean>;

    /**
     * Get all ID mappings
     */
    getAll(): Promise<IdMapping[]>;
}

/**
 * Testers repository interface (async version)
 */
export interface TestersRepository {
    /**
     * Find a tester that matches the provided condition
     * @param fn Predicate function to filter testers
     */
    find(fn: (tester: Tester) => boolean): Promise<Tester | undefined>;

    /**
     * Filter testers based on the provided condition
     * @param fn Predicate function to filter testers
     */
    filter(fn: (tester: Tester) => boolean): Promise<Tester[]>;

    /**
     * Add or update a tester in the database
     * @param newTester The tester object to add or update
     */
    put(newTester: Tester): Promise<string[]>;

    /**
     * Get all testers from the database
     */
    getAll(): Promise<Tester[]>;

    /**
     * Find a tester by their authentication ID
     * @param id Authentication ID to search for
     */
    getTesterWithId(id: string): Promise<Tester | undefined>;

    /**
     * Find a tester by their UUID
     * @param uuid UUID to search for
     */
    getTesterWithUuid(uuid: string): Promise<Tester | undefined>;

    /**
     * Add IDs to an existing tester
     * @param uuid UUID of the tester to update
     * @param ids IDs to add to the tester
     */
    addIds(uuid: string, ids: string[]): Promise<string[] | undefined>;
}

export interface PaginatedResult<T> {
    results: T[];
    totalCount: number;
}

// Define PurchaseWithFeedback type that extends Purchase with feedback and publication data
export interface PurchaseWithFeedback extends Purchase {
    /**
     * The feedback content associated with this purchase
     */
    feedback: string;

    /**
     * The date when the feedback was submitted
     */
    feedbackDate: string;

    /**
     * The publication screenshot, if available
     */
    publicationScreenshot?: string;

    /**
     * The date when the feedback was published, if available
     */
    publicationDate?: string;
}

export interface PurchasesRepository {
    /**
     * Find a purchase that matches the provided condition
     * @param fn Predicate function to filter purchases
     */
    find(fn: (purchase: Purchase) => boolean): Promise<Purchase | undefined>;
    /**
     * Filter purchases based on the provided condition
     * @param fn Predicate function to filter purchases
     */
    filter(fn: (purchase: Purchase) => boolean): Promise<Purchase[]>;
    /**
     * Add or update a purchase in the database
     * @param newPurchase The purchase object to add or update
     */
    refunded(
        testerUuid: string,
        pagination?: typeof DEFAULT_PAGINATION,
    ): Promise<PaginatedResult<Purchase>>;
    /**
     * Get the total number of refunded purchases for a tester
     * @param testerUuid UUID of the tester
     */
    refundedAmount(testerUuid: string): Promise<number>;
    /**
     * Get all purchases for a tester that are not refunded
     * @param testerUuid UUID of the tester
     * @param pagination Optional pagination parameters
     */
    notRefunded(
        testerUuid: string,
        pagination?: typeof DEFAULT_PAGINATION,
    ): Promise<PaginatedResult<Purchase>>;
    /**
     * Get all purchases for a tester ready for refund (not refunded and with feedback)
     * @param testerUuid UUID of the tester
     * @param pagination Optional pagination parameters
     */
    readyForRefund(
        testerUuid: string,
        pagination?: typeof DEFAULT_PAGINATION,
    ): Promise<PaginatedResult<PurchaseWithFeedback>>;
    /**
     * Get the total number of purchases for a tester that are not refunded
     * @param testerUuid UUID of the tester
     */
    notRefundedAmount(testerUuid: string): Promise<number>;
    /**
     * Get all purchases for a tester
     * @param testerUuid UUID of the tester
     * @param pagination Optional pagination parameters
     */
    delete(id: string): Promise<boolean>;
    /**
     * Add a new purchase for a tester
     * @param testerUuid UUID of the tester
     * @param newPurchase The purchase object to add
     */
    put(testerUuid: string, newPurchase: Purchase): Promise<string>;
    /**
     * Update an existing purchase
     * @param id The ID of the purchase to update
     * @param updates The updates to apply to the purchase
     */
    update(id: string, updates: Partial<Purchase>): Promise<boolean>;
    /**
     * Get all purchases for a tester
     * @param testerUuid UUID of the tester
     * @param pagination Optional pagination parameters
     */
    getAll(): Promise<Purchase[]>;

    /**
     * Get all purchases for a tester with full status
     * @param testerUuid UUID of the tester
     * @param limitToNotRefunded Optional flag to limit to not refunded purchases
     * @param page Optional page number for pagination
     * @param limit Optional limit for number of results per page
     * @param sort Optional sorting field
     * @param order Optional sorting order (asc/desc)
     */
    getPurchaseStatus(
        testerUuid: string,
        limitToNotRefunded?: boolean,
        page?: number,
        limit?: number,
        sort?: string,
        order?: string,
    ): Promise<PurchaseStatusResponse>;

    /**
     * Get some statistics of purchases for a tester
     * @param testerUuid UUID of the tester
     * @returns Promise<PurchasesStatisticsData> Statistics data for the tester's purchases
     */
    getPurchaseStatistics(
        testerUuid: string,
    ): Promise<PurchasesStatisticsData>;

    /**
     * Search purchases using fuzzy matching
     * @param testerUuid UUID of the tester
     * @param query Search query string
     * @returns Promise<string[]> Array of matching purchase IDs
     */
    searchPurchases(testerUuid: string, query: string): Promise<string[]>;
}

export interface FeedbacksRepository {
    find(fn: (feedback: Feedback) => boolean): Promise<Feedback | undefined>;
    filter(fn: (feedback: Feedback) => boolean): Promise<Feedback[]>;
    put(testerId: string, newFeedback: Feedback): Promise<string>;
    getAll(): Promise<Feedback[]>;
}

export interface PublicationsRepository {
    find(
        fn: (publication: Publication) => boolean,
    ): Promise<Publication | undefined>;
    filter(fn: (publication: Publication) => boolean): Promise<Publication[]>;
    put(testerId: string, newPublication: Publication): Promise<string>;
    getAll(): Promise<Publication[]>;
}

export interface RefundsRepository {
    find(fn: (refund: Refund) => boolean): Promise<Refund | undefined>;
    filter(fn: (refund: Refund) => boolean): Promise<Refund[]>;
    put(testerId: string, newRefund: Refund): Promise<string>;
    getAll(): Promise<Refund[]>;
}

/**
 * Links repository interface for short public dispute resolution links
 */
export interface LinksRepository {
    /**
     * Generate a new short link for a purchase
     * @param purchaseId The purchase ID
     * @param durationSeconds How long the link is valid in seconds
     * @returns The generated 7-character code
     */
    generate(purchaseId: string, durationSeconds: number): Promise<string>;

    /**
     * Get the purchase information associated with a link
     * @param code The 7-character link code
     * @returns The purchase ID if link is valid and not expired, null otherwise
     */
    getPurchaseByCode(code: string): Promise<string | null>;

    /**
     * Delete an expired link
     * @param code The 7-character link code
     */
    delete(code: string): Promise<boolean>;

    /**
     * Get all links for a purchase
     * @param purchaseId The purchase ID
     */
    getByPurchaseId(purchaseId: string): Promise<Link[]>;

    /**
     * Cleanup expired links
     */
    cleanupExpired(): Promise<number>;

    /**
     * Get all links
     */
    getAll(): Promise<Link[]>;
}

/**
 * Abstract database class that defines the interface for all database implementations
 */
export abstract class FeedbackFlowDB {
    /**
     * ID mappings operations
     */
    abstract idMappings: IdMappingsRepository;

    /**
     * Tester-related database operations
     */
    abstract testers: TestersRepository;

    /**
     * Purchase-related database operations
     */
    abstract purchases: PurchasesRepository;

    /**
     * Feedback-related database operations
     */
    abstract feedbacks: FeedbacksRepository;

    /**
     * Publication-related database operations
     */
    abstract publications: PublicationsRepository;

    /**
     * Refund-related database operations
     */
    abstract refunds: RefundsRepository;

    /**
     * Links-related database operations for short public dispute resolution links
     */
    abstract links: LinksRepository;

    /**
     * Reset the database with new data (optional)
     */
    abstract reset?(newData: DATABASESCHEMA): Promise<void>;

    /**
     * Get a copy of the raw database data (optional)
     */
    abstract getRawData?(): Promise<DATABASESCHEMA>;

    /**
     * Backup the database to JSON string (optional)
     */
    abstract backupToJson?(): Promise<string>;

    /**
     * Restore the database from JSON string (optional)
     */
    abstract restoreFromJsonString?(
        backup: string,
    ): Promise<{ success: boolean; message?: string }>;
}
