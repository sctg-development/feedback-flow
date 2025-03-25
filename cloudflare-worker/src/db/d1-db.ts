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
	RefundsRepository,
	TestersRepository,
} from "./db-type";

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
				await this.db.exec("BEGIN TRANSACTION");

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
					await this.db.exec("COMMIT");

					return newTester.ids;
				} catch (error) {
					// Rollback on error
					await this.db.exec("ROLLBACK");
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

		put: async (testerId: string, newRefund: Refund): Promise<string> => {
			try {
				// Start a transaction to ensure atomicity of operations
				// (either all operations succeed or none do)
				await this.db.exec("BEGIN TRANSACTION");

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
						newRefund.refunddate,
						newRefund.amount,
					)
					.run();

				// Update the purchase to mark it as refunded
				await this.db
					.prepare("UPDATE purchases SET refunded = 1 WHERE id = ?")
					.bind(newRefund.purchase)
					.run();

				// Commit the transaction
				await this.db.exec("COMMIT");

				return newRefund.purchase;
			} catch (error) {
				// Rollback on error
				await this.db.exec("ROLLBACK");
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
	 * Get all purchases
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
        SELECT purchase_id as purchase, date, refund_date as refunddate, amount
        FROM refunds
      `,
			)
			.all();

		return results.map((row) => ({
			purchase: row.purchase as string,
			date: row.date as string,
			refunddate: row.refunddate as string,
			amount: row.amount as number,
		}));
	}

	/**
	 * Reset the database (not recommended for production but useful for testing)
	 *
	 * @throws {Error} Always throws an error as this operation is not supported in Cloudflare D1
	 */
	async reset(newData: any): Promise<void> {
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
}
