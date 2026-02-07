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
import { CloudflareD1DB } from "./d1-db";
import { InMemoryDB } from "./in-memory-db";
import { FeedbackFlowDB } from "../types/db-types";

// Export all types from the shared db-types file
export * from "../types/db-types";

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
		// Initialize the database based on env.DB_BACKEND
		dbInstance =
			env.DB_BACKEND !== "memory"
				? (new CloudflareD1DB(env.FeedbackFlowDB) as FeedbackFlowDB)
				: (new InMemoryDB(mockData) as FeedbackFlowDB);

		console.log(`Database initialized with backend: ${env.DB_BACKEND}`);
	}

	return dbInstance;
}
