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

import { useState, useEffect, useCallback } from "react";
import { PurchaseStatus } from "@/types/db";
import { useSecuredApi } from "@/components/auth0";

interface UseSearchResultsProps {
    searchResults: string[];
    isActive: boolean;
}

interface SearchResultData {
    data: PurchaseStatus[];
    isLoading: boolean;
    error: string | null;
}

/**
 * Hook to fetch purchase data for search results using the batch API
 * @param searchResults Array of purchase IDs from search
 * @param isActive Whether the search is active
 * @returns Object with data, loading state, and error
 */
export function useSearchResults({
    searchResults,
    isActive,
}: UseSearchResultsProps): SearchResultData {
    const [data, setData] = useState<PurchaseStatus[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { postJson } = useSecuredApi();

    const fetchSearchResults = useCallback(async () => {
        if (!isActive || searchResults.length === 0) {
            setData([]);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const responseData = (await postJson(
                `${import.meta.env.API_BASE_URL}/purchase-status-batch`,
                {
                    purchaseIds: searchResults,
                    page: 1,
                    limit: 1000,
                },
            )) as Record<string, unknown>;

            if (responseData && (responseData.success as boolean) && Array.isArray(responseData.data)) {
                setData((responseData.data as PurchaseStatus[]) || []);
            } else {
                setError("Invalid response format");
            }
        } catch (err) {
            console.error("Error fetching search results:", err);
            setError(err instanceof Error ? err.message : "Unknown error");
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchResults, isActive]);

    useEffect(() => {
        fetchSearchResults();
    }, [fetchSearchResults]);

    return { data, isLoading, error };
}
