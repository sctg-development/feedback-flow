/*
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
/* eslint-disable no-console */
import { D1Database } from "@cloudflare/workers-types";
import { v4 as uuidv4 } from "uuid";

import {
	Feedback,
	IdMapping,
	Publication,
	Purchase,
	Refund,
	Tester,
} from "../types/data";

import {
	FeedbackFlowDB,
	FeedbacksRepository,
	IdMappingsRepository,
	PublicationsRepository,
	PurchasesRepository,
	PurchaseStatus,
	RefundsRepository,
	TestersRepository,
} from "./db";

// Internal db types
type d1_tester = {
	uuid: string; // UUID of the tester map to `uuid`
	name: string; // Name of the tester map to `name`
};
type d1_id_mapping = {
	id: string; // OAuth ID map to `id`
	tester_uuid: string; // UUID of the tester map to `testerUuid`
};
type d1_purchase = {
	id: string; // ID of the purchase map to `id`
	tester_uuid: string; // UUID of the tester map to `testerUuid`
	date: string; // Date of the purchase map to `date`
	order_number: string; // Order number of the purchase map to `order`
	description: string; // Description of the purchase map to `description`
	amount: number; // Amount of the purchase map to `amount`
	screenshot: string; // Screenshot of the purchase map to `screenshot`
	refunded: number; // Refunded status of the purchase map to `refunded`
};
type d1_feedback = {
	purchase_id: string; // ID of the purchase map to `purchase`
	date: string; // Date of the feedback map to `date`
	feedback: string; // Feedback text map to `feedback`
};
type d1_publication = {
	purchase_id: string; // ID of the purchase map to `purchase`
	date: string; // Date of the publication map to `date`
	screenshot: string; // Screenshot of the publication map to `screenshot`
};
type d1_refund = {
	purchase_id: string; // ID of the purchase map to `purchase`
	date: string; // Date of the refund map to `date`
	refund_date: string; // Refund date map to `refundDate`
	amount: number; // Amount of the refund map to `amount`
};
type d1_internal = {
	d1_testers: d1_tester[];
	d1_id_mappings: d1_id_mapping[];
	d1_purchases: d1_purchase[];
	d1_feedbacks: d1_feedback[];
	d1_publications: d1_publication[];
	d1_refunds: d1_refund[];
};

/**
 * Database implementation for the Cloudflare D1 database
 * Cloudflare D1 database is a distributed SQL database
 * The SQL language used is SQLite
 * The database is hosted on Cloudflare's D1 platform
 * @example
 * ```typescript
 * // env is an object that contains all the environment variables
 * // env.FeedbackFlowD1DB is a binding to the Cloudflare D1 database
 * import { Feedback, Publication, Purchase, Refund, Tester } from "../types/data";
 * // Retrieve Jane Doe's information from the testers table
 * const { results as db_testers } = await this.db.prepare(
 *      "SELECT T.uuid, T.name, I.id FROM testers T LEFT JOIN id_mappings I ON T.uuid = I.tester_uuid WHERE T.name = ?",
 *      )
 *        .bind("Jane Doe")
 *        .all();
 * // Map the results to a Tester object
 * const janeDoe: Tester = {
 *      uuid: db_testers[0].uuid,
 *      name: db_testers[0].name,
 *      ids: db_testers.map((row) => row.id),
 * };
 * ```
 */
export class CloudflareD1DB implements FeedbackFlowDB {
	private db: D1Database;

	constructor(bindings: D1Database) {
		this.db = bindings;
		// Initialize the Cloudflare D1 database connection
	}

	/**
	 * ID mappings operations
	 */
	idMappings: IdMappingsRepository = {
		exists: async (id: string): Promise<boolean> => {
			const { results } = await this.db
				.prepare("SELECT COUNT(*) as count FROM id_mappings WHERE id = ?")
				.bind(id)
				.all();

			return (results[0]?.count as number) > 0;
		},

		/**
		 * Check if multiple IDs exist in the database
		 *
		 * @param ids Array of OAuth IDs to check
		 * @returns Array of IDs that already exist in the database
		 *
		 * Note: This method uses a single SQL query with IN operator
		 * which is more efficient than making multiple separate queries
		 */
		existsMultiple: async (ids: string[]): Promise<string[]> => {
			if (ids.length === 0) return [];

			// Create a temp table with the IDs to check
			const placeholders = ids.map(() => "?").join(",");
			const stmt = this.db.prepare(
				`SELECT id FROM id_mappings WHERE id IN (${placeholders})`,
			);

			// Bind all IDs to the query
			ids.forEach((id, index) => {
				stmt.bind(index + 1, id);
			});

			const { results } = await stmt.all();

			// Return the IDs that exist
			return results.map((row) => row.id as string);
		},

		getTesterUuid: async (id: string): Promise<string | undefined> => {
			const { results } = await this.db
				.prepare("SELECT tester_uuid FROM id_mappings WHERE id = ?")
				.bind(id)
				.all();

			return results.length > 0
				? (results[0].tester_uuid as string)
				: undefined;
		},

		put: async (id: string, testerUuid: string): Promise<boolean> => {
			try {
				await this.db
					.prepare("INSERT INTO id_mappings (id, tester_uuid) VALUES (?, ?)")
					.bind(id, testerUuid)
					.run();

				return true;
			} catch (error) {
				// Failed to insert, likely because ID already exists
				console.error("Error adding ID mapping:", error);

				return false;
			}
		},

		putMultiple: async (
			ids: string[],
			testerUuid: string,
		): Promise<string[]> => {
			if (ids.length === 0) return [];

			const addedIds: string[] = [];

			// We need to run each insert separately since D1 doesn't support multi-value INSERT
			for (const id of ids) {
				try {
					await this.db
						.prepare("INSERT INTO id_mappings (id, tester_uuid) VALUES (?, ?)")
						.bind(id, testerUuid)
						.run();

					addedIds.push(id);
				} catch (error) {
					// This ID probably already exists, skip it
					console.error(`Error adding ID ${id}:`, error);
				}
			}

			return addedIds;
		},

		delete: async (id: string): Promise<boolean> => {
			const result = await this.db
				.prepare("DELETE FROM id_mappings WHERE id = ?")
				.bind(id)
				.run();

			return result.success;
		},

		getAll: async (): Promise<IdMapping[]> => {
			const { results } = await this.db
				.prepare("SELECT id, tester_uuid FROM id_mappings")
				.all();

			return results.map((row) => ({
				id: row.id as string,
				testerUuid: row.tester_uuid as string,
			}));
		},
	};

	/**
	 * Tester-related database operations
	 */
	testers: TestersRepository = {
		find: async (
			fn: (tester: Tester) => boolean,
		): Promise<Tester | undefined> => {
			// Get all testers and filter with the provided function
			const testers = await this.getAllTestersWithIds();

			return testers.find(fn);
		},

		filter: async (fn: (tester: Tester) => boolean): Promise<Tester[]> => {
			// Get all testers and filter with the provided function
			const testers = await this.getAllTestersWithIds();

			return testers.filter(fn);
		},

		put: async (newTester: Tester): Promise<string[]> => {
			let uuid = newTester.uuid;

			// Generate UUID if not provided
			if (!uuid) {
				uuid = uuidv4();
			}

			try {
				// Start a transaction to ensure atomicity of operations
				// (either all operations succeed or none do)
				// TODO: D1 database does not support transactions, so we need to find an alternative
				// await this.db.exec("BEGIN TRANSACTION");

				try {
					// Check if tester exists
					const { results: existingTester } = await this.db
						.prepare("SELECT uuid FROM testers WHERE uuid = ?")
						.bind(uuid)
						.all();

					if (existingTester.length > 0) {
						// Update existing tester
						await this.db
							.prepare("UPDATE testers SET name = ? WHERE uuid = ?")
							.bind(newTester.name, uuid)
							.run();

						// Get current IDs for this tester
						const { results: currentIds } = await this.db
							.prepare("SELECT id FROM id_mappings WHERE tester_uuid = ?")
							.bind(uuid)
							.all();

						const currentIdSet = new Set(
							currentIds.map((row) => row.id as string),
						);

						// Remove IDs that are no longer associated with this tester
						for (const id of currentIdSet) {
							if (!newTester.ids.includes(id)) {
								await this.db
									.prepare("DELETE FROM id_mappings WHERE id = ?")
									.bind(id)
									.run();
							}
						}
					} else {
						// Insert new tester
						await this.db
							.prepare("INSERT INTO testers (uuid, name) VALUES (?, ?)")
							.bind(uuid, newTester.name)
							.run();
					}

					// Add new IDs
					// Utilisation de INSERT OR IGNORE pour éviter les erreurs si l'ID existe déjà
					for (const id of newTester.ids) {
						await this.db
							.prepare(
								"INSERT OR IGNORE INTO id_mappings (id, tester_uuid) VALUES (?, ?)",
							)
							.bind(id, uuid)
							.run();
					}

					// Commit transaction
					// TODO: D1 database does not support transactions, so we need to find an alternative
					// await this.db.exec("COMMIT");

					return newTester.ids;
				} catch (error) {
					// Rollback on error
					// TODO: D1 database does not support transactions, so we need to find an alternative
					await this.db.exec("-- ROLLBACK");
					throw error;
				}
			} catch (error) {
				console.error("Error adding/updating tester:", error);
				throw error;
			}
		},

		getAll: async (): Promise<Tester[]> => {
			return this.getAllTestersWithIds();
		},

		getTesterWithId: async (id: string): Promise<Tester | undefined> => {
			const testerUuid = await this.idMappings.getTesterUuid(id);

			if (!testerUuid) return undefined;

			return this.testers.getTesterWithUuid(testerUuid);
		},

		getTesterWithUuid: async (uuid: string): Promise<Tester | undefined> => {
			const { results } = await this.db
				.prepare("SELECT uuid, name FROM testers WHERE uuid = ?")
				.bind(uuid)
				.all();

			if (results.length === 0) return undefined;

			// Get the tester's IDs
			const { results: idResults } = await this.db
				.prepare("SELECT id FROM id_mappings WHERE tester_uuid = ?")
				.bind(uuid)
				.all();

			return {
				uuid: results[0].uuid as string,
				name: results[0].name as string,
				ids: idResults.map((row) => row.id as string),
			};
		},

		addIds: async (
			uuid: string,
			ids: string[],
		): Promise<string[] | undefined> => {
			// Check if tester exists
			const { results } = await this.db
				.prepare("SELECT uuid FROM testers WHERE uuid = ?")
				.bind(uuid)
				.all();

			if (results.length === 0) return undefined;

			// Add new IDs
			const addedIds: string[] = [];

			for (const id of ids) {
				try {
					await this.db
						.prepare("INSERT INTO id_mappings (id, tester_uuid) VALUES (?, ?)")
						.bind(id, uuid)
						.run();

					addedIds.push(id);
				} catch (error) {
					// This ID probably already exists, skip it
					console.error(`Error adding ID ${id}:`, error);
				}
			}

			// Get all IDs for this tester to return
			const { results: allIds } = await this.db
				.prepare("SELECT id FROM id_mappings WHERE tester_uuid = ?")
				.bind(uuid)
				.all();

			return allIds.map((row) => row.id as string);
		},
	};

	/**
	 * Purchase-related database operations
	 */
	purchases: PurchasesRepository = {
		find: async (
			fn: (purchase: Purchase) => boolean,
		): Promise<Purchase | undefined> => {
			const purchases = await this.getAllPurchases();

			return purchases.find(fn);
		},

		filter: async (
			fn: (purchase: Purchase) => boolean,
		): Promise<Purchase[]> => {
			const purchases = await this.getAllPurchases();

			return purchases.filter(fn);
		},

		put: async (testerUuid: string, newPurchase: Purchase): Promise<string> => {
			let id = newPurchase.id;

			if (!id) {
				id = uuidv4();
			}

			await this.db
				.prepare(
					`
          INSERT INTO purchases 
          (id, tester_uuid, date, order_number, description, amount, screenshot, refunded)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
				)
				.bind(
					id,
					testerUuid,
					newPurchase.date,
					newPurchase.order,
					newPurchase.description,
					newPurchase.amount,
					newPurchase.screenshot,
					newPurchase.refunded ? 1 : 0,
				)
				.run();

			return id;
		},

		update: async (
			id: string,
			updates: Partial<Purchase>,
		): Promise<boolean> => {
			// Construction dynamique de la requête UPDATE en fonction des champs à mettre à jour
			// Cette approche évite d'avoir à écrire une requête différente pour chaque combinaison de champs
			const updateFields: string[] = [];
			const params: any[] = [];

			// For each potentially modifiable field, check if it's present in the updates object
			// If yes, add the field to the list of fields to update and the value to the parameters
			if (updates.date !== undefined) {
				updateFields.push("date = ?");
				params.push(updates.date);
			}

			if (updates.order !== undefined) {
				updateFields.push("order_number = ?"); // Mapping between 'order' in the object and 'order_number' in DB
				params.push(updates.order);
			}

			if (updates.description !== undefined) {
				updateFields.push("description = ?");
				params.push(updates.description);
			}

			if (updates.amount !== undefined) {
				updateFields.push("amount = ?");
				params.push(updates.amount);
			}

			if (updates.screenshot !== undefined) {
				updateFields.push("screenshot = ?");
				params.push(updates.screenshot);
			}

			if (updates.refunded !== undefined) {
				updateFields.push("refunded = ?");
				params.push(updates.refunded ? 1 : 0); // Conversion du booléen en 0/1 pour D1/SQLite
			}

			// Si aucun champ n'est à mettre à jour, retourner false
			if (updateFields.length === 0) {
				return false; // Nothing to update
			}

			// Add the ID as a parameter for the WHERE clause
			params.push(id);

			// Construct the complete SQL query
			const sql = `UPDATE purchases SET ${updateFields.join(", ")} WHERE id = ?`;

			console.log("SQL:", sql);

			// Prepare the statement
			const stmt = this.db.prepare(sql);

			// Bind the parameters
			params.forEach((param, index) => {
				stmt.bind(index + 1, param);
			});

			// Execute the update
			const result = await stmt.run();

			return result.success;
		},

		getAll: async (): Promise<Purchase[]> => {
			return this.getAllPurchases();
		},

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
		): Promise<PurchaseStatus[]> => {
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
			if (sort && !["order", "date"].includes(sort)) {
				throw new Error("Sort must be 'date' or 'order'");
			}
			if (!sort) {
				sort = "date"; // Default sort on date
			}
			if (!order) {
				order = "desc"; // Default order DESC
			}
			if (!["desc", "asc"].includes(order)) {
				throw new Error("Invalid order field");
			}
			let limitToNotRefundedQuery = "";

			if (limitToNotRefunded) {
				limitToNotRefundedQuery = "AND refunded = 0";
			}

			// Pagination logic
			const offset = page && limit ? (page - 1) * limit : 0;

			const preparedStatement = this.db
				.prepare(
					`SELECT * FROM purchase_status WHERE tester_uuid = ? ${limitToNotRefundedQuery} ORDER BY ${sort} ${order.toUpperCase()} LIMIT ? OFFSET ?`,
				)
				.bind(testerUuid, limit, offset);

			const { results } = await preparedStatement.all();

			return results.map(
				(row) =>
					({
						purchase: row.id as string,
						testerUuid: row.tester_uuid as string,
						date: row.date as string,
						order: row.order_number as string,
						description: row.description as string,
						amount: row.amount as number,
						refunded: Boolean(row.refunded),
						hasFeedback: Boolean(row.has_feedback),
						hasPublication: Boolean(row.has_publication),
						hasRefund: Boolean(row.has_refund),
						publicationScreenshot: row.publication_screenshot as string,
						purchaseScreenshot: row.purchase_screenshot as string,
					}) as PurchaseStatus,
			);
		},
	};

	/**
	 * Feedback-related database operations
	 */
	feedbacks: FeedbacksRepository = {
		find: async (
			fn: (feedback: Feedback) => boolean,
		): Promise<Feedback | undefined> => {
			const feedbacks = await this.getAllFeedbacks();

			return feedbacks.find(fn);
		},

		filter: async (
			fn: (feedback: Feedback) => boolean,
		): Promise<Feedback[]> => {
			const feedbacks = await this.getAllFeedbacks();

			return feedbacks.filter(fn);
		},

		put: async (testerId: string, newFeedback: Feedback): Promise<string> => {
			await this.db
				.prepare(
					`
          INSERT INTO feedbacks (purchase_id, date, feedback)
          VALUES (?, ?, ?)
        `,
				)
				.bind(newFeedback.purchase, newFeedback.date, newFeedback.feedback)
				.run();

			return newFeedback.purchase;
		},

		getAll: async (): Promise<Feedback[]> => {
			return this.getAllFeedbacks();
		},
	};

	/**
	 * Publication-related database operations
	 */
	publications: PublicationsRepository = {
		find: async (
			fn: (publication: Publication) => boolean,
		): Promise<Publication | undefined> => {
			const publications = await this.getAllPublications();

			return publications.find(fn);
		},

		filter: async (
			fn: (publication: Publication) => boolean,
		): Promise<Publication[]> => {
			const publications = await this.getAllPublications();

			return publications.filter(fn);
		},

		put: async (
			testerId: string,
			newPublication: Publication,
		): Promise<string> => {
			await this.db
				.prepare(
					`
          INSERT INTO publications (purchase_id, date, screenshot)
          VALUES (?, ?, ?)
        `,
				)
				.bind(
					newPublication.purchase,
					newPublication.date,
					newPublication.screenshot,
				)
				.run();

			return newPublication.purchase;
		},

		getAll: async (): Promise<Publication[]> => {
			return this.getAllPublications();
		},
	};

	/**
	 * Refund-related database operations
	 */
	refunds: RefundsRepository = {
		find: async (
			fn: (refund: Refund) => boolean,
		): Promise<Refund | undefined> => {
			const refunds = await this.getAllRefunds();

			return refunds.find(fn);
		},

		filter: async (fn: (refund: Refund) => boolean): Promise<Refund[]> => {
			const refunds = await this.getAllRefunds();

			return refunds.filter(fn);
		},

		/**
		 * Add a new refund to the database
		 *
		 * This operation uses a transaction to ensure both:
		 * 1. The refund is inserted into the refunds table
		 * 2. The associated purchase is marked as refunded
		 *
		 * If either operation fails, the entire transaction is rolled back
		 * to prevent data inconsistency.
		 */
		put: async (testerId: string, newRefund: Refund): Promise<string> => {
			try {
				// Start a transaction to ensure atomicity of operations
				// (either all operations succeed or none do)
				// TODO: D1 database does not support transactions, so we need to find an alternative
				// await this.db.exec("BEGIN TRANSACTION");

				// Insert the refund
				await this.db
					.prepare(
						`
            INSERT INTO refunds (purchase_id, date, refund_date, amount)
            VALUES (?, ?, ?, ?)
          `,
					)
					.bind(
						newRefund.purchase,
						newRefund.date,
						newRefund.refundDate,
						newRefund.amount,
					)
					.run();

				// Update the purchase to mark it as refunded
				await this.db
					.prepare("UPDATE purchases SET refunded = 1 WHERE id = ?")
					.bind(newRefund.purchase)
					.run();

				// Commit the transaction
				// TODO: D1 database does not support transactions, so we need to find an alternative
				// await this.db.exec("COMMIT");

				return newRefund.purchase;
			} catch (error) {
				// Rollback on error
				// TODO: D1 database does not support transactions, so we need to find an alternative
				await this.db.exec("-- ROLLBACK");
				console.error("Error adding refund:", error);
				throw error;
			}
		},

		getAll: async (): Promise<Refund[]> => {
			return this.getAllRefunds();
		},
	};

	/**
	 * Helper methods
	 */

	/**
	 * Get all testers with their IDs
	 * This query performs:
	 * 1. A join between the testers and id_mappings tables
	 * 2. GROUP_CONCAT to combine all IDs of a tester into a single string
	 * 3. Grouping by UUID to get a single record per tester
	 *
	 * Note: This is more efficient than making multiple queries and joining the results in JavaScript
	 */
	private async getAllTestersWithIds(): Promise<Tester[]> {
		// This query gets all testers and their IDs
		const { results } = await this.db
			.prepare(
				`
		  SELECT t.uuid, t.name, GROUP_CONCAT(i.id) as ids
		  FROM testers t
		  LEFT JOIN id_mappings i ON t.uuid = i.tester_uuid
		  GROUP BY t.uuid
		`,
			)
			.all();

		// Transform results into Tester objects
		// Convert the concatenated IDs string into an array
		return results.map((row) => ({
			uuid: row.uuid as string,
			name: row.name as string,
			ids: row.ids ? (row.ids as string).split(",") : [],
		}));
	}

	/**
	 * Get all purchases from the database
	 *
	 * This method maps database column names to the Purchase interface properties,
	 * including renaming database columns like 'order_number' to 'order' and
	 * converting SQLite's 0/1 integers to JavaScript booleans for 'refunded'.
	 */
	private async getAllPurchases(): Promise<Purchase[]> {
		const { results } = await this.db
			.prepare(
				`
        SELECT 
          id, 
          tester_uuid as testerUuid, 
          date, 
          order_number as "order", 
          description, 
          amount, 
          screenshot, 
          refunded
        FROM purchases
      `,
			)
			.all();

		return results.map((row) => ({
			id: row.id as string,
			testerUuid: row.testerUuid as string,
			date: row.date as string,
			order: row.order as string,
			description: row.description as string,
			amount: row.amount as number,
			screenshot: row.screenshot as string,
			refunded: Boolean(row.refunded),
		}));
	}

	/**
	 * Get all feedbacks
	 */
	private async getAllFeedbacks(): Promise<Feedback[]> {
		const { results } = await this.db
			.prepare(
				`
        SELECT purchase_id as purchase, date, feedback
        FROM feedbacks
      `,
			)
			.all();

		return results.map((row) => ({
			purchase: row.purchase as string,
			date: row.date as string,
			feedback: row.feedback as string,
		}));
	}

	/**
	 * Get all publications
	 */
	private async getAllPublications(): Promise<Publication[]> {
		const { results } = await this.db
			.prepare(
				`
        SELECT purchase_id as purchase, date, screenshot
        FROM publications
      `,
			)
			.all();

		return results.map((row) => ({
			purchase: row.purchase as string,
			date: row.date as string,
			screenshot: row.screenshot as string,
		}));
	}

	/**
	 * Get all refunds
	 */
	private async getAllRefunds(): Promise<Refund[]> {
		const { results } = await this.db
			.prepare(
				`
        SELECT purchase_id as purchase, date, refund_date as refundDate, amount
        FROM refunds
      `,
			)
			.all();

		return results.map((row) => ({
			purchase: row.purchase as string,
			date: row.date as string,
			refundDate: row.refundDate as string,
			amount: row.amount as number,
		}));
	}

	/**
	 * Reset the database (not recommended for production but useful for testing)
	 *
	 * @throws {Error} Always throws an error as this operation is not supported in Cloudflare D1
	 */
	async reset(_newData: any): Promise<void> {
		throw new Error(
			"Not implemented for Cloudflare D1. Use database migrations instead.",
		);
	}

	/**
	 * Get raw data (not recommended for production but useful for testing)
	 *
	 * @throws {Error} Always throws an error as this operation is not supported in Cloudflare D1
	 */
	async getRawData(): Promise<any> {
		throw new Error(
			"Not implemented for Cloudflare D1. Use database queries instead.",
		);
	}

	/**
	 * Backup the database to a JSON string
	 * ATTENTION: This method is not recommended for production use because Cloudflare D1 is charged based on data usage
	 *
	 * @returns JSON string containing the entire database contents
	 */
	async backupToJson(): Promise<string> {
		const statements = [
			"SELECT * FROM testers",
			"SELECT * FROM id_mappings",
			"SELECT * FROM purchases",
			"SELECT * FROM feedbacks",
			"SELECT * FROM publications",
			"SELECT * FROM refunds",
		];
		const preparedStatements = statements.map((stmt) => this.db.prepare(stmt));
		const results = await this.db.batch(preparedStatements);

		// Map the database results to the corresponding types
		// This is necessary because D1 returns the results in a generic format
		// and we need to convert them to the specific types we use in our application
		const db_testers = results[0].results as d1_tester[];
		const db_idMappings = results[1].results as d1_id_mapping[];
		const db_purchases = results[2].results as d1_purchase[];
		const db_feedbacks = results[3].results as d1_feedback[];
		const db_publications = results[4].results as d1_publication[];
		const db_refunds = results[5].results as d1_refund[];

		const idMappings: IdMapping[] = db_idMappings.map((row) => ({
			id: row.id as string,
			testerUuid: row.tester_uuid as string,
		}));

		const testers: Tester[] = db_testers.map((row) => ({
			uuid: row.uuid as string,
			name: row.name as string,
			// ids are coming from the id_mappings table we need to find the corresponding IDs in the idMappings array
			ids: idMappings
				.filter((idMapping) => idMapping.testerUuid === row.uuid)
				.map((idMapping) => idMapping.id),
		}));

		const purchases: Purchase[] = db_purchases.map((row) => ({
			id: row.id as string,
			testerUuid: row.tester_uuid as string,
			date: row.date as string,
			order: row.order_number as string,
			description: row.description as string,
			amount: row.amount as number,
			screenshot: row.screenshot as string,
			refunded: Boolean(row.refunded),
		}));
		const feedbacks: Feedback[] = db_feedbacks.map((row) => ({
			purchase: row.purchase_id as string,
			date: row.date as string,
			feedback: row.feedback as string,
		}));
		const publications: Publication[] = db_publications.map((row) => ({
			purchase: row.purchase_id as string,
			date: row.date as string,
			screenshot: row.screenshot as string,
		}));
		const refunds: Refund[] = db_refunds.map((row) => ({
			purchase: row.purchase_id as string,
			date: row.date as string,
			refundDate: row.refund_date as string,
			amount: row.amount as number,
		}));
		// Create a backup object
		const backup = {
			testers,
			ids: idMappings,
			purchases,
			feedbacks,
			publications,
			refunds,
		};

		return JSON.stringify(backup);
	}

	// ATTENTION: This method is not recommended for production use because Cloudflare D1 is charged based on data usage
	// TODO: create some tests to verify the data is correctly restored
	async restoreFromJsonString(
		_backup: string,
	): Promise<{ success: boolean; message?: string }> {
		const backup = JSON.parse(_backup);

		// console.log("Restoring database from backup:", backup);
		// Check if the backup is valid
		if (!backup) {
			console.error("Parsing error: Invalid backup data");
			throw new Error("Parsing error: Invalid backup data");
		}
		if (!backup.testers) {
			console.error("Parsing error: Missing testers data");
			throw new Error("Parsing error: Missing testers data");
		}
		if (!backup.ids) {
			console.error("Parsing error: Missing IDs data");
			throw new Error("Parsing error: Missing IDs data");
		}
		if (!backup.purchases) {
			console.error("Parsing error: Missing purchases data");
			throw new Error("Parsing error: Missing purchases data");
		}
		if (!backup.feedbacks) {
			console.error("Parsing error: Missing feedbacks data");
			throw new Error("Parsing error: Missing feedbacks data");
		}
		if (!backup.publications) {
			console.error("Parsing error: Missing publications data");
			throw new Error("Parsing error: Missing publications data");
		}
		if (!backup.refunds) {
			console.error("Parsing error: Missing refunds data");
			throw new Error("Parsing error: Missing refunds data");
		}
		const { testers, ids, purchases, feedbacks, publications, refunds } =
			backup;
		const dbCleanupStatements = [
			"DELETE FROM testers",
			"DELETE FROM id_mappings",
			"DELETE FROM purchases",
			"DELETE FROM feedbacks",
			"DELETE FROM publications",
			"DELETE FROM refunds",
		];

		// Map the data to the database types
		// const db_testers: d1_tester[] = testers.map((tester: Tester) => ({
		// 	uuid: tester.uuid,
		// 	name: tester.name,
		// }));
		// const db_idMappings: d1_id_mapping[] = ids.map((id: IdMapping) => ({
		// 	id: id.id,
		// 	tester_uuid: id.testerUuid,
		// }));
		// const db_purchases: d1_purchase[] = purchases.map((purchase: Purchase) => ({
		// 	id: purchase.id,
		// 	tester_uuid: purchase.testerUuid,
		// 	date: purchase.date,
		// 	order_number: purchase.order,
		// 	description: purchase.description,
		// 	amount: purchase.amount,
		// 	screenshot: purchase.screenshot,
		// 	refunded: purchase.refunded ? 1 : 0,
		// }));
		// const db_feedbacks: d1_feedback[] = feedbacks.map((feedback: Feedback) => ({
		// 	purchase_id: feedback.purchase,
		// 	date: feedback.date,
		// 	feedback: feedback.feedback,
		// }));
		// const db_publications: d1_publication[] = publications.map(
		// 	(publication: Publication) => ({
		// 		purchase_id: publication.purchase,
		// 		date: publication.date,
		// 		screenshot: publication.screenshot,
		// 	}),
		// );
		// const db_refunds: d1_refund[] = refunds.map((refund: Refund) => ({
		// 	purchase_id: refund.purchase,
		// 	date: refund.date,
		// 	refund_date: refund.refundDate,
		// 	amount: refund.amount,
		// }));
		// console.log("DB Testers:", db_testers);
		// console.log("DB ID Mappings:", db_idMappings);
		// console.log("DB Purchases:", db_purchases);
		// console.log("DB Feedbacks:", db_feedbacks);
		// console.log("DB Publications:", db_publications);
		// console.log("DB Refunds:", db_refunds);

		// Insert the data back into the database
		const dbInsertStatements = [
			`INSERT INTO testers (uuid, name) VALUES ${testers
				.map((tester: Tester) => `('${tester.uuid}', '${tester.name}')`)
				.join(", ")}`,
			`INSERT INTO id_mappings (id, tester_uuid) VALUES ${ids
				.map((id: IdMapping) => `('${id.id}', '${id.testerUuid}')`)
				.join(", ")}`,
			`INSERT INTO purchases (id, tester_uuid, date, order_number, description, amount, screenshot, refunded) VALUES ${purchases
				.map(
					(purchase: Purchase) =>
						`('${purchase.id}', '${purchase.testerUuid}', '${purchase.date}', '${purchase.order}', '${purchase.description}', ${purchase.amount}, '${purchase.screenshot}', ${
							purchase.refunded ? 1 : 0
						})`,
				)
				.join(", ")}`,
			`INSERT INTO feedbacks (purchase_id, date, feedback) VALUES ${feedbacks
				.map(
					(feedback: Feedback) =>
						`('${feedback.purchase}', '${feedback.date}', '${feedback.feedback}')`,
				)
				.join(", ")}`,
			`INSERT INTO publications (purchase_id, date, screenshot) VALUES ${publications
				.map(
					(publication: Publication) =>
						`('${publication.purchase}', '${publication.date}', '${publication.screenshot}')`,
				)
				.join(", ")}`,
			`INSERT INTO refunds (purchase_id, date, refund_date, amount) VALUES ${refunds
				.map(
					(refund: Refund) =>
						`('${refund.purchase}', '${refund.date}', '${refund.refundDate}', ${refund.amount})`,
				)
				.join(", ")}`,
		];
		const globalStatements = [
			dbCleanupStatements,
			...dbInsertStatements,
		].flat();
		const preparedStatements = globalStatements.map((stmt) =>
			this.db.prepare(stmt),
		);

		try {
			console.log("Executing batch insert...");
			const result = await this.db.batch(
				preparedStatements.map((stmt) => stmt.bind()),
			);

			return {
				success: result.map((r) => r.success).every((r) => r),
				message: JSON.stringify(result),
			};
		} catch (error) {
			console.error("Error during batch insert:", error);
			throw new Error("Error during batch insert");
		}
	}
}
