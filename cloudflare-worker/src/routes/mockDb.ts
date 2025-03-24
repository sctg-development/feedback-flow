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

/**
 * Interface for the OAuth ID to tester UUID mapping
 */
interface IdMapping {
	id: string; // OAuth ID (primary key)
	testerUuid: string; // Reference to tester UUID
}

// Sample data collections
const testersData: Tester[] = [
	{
		uuid: "45f9830a-309b-4cda-95ec-71e000b78f7d",
		name: "John Doe",
		ids: ["auth0|1234567890"],
	},
	{
		uuid: "cc97a5cc-c4ba-4804-98b5-90532f09bd83",
		name: "Jane Doe",
		ids: ["auth0|0987654321"],
	},
];

/**
 * ID mappings table - simulates a separate table for ID lookups
 */
const idMappingsData: IdMapping[] = [
	{
		id: "auth0|1234567890",
		testerUuid: "45f9830a-309b-4cda-95ec-71e000b78f7d",
	},
	{
		id: "auth0|0987654321",
		testerUuid: "cc97a5cc-c4ba-4804-98b5-90532f09bd83",
	},
];

const purchasesData: Purchase[] = [
	{
		id: "d5726cf2-36f6-41d8-bd37-f349314561b4",
		testerUuid: "45f9830a-309b-4cda-95ec-71e000b78f7d",
		date: "2025-03-23",
		order: "123",
		description: "Test order",
		amount: 10.99,
		screenshot:
			"UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==",
		refunded: false,
	},
	{
		id: "aa92494a-a036-4a4e-9c6a-c3821a8cb6a4",
		testerUuid: "cc97a5cc-c4ba-4804-98b5-90532f09bd83",
		date: "2021-02-01",
		order: "456",
		description: "Test order 2",
		amount: 20.99,
		screenshot:
			"UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==",
		refunded: true,
	},
	{
		id: "b5e8c21d-7f4e-4a6b-9c3d-9e7a1f2b3c4d",
		testerUuid: "45f9830a-309b-4cda-95ec-71e000b78f7d",
		date: "2025-02-15",
		order: "789",
		description: "Premium product test",
		amount: 59.99,
		screenshot:
			"UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==",
		refunded: false,
	},
];

const feedbacksData: Feedback[] = [
	{
		date: "2025-03-23",
		purchase: "d5726cf2-36f6-41d8-bd37-f349314561b4",
		feedback: "Great product, fast delivery and exactly as described!",
	},
	{
		date: "2021-02-05",
		purchase: "aa92494a-a036-4a4e-9c6a-c3821a8cb6a4",
		feedback: "Product was good but shipping took longer than expected.",
	},
];

const publicationsData: Publication[] = [
	{
		date: "2025-03-23",
		purchase: "d5726cf2-36f6-41d8-bd37-f349314561b4",
		screenshot:
			"UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==",
	},
	{
		date: "2021-02-10",
		purchase: "aa92494a-a036-4a4e-9c6a-c3821a8cb6a4",
		screenshot:
			"UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==",
	},
];

const refundsData: Refund[] = [
	{
		date: "2025-03-25",
		purchase: "d5726cf2-36f6-41d8-bd37-f349314561b4",
		refunddate: "2025-03-28",
		amount: 10.99,
	},
	{
		date: "2021-02-15",
		purchase: "aa92494a-a036-4a4e-9c6a-c3821a8cb6a4",
		refunddate: "2021-02-20",
		amount: 20.99,
	},
];

/**
 * In-memory database for testing purposes
 * Provides CRUD-like operations for all data types
 */
export const mockDb = {
	/**
	 * ID mappings operations
	 */
	idMappings: {
		/**
		 * Check if an ID exists in the database
		 * @param {string} id - The OAuth ID to check
		 * @returns {boolean} True if the ID exists, false otherwise
		 */
		exists: (id: string): boolean => {
			return idMappingsData.some((mapping) => mapping.id === id);
		},

		/**
		 * Get the tester UUID associated with an ID
		 * @param {string} id - The OAuth ID to look up
		 * @returns {string|undefined} The associated tester UUID if found
		 */
		getTesterUuid: (id: string): string | undefined => {
			const mapping = idMappingsData.find((mapping) => mapping.id === id);

			return mapping?.testerUuid;
		},

		/**
		 * Add a new ID to tester mapping
		 * @param {string} id - The OAuth ID
		 * @param {string} testerUuid - The associated tester UUID
		 * @returns {boolean} True if successful, false if ID already exists
		 */
		put: (id: string, testerUuid: string): boolean => {
			if (idMappingsData.some((mapping) => mapping.id === id)) {
				return false; // ID already exists
			}

			idMappingsData.push({ id, testerUuid });

			return true;
		},

		/**
		 * Add multiple ID to tester mappings
		 * @param {string[]} ids - Array of OAuth IDs
		 * @param {string} testerUuid - The associated tester UUID
		 * @returns {string[]} Array of IDs that were successfully added
		 */
		putMultiple: (ids: string[], testerUuid: string): string[] => {
			const addedIds: string[] = [];

			for (const id of ids) {
				if (!idMappingsData.some((mapping) => mapping.id === id)) {
					idMappingsData.push({ id, testerUuid });
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
		delete: (id: string): boolean => {
			const index = idMappingsData.findIndex((mapping) => mapping.id === id);

			if (index >= 0) {
				idMappingsData.splice(index, 1);

				return true;
			}

			return false;
		},

		/**
		 * Get all ID mappings
		 * @returns {IdMapping[]} Copy of all ID mappings
		 */
		getAll: () => [...idMappingsData],
	},

	/**
	 * Tester-related database operations
	 */
	testers: {
		/**
		 * Find a tester that matches the provided condition
		 * @param {function} fn - Predicate function to filter testers
		 * @returns {Tester|undefined} The first matching tester or undefined if not found
		 */
		find: (fn: (tester: Tester) => boolean) => testersData.find(fn),

		/**
		 * Filter testers based on the provided condition
		 * @param {function} fn - Predicate function to filter testers
		 * @returns {Tester[]} Array of testers matching the condition
		 */
		filter: (fn: (tester: Tester) => boolean) => testersData.filter(fn),

		/**
		 * Add or update a tester in the database
		 * @param {Tester} newTester - The tester object to add or update
		 * @returns {string[]} The IDs associated with the tester
		 */
		put: (newTester: Tester) => {
			const index = testersData.findIndex(
				(tester) => tester.uuid === newTester.uuid,
			);

			if (index >= 0) {
				// Update existing tester
				const oldIds = testersData[index].ids;
				const newIds = newTester.ids;

				// Remove old ID mappings that are no longer in the tester's ID list
				for (const oldId of oldIds) {
					if (!newIds.includes(oldId)) {
						mockDb.idMappings.delete(oldId);
					}
				}

				// Add new ID mappings
				for (const newId of newIds) {
					if (!oldIds.includes(newId)) {
						mockDb.idMappings.put(newId, newTester.uuid);
					}
				}

				// Update the tester
				testersData[index] = newTester;

				return newTester.ids;
			} else {
				// Add new tester
				if (!newTester.uuid) {
					newTester.uuid = uuidv4();
				}

				// Add ID mappings for all IDs in the new tester
				mockDb.idMappings.putMultiple(newTester.ids, newTester.uuid);

				// Add the tester
				testersData.push(newTester);

				return newTester.ids;
			}
		},

		/**
		 * Get all testers from the database
		 * @returns {Tester[]} A copy of all testers
		 */
		getAll: () => [...testersData],

		/**
		 * Find a tester by their authentication ID (efficient lookup using ID mappings)
		 * @param {string} id - Authentication ID to search for
		 * @returns {Tester|undefined} The matching tester or undefined if not found
		 */
		getTesterWithId: (id: string) => {
			const testerUuid = mockDb.idMappings.getTesterUuid(id);

			if (!testerUuid) return undefined;

			return testersData.find((tester) => tester.uuid === testerUuid);
		},

		/**
		 * Find a tester by their UUID
		 * @param {string} uuid - UUID to search for
		 * @returns {Tester|undefined} The matching tester or undefined if not found
		 */
		getTesterWithUuid: (uuid: string) =>
			testersData.find((tester) => tester.uuid === uuid),

		/**
		 * Add IDs to an existing tester
		 * @param {string} uuid - UUID of the tester to update
		 * @param {string[]} ids - IDs to add to the tester
		 * @returns {string[]|undefined} Updated list of IDs if successful, undefined if tester not found
		 */
		addIds: (uuid: string, ids: string[]): string[] | undefined => {
			const index = testersData.findIndex((tester) => tester.uuid === uuid);

			if (index < 0) return undefined;

			// Get existing IDs
			const existingIds = testersData[index].ids;
			// Check which IDs don't already exist in the mappings table
			const newIds = ids.filter((id) => !mockDb.idMappings.exists(id));

			// Add new ID mappings
			mockDb.idMappings.putMultiple(newIds, uuid);

			// Update tester with all IDs (existing + new)
			const allIds = [...existingIds, ...newIds];

			testersData[index].ids = allIds;

			return allIds;
		},
	},

	/**
	 * Purchase-related database operations
	 */
	purchases: {
		/**
		 * Find a purchase that matches the provided condition
		 * @param {function} fn - Predicate function to filter purchases
		 * @returns {Purchase|undefined} The first matching purchase or undefined if not found
		 */
		find: (fn: (purchase: Purchase) => boolean) => purchasesData.find(fn),

		/**
		 * Filter purchases based on the provided condition
		 * @param {function} fn - Predicate function to filter purchases
		 * @returns {Purchase[]} Array of purchases matching the condition
		 */
		filter: (fn: (purchase: Purchase) => boolean) => purchasesData.filter(fn),

		/**
		 * Add a new purchase to the database
		 * @param {string} testerUuid - UUID of the tester making the purchase
		 * @param {Purchase} newPurchase - The purchase object to add
		 * @returns {string} The ID of the newly added purchase
		 */
		put: (testerUuid: string, newPurchase: Purchase) => {
			if (!newPurchase.id) {
				newPurchase.id = uuidv4();
			}
			newPurchase.testerUuid = testerUuid;
			purchasesData.push(newPurchase);

			return newPurchase.id;
		},

		/**
		 * Update an existing purchase in the database
		 * @param {string} id - ID of the purchase to update
		 * @param {Partial<Purchase>} updates - Fields to update
		 * @returns {boolean} True if update was successful, false otherwise
		 */
		update: (id: string, updates: Partial<Purchase>) => {
			const index = purchasesData.findIndex((purchase) => purchase.id === id);

			if (index >= 0) {
				purchasesData[index] = { ...purchasesData[index], ...updates };

				return true;
			}

			return false;
		},

		/**
		 * Get all purchases from the database
		 * @returns {Purchase[]} A copy of all purchases
		 */
		getAll: () => [...purchasesData],
	},

	/**
	 * Feedback-related database operations
	 */
	feedbacks: {
		/**
		 * Find feedback that matches the provided condition
		 * @param {function} fn - Predicate function to filter feedback
		 * @returns {Feedback|undefined} The first matching feedback or undefined if not found
		 */
		find: (fn: (feedback: Feedback) => boolean) => feedbacksData.find(fn),

		/**
		 * Filter feedback based on the provided condition
		 * @param {function} fn - Predicate function to filter feedback
		 * @returns {Feedback[]} Array of feedback matching the condition
		 */
		filter: (fn: (feedback: Feedback) => boolean) => feedbacksData.filter(fn),

		/**
		 * Add new feedback to the database
		 * @param {string} testerId - ID of the tester providing the feedback
		 * @param {Feedback} newFeedback - The feedback object to add
		 * @returns {string} The purchase ID associated with the feedback
		 */
		put: (testerId: string, newFeedback: Feedback) => {
			feedbacksData.push(newFeedback);

			return newFeedback.purchase;
		},

		/**
		 * Get all feedback from the database
		 * @returns {Feedback[]} A copy of all feedback
		 */
		getAll: () => [...feedbacksData],
	},

	/**
	 * Publication-related database operations
	 */
	publications: {
		/**
		 * Find a publication that matches the provided condition
		 * @param {function} fn - Predicate function to filter publications
		 * @returns {Publication|undefined} The first matching publication or undefined if not found
		 */
		find: (fn: (publication: Publication) => boolean) =>
			publicationsData.find(fn),

		/**
		 * Filter publications based on the provided condition
		 * @param {function} fn - Predicate function to filter publications
		 * @returns {Publication[]} Array of publications matching the condition
		 */
		filter: (fn: (publication: Publication) => boolean) =>
			publicationsData.filter(fn),

		/**
		 * Add a new publication to the database
		 * @param {string} testerId - ID of the tester creating the publication
		 * @param {Publication} newPublication - The publication object to add
		 * @returns {string} The purchase ID associated with the publication
		 */
		put: (testerId: string, newPublication: Publication) => {
			publicationsData.push(newPublication);

			return newPublication.purchase;
		},

		/**
		 * Get all publications from the database
		 * @returns {Publication[]} A copy of all publications
		 */
		getAll: () => [...publicationsData],
	},

	/**
	 * Refund-related database operations
	 */
	refunds: {
		/**
		 * Find a refund that matches the provided condition
		 * @param {function} fn - Predicate function to filter refunds
		 * @returns {Refund|undefined} The first matching refund or undefined if not found
		 */
		find: (fn: (refund: Refund) => boolean) => refundsData.find(fn),

		/**
		 * Filter refunds based on the provided condition
		 * @param {function} fn - Predicate function to filter refunds
		 * @returns {Refund[]} Array of refunds matching the condition
		 */
		filter: (fn: (refund: Refund) => boolean) => refundsData.filter(fn),

		/**
		 * Add a new refund to the database and mark the associated purchase as refunded
		 * @param {string} testerId - ID of the tester receiving the refund
		 * @param {Refund} newRefund - The refund object to add
		 * @returns {string} The purchase ID associated with the refund
		 */
		put: (testerId: string, newRefund: Refund) => {
			refundsData.push(newRefund);

			// Mark the purchase as refunded
			const purchaseIndex = purchasesData.findIndex(
				(p) => p.id === newRefund.purchase,
			);

			if (purchaseIndex >= 0) {
				purchasesData[purchaseIndex].refunded = true;
			}

			return newRefund.purchase;
		},

		/**
		 * Get all refunds from the database
		 * @returns {Refund[]} A copy of all refunds
		 */
		getAll: () => [...refundsData],
	},
};
