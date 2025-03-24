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

import {
	Feedback,
	IdMapping,
	Publication,
	Purchase,
	Refund,
	Tester,
} from "../types/data";

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
}

/**
 * IdMappings repository interface
 */
export interface IdMappingsRepository {
	/**
	 * Check if an ID exists in the database
	 * @param id The OAuth ID to check
	 */
	exists(id: string): boolean;

	/**
	 * Check if multiple IDs exist in the database
	 * @param ids Array of OAuth IDs to check
	 */
	existsMultiple(ids: string[]): string[];

	/**
	 * Get the tester UUID associated with an ID
	 * @param id The OAuth ID to look up
	 */
	getTesterUuid(id: string): string | undefined;

	/**
	 * Add a new ID to tester mapping
	 * @param id The OAuth ID
	 * @param testerUuid The associated tester UUID
	 */
	put(id: string, testerUuid: string): boolean;

	/**
	 * Add multiple ID to tester mappings
	 * @param ids Array of OAuth IDs
	 * @param testerUuid The associated tester UUID
	 */
	putMultiple(ids: string[], testerUuid: string): string[];

	/**
	 * Delete an ID mapping
	 * @param id The OAuth ID to delete
	 */
	delete(id: string): boolean;

	/**
	 * Get all ID mappings
	 */
	getAll(): IdMapping[];
}

/**
 * Testers repository interface
 */
export interface TestersRepository {
	/**
	 * Find a tester that matches the provided condition
	 * @param fn Predicate function to filter testers
	 */
	find(fn: (tester: Tester) => boolean): Tester | undefined;

	/**
	 * Filter testers based on the provided condition
	 * @param fn Predicate function to filter testers
	 */
	filter(fn: (tester: Tester) => boolean): Tester[];

	/**
	 * Add or update a tester in the database
	 * @param newTester The tester object to add or update
	 */
	put(newTester: Tester): string[];

	/**
	 * Get all testers from the database
	 */
	getAll(): Tester[];

	/**
	 * Find a tester by their authentication ID
	 * @param id Authentication ID to search for
	 */
	getTesterWithId(id: string): Tester | undefined;

	/**
	 * Find a tester by their UUID
	 * @param uuid UUID to search for
	 */
	getTesterWithUuid(uuid: string): Tester | undefined;

	/**
	 * Add IDs to an existing tester
	 * @param uuid UUID of the tester to update
	 * @param ids IDs to add to the tester
	 */
	addIds(uuid: string, ids: string[]): string[] | undefined;
}

/**
 * Purchases repository interface
 */
export interface PurchasesRepository {
	/**
	 * Find a purchase that matches the provided condition
	 * @param fn Predicate function to filter purchases
	 */
	find(fn: (purchase: Purchase) => boolean): Purchase | undefined;

	/**
	 * Filter purchases based on the provided condition
	 * @param fn Predicate function to filter purchases
	 */
	filter(fn: (purchase: Purchase) => boolean): Purchase[];

	/**
	 * Add a new purchase to the database
	 * @param testerUuid UUID of the tester making the purchase
	 * @param newPurchase The purchase object to add
	 */
	put(testerUuid: string, newPurchase: Purchase): string;

	/**
	 * Update an existing purchase in the database
	 * @param id ID of the purchase to update
	 * @param updates Fields to update
	 */
	update(id: string, updates: Partial<Purchase>): boolean;

	/**
	 * Get all purchases from the database
	 */
	getAll(): Purchase[];
}

/**
 * Feedbacks repository interface
 */
export interface FeedbacksRepository {
	/**
	 * Find feedback that matches the provided condition
	 * @param fn Predicate function to filter feedback
	 */
	find(fn: (feedback: Feedback) => boolean): Feedback | undefined;

	/**
	 * Filter feedback based on the provided condition
	 * @param fn Predicate function to filter feedback
	 */
	filter(fn: (feedback: Feedback) => boolean): Feedback[];

	/**
	 * Add new feedback to the database
	 * @param testerId ID of the tester providing the feedback
	 * @param newFeedback The feedback object to add
	 */
	put(testerId: string, newFeedback: Feedback): string;

	/**
	 * Get all feedback from the database
	 */
	getAll(): Feedback[];
}

/**
 * Publications repository interface
 */
export interface PublicationsRepository {
	/**
	 * Find a publication that matches the provided condition
	 * @param fn Predicate function to filter publications
	 */
	find(fn: (publication: Publication) => boolean): Publication | undefined;

	/**
	 * Filter publications based on the provided condition
	 * @param fn Predicate function to filter publications
	 */
	filter(fn: (publication: Publication) => boolean): Publication[];

	/**
	 * Add a new publication to the database
	 * @param testerId ID of the tester creating the publication
	 * @param newPublication The publication object to add
	 */
	put(testerId: string, newPublication: Publication): string;

	/**
	 * Get all publications from the database
	 */
	getAll(): Publication[];
}

/**
 * Refunds repository interface
 */
export interface RefundsRepository {
	/**
	 * Find a refund that matches the provided condition
	 * @param fn Predicate function to filter refunds
	 */
	find(fn: (refund: Refund) => boolean): Refund | undefined;

	/**
	 * Filter refunds based on the provided condition
	 * @param fn Predicate function to filter refunds
	 */
	filter(fn: (refund: Refund) => boolean): Refund[];

	/**
	 * Add a new refund to the database and mark the associated purchase as refunded
	 * @param testerId ID of the tester receiving the refund
	 * @param newRefund The refund object to add
	 */
	put(testerId: string, newRefund: Refund): string;

	/**
	 * Get all refunds from the database
	 */
	getAll(): Refund[];
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
	 * Reset the database with new data (optional for implementations)
	 * @param newData Data to reset the database with
	 */
	abstract reset?(newData: DATABASESCHEMA): void;

	/**
	 * Get a copy of the raw database data (optional for implementations)
	 */
	abstract getRawData?(): DATABASESCHEMA;
}
