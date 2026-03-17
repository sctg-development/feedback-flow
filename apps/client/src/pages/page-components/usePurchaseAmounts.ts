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

import { useState, useEffect } from "react";

import { useSecuredApi } from "@/components/auth0";

/**
 * Custom React Hook: usePurchaseAmounts
 *
 * This hook manages the calculation and fetching of purchase amounts for display in the UI.
 * It handles both refunded and non-refunded purchase amounts, updating them based on
 * the current view toggle and refresh triggers.
 *
 * Purpose:
 * - Fetch and maintain purchase amount totals from the API
 * - Handle different amount calculations based on view mode (all purchases vs non-refunded only)
 * - Provide reactive updates when data changes or refreshes
 * - Centralize amount-related logic for reuse across components
 *
 * The hook uses the useSecuredApi hook to make authenticated API calls and
 * maintains local state for the amount data.
 *
 * @param toggleAllPurchases - Boolean flag indicating whether to show all purchases or only non-refunded ones
 * @param refreshTrigger - Number that triggers a refresh when changed (used for manual refreshes)
 * @returns Object containing titleData with refunded and non-refunded amounts
 */
export const usePurchaseAmounts = (
  toggleAllPurchases: boolean,
  refreshTrigger: number,
) => {
  // Access the secured API functions for making authenticated requests
  const { getJson } = useSecuredApi();

  // State to store the amount data
  // Contains both refunded and non-refunded purchase totals
  const [titleData, setTitleData] = useState({
    notRefundedAmount: 0, // Total amount of non-refunded purchases
    refundedAmount: 0, // Total amount of refunded purchases
  });

  // Effect hook to load amounts when toggle changes or table refreshes
  // This runs whenever toggleAllPurchases or refreshTrigger changes
  useEffect(() => {
    if (toggleAllPurchases) {
      // When showing all purchases, we need both refunded and non-refunded amounts
      // First, load the refunded amounts
      getJson(`${import.meta.env.API_BASE_URL}/purchases/refunded-amount`).then(
        (data) => {
          // Check if the API call was successful
          if (data.success) {
            // Update the refunded amount in state
            setTitleData((prev) => ({
              ...prev, // Keep existing data
              refundedAmount: data.amount, // Update refunded amount
            }));
          }
        },
      );

      // Also load non-refunded amounts when showing all purchases
      getJson(
        `${import.meta.env.API_BASE_URL}/purchases/not-refunded-amount`,
      ).then((data) => {
        if (data.success) {
          setTitleData((prev) => ({
            ...prev,
            notRefundedAmount: data.amount,
          }));
        }
      });
    } else {
      // When showing only non-refunded purchases, only load non-refunded amounts
      // Reset refunded amount to 0 since we're not showing refunded purchases
      getJson(
        `${import.meta.env.API_BASE_URL}/purchases/not-refunded-amount`,
      ).then((data) => {
        if (data.success) {
          setTitleData((prev) => ({
            ...prev,
            notRefundedAmount: data.amount,
            refundedAmount: 0, // Reset refunded amount when not showing all purchases
          }));
        }
      });
    }
  }, [toggleAllPurchases, refreshTrigger, getJson]); // Dependencies for re-running the effect

  // Return the amount data for use in components
  return {
    titleData, // Object containing notRefundedAmount and refundedAmount
  };
};
