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

import { DATABASESCHEMA, DEFAULT_PAGINATION, FeedbackFlowDB, PaginatedResult, PurchaseStatus, PurchaseStatusResponse, PurchaseWithFeedback } from "./db";

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

		refunded: async (testerUuid: string, pagination?: typeof DEFAULT_PAGINATION): Promise<PaginatedResult<Purchase>> => {
			if (!pagination) {
				pagination = DEFAULT_PAGINATION;
			}

			// Filter the purchases by tester and refunded status
			const filteredPurchases = this.data.purchases.filter(
				(p) => p.testerUuid === testerUuid && p.refunded
			);

			const totalCount = filteredPurchases.length;

			// Sort the filtered purchases
			const sortedPurchases = [...filteredPurchases].sort((a, b) => {
				if (pagination!.sort === "date") {
					return pagination!.order === "asc"
						? new Date(a.date).getTime() - new Date(b.date).getTime()
						: new Date(b.date).getTime() - new Date(a.date).getTime();
				} else {
					return pagination!.order === "asc"
						? a.order.localeCompare(b.order)
						: b.order.localeCompare(a.order);
				}
			});

			// Apply pagination
			const paginatedPurchases = sortedPurchases.slice(
				(pagination.page - 1) * pagination.limit,
				pagination.page * pagination.limit
			);

			return { results: paginatedPurchases, totalCount };
		},

		refundedAmount: async (testerUuid: string): Promise<number> => {
			const refunded = await this.purchases.refunded(testerUuid);
			const totalAmount = refunded.results.reduce((acc, purchase) => {
				return acc + purchase.amount;
			}, 0);
			return totalAmount;
		},
		notRefunded: async (testerUuid: string, pagination?: typeof DEFAULT_PAGINATION): Promise<PaginatedResult<Purchase>> => {
			if (!pagination) {
				pagination = DEFAULT_PAGINATION;
			}

			// Filter the purchases by tester and not refunded status
			const filteredPurchases = this.data.purchases.filter(
				(p) => p.testerUuid === testerUuid && !p.refunded
			);

			const totalCount = filteredPurchases.length;

			// Sort the filtered purchases
			const sortedPurchases = [...filteredPurchases].sort((a, b) => {
				if (pagination!.sort === "date") {
					return pagination!.order === "asc"
						? new Date(a.date).getTime() - new Date(b.date).getTime()
						: new Date(b.date).getTime() - new Date(a.date).getTime();
				} else {
					return pagination!.order === "asc"
						? a.order.localeCompare(b.order)
						: b.order.localeCompare(a.order);
				}
			});

			// Apply pagination
			const paginatedPurchases = sortedPurchases.slice(
				(pagination.page - 1) * pagination.limit,
				pagination.page * pagination.limit
			);

			return { results: paginatedPurchases, totalCount };
		},
		/**
		 * Get all purchases for a tester ready for refund (not refunded, with feedback AND publication)
		 * @param testerUuid UUID of the tester
		 * @param pagination Optional pagination parameters
		 */
		readyForRefund: async (testerUuid: string, pagination?: typeof DEFAULT_PAGINATION): Promise<PaginatedResult<PurchaseWithFeedback>> => {
			if (!pagination) {
				pagination = DEFAULT_PAGINATION;
			}

			// Filter the purchases by:
			// 1. Belonging to this tester
			// 2. Not yet refunded
			// 3. Having feedback
			// 4. Having publication (this is what was missing before)
			const filteredPurchases = this.data.purchases.filter(
				(p) => p.testerUuid === testerUuid && 
					!p.refunded && 
					this.data.feedbacks.some((feedback) => feedback.purchase === p.id) &&
					this.data.publications.some((publication) => publication.purchase === p.id)
			);

			const totalCount = filteredPurchases.length;

			// Enhance purchase objects with feedback and publication data
			const enhancedPurchases = filteredPurchases.map(purchase => {
				// Find the feedback for this purchase
				const feedback = this.data.feedbacks.find(f => f.purchase === purchase.id);
				
				// Find the publication for this purchase
				const publication = this.data.publications.find(p => p.purchase === purchase.id);
				
				return {
					...purchase,
					feedback: feedback?.feedback || "",
					feedbackDate: feedback?.date || "",
					publicationScreenshot: publication?.screenshot,
					publicationDate: publication?.date
				} as PurchaseWithFeedback;
			});

			// Sort the filtered purchases
			const sortedPurchases = [...enhancedPurchases].sort((a, b) => {
				if (pagination!.sort === "date") {
					return pagination!.order === "asc"
						? new Date(a.date).getTime() - new Date(b.date).getTime()
						: new Date(b.date).getTime() - new Date(a.date).getTime();
				} else {
					return pagination!.order === "asc"
						? a.order.localeCompare(b.order)
						: b.order.localeCompare(a.order);
				}
			});

			// Apply pagination
			const paginatedPurchases = sortedPurchases.slice(
				(pagination.page - 1) * pagination.limit,
				pagination.page * pagination.limit
			);

			return { results: paginatedPurchases, totalCount };
		},
		notRefundedAmount: async (testerUuid: string): Promise<number> => {
			const notRefunded = await this.purchases.notRefunded(testerUuid);
			const totalAmount = notRefunded.results.reduce((acc, purchase) => {
				return acc + purchase.amount;
			}, 0);
			return totalAmount;
		},
		delete: async (id: string) => {
			const index = this.data.purchases.findIndex(
				(purchase) => purchase.id === id,
			);
			if (index >= 0) {
				this.data.purchases.splice(index, 1);
				return true;
			}
			return false;
		},
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

		/**
		 * Get purchase status information for a specific tester
		 * @param testerUuid The UUID of the tester
		 * @param limitToNotRefunded Optional flag to limit results to not refunded purchases
		 * @param page Optional page number for pagination
		 * @param limit Optional limit for number of results per page
		 * @param sort Optional field to sort by (default: 'date')
		 * @param order Optional sorting order (asc/desc, default: 'desc')
		 */
		getPurchaseStatus: async (
			testerUuid: string,
			limitToNotRefunded?: boolean,
			page?: number,
			limit?: number,
			sort?: string,
			order?: string,
		): Promise<PurchaseStatusResponse> => {
			if (!limitToNotRefunded) {
				limitToNotRefunded = false; // Default to false
			}
			if (!testerUuid) {
				throw new Error("Tester UUID is required");
			}
			if (page && page < 1) {
				throw new Error("Page must be greater than 0");
			}
			if (limit && limit < 1) {
				throw new Error("Limit must be greater than 0");
			}
			if (!limit) {
				limit = 10; // Default limit
			}
			if (!page) {
				page = 1; // Default page
			}
			if (sort && !["date", "order"].includes(sort)) {
				throw new Error("Sort must be 'date' or 'order'");
			}
			if (!sort) {
				sort = "date"; // Default sort column
			}
			if (!order) {
				order = "desc"; // Default order
			}
			if (order && !["asc", "desc"].includes(order)) {
				throw new Error("Order must be 'asc' or 'descc'");
			}
			// Pagination logic
			const offset = page && limit ? (page - 1) * limit : 0;

			// Get all purchases for the tester
			const testerPurchases = this.data.purchases.filter(
				(purchase) => purchase.testerUuid === testerUuid,
			);

			// Build the status for each purchase
			let globalResult = testerPurchases
				.map((purchase) => {
					// Check for related feedback, publication, and refund
					const hasFeedback = this.data.feedbacks.find(
						(feedback) => feedback.purchase === purchase.id,
					);

					const hasPublication = this.data.publications.find(
						(publication) => publication.purchase === purchase.id,
					);

					const hasRefund = this.data.refunds.find(
						(refund) => refund.purchase === purchase.id,
					);

					// Return the purchase status object
					return {
						purchase: purchase.id,
						testerUuid: purchase.testerUuid,
						date: purchase.date,
						order: purchase.order,
						description: purchase.description,
						amount: purchase.amount,
						refunded: purchase.refunded || false,
						hasFeedback: hasFeedback !== undefined,
						hasPublication: hasPublication !== undefined,
						hasRefund: hasRefund !== undefined,
						publicationScreenshot: hasPublication?.screenshot,
						purchaseScreenshot: purchase.screenshot,
						screenshotSummary: purchase.screenshotSummary,
					} as PurchaseStatus;
				});

			// Filter out refunded purchases if requested
			if (limitToNotRefunded) {
				globalResult = globalResult.filter((purchase) => !purchase.refunded);
			}
			const result = globalResult
				.slice(offset, offset + limit)
				.sort((a, b) => {
					if (sort === "date") {
						if (order === "asc") {
							return new Date(a.date).getTime() - new Date(b.date).getTime();
						} else {
							return new Date(b.date).getTime() - new Date(a.date).getTime();
						}
					} else {
						if (order === "asc") {
							return a.order.localeCompare(b.order);
						} else {
							return b.order.localeCompare(a.order);
						}
					}
				});

			// Construct the response object with pagination info
			const pageInfo = {
				totalCount: globalResult.length,
				totalPages: Math.ceil(globalResult.length / limit),
				currentPage: page,
				hasNextPage: page < Math.ceil(globalResult.length / limit),
				hasPreviousPage: page > 1,
				nextPage: page < Math.ceil(globalResult.length / limit) ? page + 1 : null,
				previousPage: page > 1 ? page - 1 : null,
			};
			const response: PurchaseStatusResponse = {
				results: result,
				pageInfo,
			};
			return response;
		}
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
	async restoreFromJsonString(backup: string) {
		this.data = JSON.parse(backup);

		return { success: true, message: "Database restored successfully" };
	}
}
