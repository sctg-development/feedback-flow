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

// Database for testing purposes

import { v4 as uuidv4 } from "uuid";

import { Feedback, Publication, Purchase, Refund, Tester } from "../types/data";

import { DATABASESCHEMA, FeedbackFlowDB } from "./db";

/**
 * In-memory database class for testing purposes
 * Provides CRUD-like operations for all data types
 */
export class InMemoryDB implements FeedbackFlowDB {
	private data: DATABASESCHEMA;

	/**
	 * Create a new instance of the in-memory database
	 * @param initialData Initial data to populate the database with
	 */
	constructor(
		initialData: DATABASESCHEMA = {
			ids: [],
			testers: [],
			purchases: [],
			feedbacks: [],
			publications: [],
			refunds: [],
		},
	) {
		// Clone the initial data to avoid modifications to the original object
		// by converting it to JSON and back
		this.data = JSON.parse(JSON.stringify(initialData));
	}

	/**
	 * Reset the database with new data
	 * @param newData Data to reset the database with
	 */
	async reset(newData: DATABASESCHEMA) {
		this.data = JSON.parse(JSON.stringify(newData));
	}

	/**
	 * Get a copy of the raw database data
	 * @returns A deep copy of the current database state
	 */
	async getRawData(): Promise<DATABASESCHEMA> {
		return JSON.parse(JSON.stringify(this.data));
	}

	/**
	 * ID mappings operations
	 */
	idMappings = {
		/**
		 * Check if an ID exists in the database
		 * @param {string} id - The OAuth ID to check
		 * @returns {boolean} True if the ID exists, false otherwise
		 */
		exists: async (id: string): Promise<boolean> => {
			return this.data.ids.some((mapping) => mapping.id === id);
		},

		/**
		 * Check if multiple IDs exist in the database
		 * @param {string[]} ids - Array of OAuth IDs to check
		 * @returns {string[]} Array of IDs that already exist
		 */
		existsMultiple: async (ids: string[]): Promise<string[]> => {
			return ids.filter((id) =>
				this.data.ids.some((mapping) => mapping.id === id),
			);
		},

		/**
		 * Get the tester UUID associated with an ID
		 * @param {string} id - The OAuth ID to look up
		 * @returns {string|undefined} The associated tester UUID if found
		 */
		getTesterUuid: async (id: string): Promise<string | undefined> => {
			const mapping = this.data.ids.find((mapping) => mapping.id === id);

			return mapping?.testerUuid;
		},

		/**
		 * Add a new ID to tester mapping
		 * @param {string} id - The OAuth ID
		 * @param {string} testerUuid - The associated tester UUID
		 * @returns {boolean} True if successful, false if ID already exists
		 */
		put: async (id: string, testerUuid: string): Promise<boolean> => {
			if (this.data.ids.some((mapping) => mapping.id === id)) {
				return false; // ID already exists
			}

			this.data.ids.push({ id, testerUuid });

			return true;
		},

		/**
		 * Add multiple ID to tester mappings
		 * @param {string[]} ids - Array of OAuth IDs
		 * @param {string} testerUuid - The associated tester UUID
		 * @returns {string[]} Array of IDs that were successfully added
		 */
		putMultiple: async (
			ids: string[],
			testerUuid: string,
		): Promise<string[]> => {
			const addedIds: string[] = [];

			for (const id of ids) {
				if (!this.data.ids.some((mapping) => mapping.id === id)) {
					this.data.ids.push({ id, testerUuid });
					addedIds.push(id);
				}
			}

			return addedIds;
		},

		/**
		 * Delete an ID mapping
		 * @param {string} id - The OAuth ID to delete
		 * @returns {boolean} True if successful, false if ID not found
		 */
		delete: async (id: string): Promise<boolean> => {
			const index = this.data.ids.findIndex((mapping) => mapping.id === id);

			if (index >= 0) {
				this.data.ids.splice(index, 1);

				return true;
			}

			return false;
		},

		/**
		 * Get all ID mappings
		 * @returns {IdMapping[]} Copy of all ID mappings
		 */
		getAll: async () => {
			return [...this.data.ids];
		},
	};

	/**
	 * Tester-related database operations
	 */
	testers = {
		/**
		 * Find a tester that matches the provided condition
		 * @param {function} fn - Predicate function to filter testers
		 * @returns {Tester|undefined} The first matching tester or undefined if not found
		 */
		find: async (fn: (tester: Tester) => boolean) => this.data.testers.find(fn),

		/**
		 * Filter testers based on the provided condition
		 * @param {function} fn - Predicate function to filter testers
		 * @returns {Tester[]} Array of testers matching the condition
		 */
		filter: async (fn: (tester: Tester) => boolean) =>
			this.data.testers.filter(fn),

		/**
		 * Add or update a tester in the database
		 * @param {Tester} newTester - The tester object to add or update
		 * @returns {string[]} The IDs associated with the tester
		 */
		put: async (newTester: Tester) => {
			const index = this.data.testers.findIndex(
				(tester) => tester.uuid === newTester.uuid,
			);

			if (index >= 0) {
				// Update existing tester
				const oldIds = this.data.testers[index].ids;
				const newIds = newTester.ids;

				// Remove old ID mappings that are no longer in the tester's ID list
				for (const oldId of oldIds) {
					if (!newIds.includes(oldId)) {
						this.idMappings.delete(oldId);
					}
				}

				// Add new ID mappings
				for (const newId of newIds) {
					if (!oldIds.includes(newId)) {
						this.idMappings.put(newId, newTester.uuid);
					}
				}

				// Update the tester
				this.data.testers[index] = newTester;

				return newTester.ids;
			} else {
				// Add new tester
				if (!newTester.uuid) {
					newTester.uuid = uuidv4();
				}

				// Add ID mappings for all IDs in the new tester
				this.idMappings.putMultiple(newTester.ids, newTester.uuid);

				// Add the tester
				this.data.testers.push(newTester);

				return newTester.ids;
			}
		},

		/**
		 * Get all testers from the database
		 * @returns {Tester[]} A copy of all testers
		 */
		getAll: async () => [...this.data.testers],

		/**
		 * Find a tester by their authentication ID (efficient lookup using ID mappings)
		 * @param {string} id - Authentication ID to search for
		 * @returns {Tester|undefined} The matching tester or undefined if not found
		 */
		getTesterWithId: async (id: string) => {
			const testerUuid = await this.idMappings.getTesterUuid(id);

			if (!testerUuid) return undefined;

			return this.data.testers.find((tester) => tester.uuid === testerUuid);
		},

		/**
		 * Find a tester by their UUID
		 * @param {string} uuid - UUID to search for
		 * @returns {Tester|undefined} The matching tester or undefined if not found
		 */
		getTesterWithUuid: async (uuid: string) =>
			this.data.testers.find((tester) => tester.uuid === uuid),

		/**
		 * Add IDs to an existing tester
		 * @param {string} uuid - UUID of the tester to update
		 * @param {string[]} ids - IDs to add to the tester
		 * @returns {string[]|undefined} Updated list of IDs if successful, undefined if tester not found
		 */
		addIds: async (
			uuid: string,
			ids: string[],
		): Promise<string[] | undefined> => {
			const index = this.data.testers.findIndex(
				(tester) => tester.uuid === uuid,
			);

			if (index < 0) return undefined;

			// Get existing IDs
			const existingIds = this.data.testers[index].ids;
			// Check which IDs don't already exist in the mappings table
			const newIds = ids.filter((id) => !this.idMappings.exists(id));

			// Add new ID mappings
			this.idMappings.putMultiple(newIds, uuid);

			// Update tester with all IDs (existing + new)
			const allIds = [...existingIds, ...newIds];

			this.data.testers[index].ids = allIds;

			return allIds;
		},
	};

	/**
	 * Purchase-related database operations
	 */
	purchases = {
		/**
		 * Find a purchase that matches the provided condition
		 * @param {function} fn - Predicate function to filter purchases
		 * @returns {Purchase|undefined} The first matching purchase or undefined if not found
		 */
		find: async (fn: (purchase: Purchase) => boolean) =>
			this.data.purchases.find(fn),

		/**
		 * Filter purchases based on the provided condition
		 * @param {function} fn - Predicate function to filter purchases
		 * @returns {Purchase[]} Array of purchases matching the condition
		 */
		filter: async (fn: (purchase: Purchase) => boolean) =>
			this.data.purchases.filter(fn),

		/**
		 * Add a new purchase to the database
		 * @param {string} testerUuid - UUID of the tester making the purchase
		 * @param {Purchase} newPurchase - The purchase object to add
		 * @returns {string} The ID of the newly added purchase
		 */
		put: async (testerUuid: string, newPurchase: Purchase) => {
			if (!newPurchase.id) {
				newPurchase.id = uuidv4();
			}
			newPurchase.testerUuid = testerUuid;
			this.data.purchases.push(newPurchase);

			return newPurchase.id;
		},

		/**
		 * Update an existing purchase in the database
		 * @param {string} id - ID of the purchase to update
		 * @param {Partial<Purchase>} updates - Fields to update
		 * @returns {boolean} True if update was successful, false otherwise
		 */
		update: async (id: string, updates: Partial<Purchase>) => {
			const index = this.data.purchases.findIndex(
				(purchase) => purchase.id === id,
			);

			if (index >= 0) {
				this.data.purchases[index] = {
					...this.data.purchases[index],
					...updates,
				};

				return true;
			}

			return false;
		},

		/**
		 * Get all purchases from the database
		 * @returns {Purchase[]} A copy of all purchases
		 */
		getAll: async () => [...this.data.purchases],
	};

	/**
	 * Feedback-related database operations
	 */
	feedbacks = {
		/**
		 * Find feedback that matches the provided condition
		 * @param {function} fn - Predicate function to filter feedback
		 * @returns {Feedback|undefined} The first matching feedback or undefined if not found
		 */
		find: async (fn: (feedback: Feedback) => boolean) =>
			this.data.feedbacks.find(fn),

		/**
		 * Filter feedback based on the provided condition
		 * @param {function} fn - Predicate function to filter feedback
		 * @returns {Feedback[]} Array of feedback matching the condition
		 */
		filter: async (fn: (feedback: Feedback) => boolean) =>
			this.data.feedbacks.filter(fn),

		/**
		 * Add new feedback to the database
		 * @param {string} testerId - ID of the tester providing the feedback
		 * @param {Feedback} newFeedback - The feedback object to add
		 * @returns {string} The purchase ID associated with the feedback
		 */
		put: async (testerId: string, newFeedback: Feedback) => {
			this.data.feedbacks.push(newFeedback);

			return newFeedback.purchase;
		},

		/**
		 * Get all feedback from the database
		 * @returns {Feedback[]} A copy of all feedback
		 */
		getAll: async () => [...this.data.feedbacks],
	};

	/**
	 * Publication-related database operations
	 */
	publications = {
		/**
		 * Find a publication that matches the provided condition
		 * @param {function} fn - Predicate function to filter publications
		 * @returns {Publication|undefined} The first matching publication or undefined if not found
		 */
		find: async (fn: (publication: Publication) => boolean) =>
			this.data.publications.find(fn),

		/**
		 * Filter publications based on the provided condition
		 * @param {function} fn - Predicate function to filter publications
		 * @returns {Publication[]} Array of publications matching the condition
		 */
		filter: async (fn: (publication: Publication) => boolean) =>
			this.data.publications.filter(fn),

		/**
		 * Add a new publication to the database
		 * @param {string} testerId - ID of the tester creating the publication
		 * @param {Publication} newPublication - The publication object to add
		 * @returns {string} The purchase ID associated with the publication
		 */
		put: async (testerId: string, newPublication: Publication) => {
			this.data.publications.push(newPublication);

			return newPublication.purchase;
		},

		/**
		 * Get all publications from the database
		 * @returns {Publication[]} A copy of all publications
		 */
		getAll: async () => [...this.data.publications],
	};

	/**
	 * Refund-related database operations
	 */
	refunds = {
		/**
		 * Find a refund that matches the provided condition
		 * @param {function} fn - Predicate function to filter refunds
		 * @returns {Refund|undefined} The first matching refund or undefined if not found
		 */
		find: async (fn: (refund: Refund) => boolean) => this.data.refunds.find(fn),

		/**
		 * Filter refunds based on the provided condition
		 * @param {function} fn - Predicate function to filter refunds
		 * @returns {Refund[]} Array of refunds matching the condition
		 */
		filter: async (fn: (refund: Refund) => boolean) =>
			this.data.refunds.filter(fn),

		/**
		 * Add a new refund to the database and mark the associated purchase as refunded
		 * @param {string} testerId - ID of the tester receiving the refund
		 * @param {Refund} newRefund - The refund object to add
		 * @returns {string} The purchase ID associated with the refund
		 */
		put: async (testerId: string, newRefund: Refund) => {
			this.data.refunds.push(newRefund);

			// Mark the purchase as refunded
			const purchaseIndex = this.data.purchases.findIndex(
				(p) => p.id === newRefund.purchase,
			);

			if (purchaseIndex >= 0) {
				this.data.purchases[purchaseIndex].refunded = true;
			}

			return newRefund.purchase;
		},

		/**
		 * Get all refunds from the database
		 * @returns {Refund[]} A copy of all refunds
		 */
		getAll: async () => [...this.data.refunds],
	};
	/**
	 * backup the database
	 * @returns the database as a JSON string
	 */
	async backupToJson(): Promise<string> {
		return JSON.stringify(this.data);
	}
	/**
	 * restore the database from a JSON string
	 * @param backup the backup JSON string
	 */
	async restoreFromJson(backup: string) {
		this.data = JSON.parse(backup);
	}
}
