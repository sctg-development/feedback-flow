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
 * Normalizes a string by:
 * - Converting to lowercase
 * - Removing accents
 * - Replacing common punctuation variations (point to comma, etc.)
 *
 * @param text - The text to normalize
 * @returns The normalized text
 */
export function normalizeText(text: string): string {
    return (
        text
            // Convert to lowercase
            .toLowerCase()
            // Normalize accents using NFD (decomposed form)
            .normalize("NFD")
            // Remove combining diacritical marks
            .replace(/[\u0300-\u036f]/g, "")
            // Replace common punctuation variations
            .replace(/[.,]/g, " ")
            // Remove extra whitespace
            .trim()
    );
}

/**
 * Calculates Levenshtein distance between two strings
 * Used to measure how different two strings are
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns The distance (0 = identical)
 */
function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
        .fill(null)
        .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }

    return dp[m][n];
}

/**
 * Calculates a similarity score between two normalized strings
 * Returns a score between 0 and 1, where 1 is identical
 *
 * @param normalized1 - First normalized string
 * @param normalized2 - Second normalized string
 * @returns Similarity score (0-1)
 */
export function calculateSimilarity(normalized1: string, normalized2: string): number {
    if (normalized1 === normalized2) return 1;
    if (!normalized1 || !normalized2) return 0;

    const maxLength = Math.max(normalized1.length, normalized2.length);
    const distance = levenshteinDistance(normalized1, normalized2);
    return 1 - distance / maxLength;
}

/**
 * Performs fuzzy search on a text field
 * Supports:
 * - Case-insensitive matching
 * - Accent-insensitive matching
 * - Partial word matching
 * - Tolerance for character differences
 *
 * @param query - The search query
 * @param text - The text to search in
 * @param threshold - Minimum similarity score (0-1, default 0.6)
 * @returns True if match found
 */
export function fuzzyMatch(
    query: string,
    text: string,
    threshold: number = 0.6,
): boolean {
    if (!query || !text) return false;

    const normalizedQuery = normalizeText(query);
    const normalizedText = normalizeText(text);

    // Check for exact substring match first (most common case)
    if (normalizedText.includes(normalizedQuery)) return true;

    // Split both into words for partial matching
    const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 0);
    const textWords = normalizedText.split(/\s+/).filter((w) => w.length > 0);

    // Check if any query word matches any text word with similarity threshold
    for (const qWord of queryWords) {
        let found = false;
        for (const tWord of textWords) {
            const similarity = calculateSimilarity(qWord, tWord);
            if (similarity >= threshold) {
                found = true;
                break;
            }
        }
        if (!found) return false;
    }

    return true;
}

/**
 * Searches through multiple fields in an object
 *
 * @param query - The search query
 * @param fields - Object with field names and values
 * @param threshold - Minimum similarity score
 * @returns True if match found in any field
 */
export function fuzzySearchFields(
    query: string,
    fields: Record<string, string | number>,
    threshold?: number,
): boolean {
    return Object.values(fields).some((value) =>
        fuzzyMatch(query, String(value), threshold),
    );
}
