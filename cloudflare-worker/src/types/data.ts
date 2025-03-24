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
}

// Feedback information
export interface Feedback {
	date: string;
	purchase: string; // Foreign key to purchase.id
	feedback: string;
}

// Publication information
export interface Publication {
	date: string;
	purchase: string; // Foreign key to purchase.id
	screenshot: string;
}

// Refund information
export interface Refund {
	date: string;
	purchase: string; // Foreign key to purchase.id
	refunddate: string;
	amount: number;
}

// Complete mock database structure
export interface MockDatabase {
	testers: Tester[];
	purchases: Purchase[];
	feedbacks: Feedback[];
	publications: Publication[];
	refunds: Refund[];
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
	refunddate: string;
	amount: number;
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

// Define valid sort keys and default to 'date' if invalid
export const validSortKeys = [
	"id",
	"date",
	"order",
	"description",
	"amount",
] as const;
export type SortKey = (typeof validSortKeys)[number];
