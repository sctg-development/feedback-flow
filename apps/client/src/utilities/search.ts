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
 * Debounce function to limit the rate of function calls
 * @param func The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Search purchases by query using the API
 * This function requires authentication and should be called with postJson from useSecuredApi
 * @param postJson The postJson function from useSecuredApi hook
 * @param query The search query
 * @param limit Maximum number of results (default 50)
 * @returns Array of purchase IDs matching the query
 */
export async function searchPurchases(
  postJson: (url: string, data: unknown) => Promise<unknown>,
  query: string,
  limit: number = 50,
): Promise<string[]> {
  try {
    const data = (await postJson(
      `${import.meta.env.API_BASE_URL}/purchase/search`,
      {
        query,
        limit,
      },
    )) as Record<string, unknown>;

    if (!data.success) {
      console.error("Search failed:", data.error);

      return [];
    }

    return (data.data as string[]) || [];
  } catch (error) {
    console.error("Error searching purchases:", error);

    return [];
  }
}
