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

import { useState, useCallback, useRef } from "react";
import { searchPurchases } from "@/utilities/search";
import { useSecuredApi } from "@/components/auth0";

/**
 * Hook for managing purchase search
 * @param onSearchResults Callback when search results are received
 * @returns Object with search function and state
 */
export function usePurchaseSearch(
    onSearchResults: (results: string[]) => void
) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const { postJson } = useSecuredApi();

    const performSearch = useCallback(
        async (query: string) => {
            if (query.length < 4) {
                onSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const results = await searchPurchases(postJson, query, 50);
                onSearchResults(results);
            } catch (error) {
                console.error("Search error:", error);
                onSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        },
        [onSearchResults, postJson]
    );

    const handleSearchChange = useCallback(
        (query: string) => {
            setSearchQuery(query);

            // Clear existing timeout
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Set new timeout for debounced search
            debounceTimerRef.current = setTimeout(() => {
                performSearch(query);
            }, 500); // 500ms debounce
        },
        [performSearch]
    );

    const clearSearch = useCallback(() => {
        setSearchQuery("");
        onSearchResults([]);
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
    }, [onSearchResults]);

    return {
        searchQuery,
        isSearching,
        handleSearchChange,
        clearSearch,
        performSearch,
    };
}
