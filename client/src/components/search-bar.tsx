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

import { Input } from "@heroui/input";
import { Kbd } from "@heroui/kbd";
import { useTranslation } from "react-i18next";
import { SearchIcon } from "@/components/icons";
import { usePurchaseSearch } from "@/hooks/usePurchaseSearch";
import { useSearch } from "@/context/SearchContext";
import { AuthenticationGuardWithPermission } from "./auth0";

interface SearchBarProps {
    onSearchResults?: (results: string[]) => void;
}

export const SearchBar = ({ onSearchResults }: SearchBarProps) => {
    const { t } = useTranslation();
    const { setSearchResults, setSearchQuery } = useSearch();

    const handleSearchResultsReceived = (results: string[]) => {
        setSearchResults(results);
        onSearchResults?.(results);
    };

    const { searchQuery, isSearching, handleSearchChange, clearSearch } =
        usePurchaseSearch(handleSearchResultsReceived);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        handleSearchChange(e.target.value);
    };

    const handleClear = () => {
        clearSearch();
        setSearchQuery("");
    };

    return (
        <AuthenticationGuardWithPermission
            key={`nav-search`}
            permission="search:api">
            <Input
                aria-label={t("search")}
                classNames={{
                    inputWrapper: "bg-default-100",
                    input: "text-sm",
                }}
                endContent={
                    <Kbd className="hidden lg:inline-block" keys={["command"]}>
                        K
                    </Kbd>
                }
                labelPlacement="outside"
                placeholder={`${t("search")}…`}
                startContent={
                    <SearchIcon className="text-base text-default-400 pointer-events-none flex-shrink-0" />
                }
                type="search"
                value={searchQuery}
                isDisabled={isSearching}
                onChange={handleChange}
                onClear={handleClear}
                isClearable
            />
        </AuthenticationGuardWithPermission>
    );
};
