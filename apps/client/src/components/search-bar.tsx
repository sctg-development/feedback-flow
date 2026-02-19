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
import { Button, ButtonGroup } from "@heroui/button";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { AuthenticationGuardWithPermission } from "./auth0";

import { SearchIcon, TrashIcon } from "@/components/icons";
import { usePurchaseSearch } from "@/hooks/usePurchaseSearch";
import { useSearch } from "@/context/SearchContext";

interface SearchBarProps {
  onSearchResults?: (results: string[]) => void;
  onClear?: () => void;
}

export const SearchBar = ({ onSearchResults, onClear }: SearchBarProps) => {
  const { t } = useTranslation();
  const {
    setSearchResults,
    setSearchQuery,
    clearSearch: clearSearchContext,
  } = useSearch();

  // Clear search context when component mounts (only once)
  useEffect(() => {
    clearSearchContext();
  }, []);

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
    clearSearchContext();
    onClear?.();
  };

  return (
    <AuthenticationGuardWithPermission
      key={`nav-search`}
      permission="search:api"
    >
      <ButtonGroup>
        <Input
          isClearable
          aria-label={t("search")}
          classNames={{
            inputWrapper:
              "bg-default-100 rounded-lg rounded-r-none rtl:rounded-lg rtl:rounded-l-none",
            input: "text-sm",
          }}
          endContent={
            <Kbd className="hidden lg:inline-block" keys={["command"]}>
              K
            </Kbd>
          }
          isDisabled={isSearching}
          labelPlacement="outside"
          placeholder={`${t("search")}…`}
          startContent={
            <SearchIcon className="text-base text-default-400 pointer-events-none shrink-0" />
          }
          type="search"
          value={searchQuery}
          onChange={handleChange}
          onClear={handleClear}
        />
        <Button
          isIconOnly
          className="rounded-lg rounded-l-none rtl:rounded-lg rtl:rounded-r-none"
          color="default"
          title={t("reset")}
          variant="flat"
          onPress={handleClear}
        >
          <TrashIcon />
        </Button>
      </ButtonGroup>
    </AuthenticationGuardWithPermission>
  );
};
