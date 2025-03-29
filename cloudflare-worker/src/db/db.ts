/* eslint-disable no-console */
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

import { mockData } from "../test/mock-data";
import {
	Feedback,
	IdMapping,
	Publication,
	Purchase,
	Refund,
	Tester,
} from "../types/data";

import { CloudflareD1DB } from "./d1-db";
import { InMemoryDB } from "./in-memory-db";

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

// Convertir également PurchasesRepository, FeedbacksRepository, PublicationsRepository, RefundsRepository
// de manière similaire (toutes les méthodes retournent des Promises)
export interface PurchasesRepository {
	find(fn: (purchase: Purchase) => boolean): Promise<Purchase | undefined>;
	filter(fn: (purchase: Purchase) => boolean): Promise<Purchase[]>;
	put(testerUuid: string, newPurchase: Purchase): Promise<string>;
	update(id: string, updates: Partial<Purchase>): Promise<boolean>;
	getAll(): Promise<Purchase[]>;
	/**
	 * Get purchase status information for a specific tester
	 * @param {string} testerUuid - UUID of the tester to get purchase status for
	 * @returns {Promise<PurchaseStatus[]>} Array of purchase status objects
	 */
	getPurchaseStatus(
		testerUuid: string,
		page?: number,
		limit?: number,
		sort?: string,
		order?: string,
	): Promise<PurchaseStatus[]>;
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

/**
 * Singleton instance of the database
 */
let dbInstance: FeedbackFlowDB | null = null;

/**
 * Get the database instance based on the environment configuration
 * @param env Environment configuration
 */
export function getDatabase(env: Env): FeedbackFlowDB {
	if (dbInstance === null) {
		// Initialiser la base de données en fonction de env.DB_BACKEND
		dbInstance =
			env.DB_BACKEND !== "memory"
				? (new CloudflareD1DB(env.FeedbackFlowDB) as FeedbackFlowDB)
				: (new InMemoryDB(mockData) as FeedbackFlowDB);

		console.log(`Database initialized with backend: ${env.DB_BACKEND}`);
	}

	return dbInstance;
}
