import { useState, useEffect } from "react";
import { useSecuredApi } from "@/components/auth0";

/**
 * Hook to manage purchase amounts (refunded and not refunded)
 *
 * @param toggleAllPurchases - Whether to show all purchases or only non-refunded
 * @param refreshTrigger - Trigger to refresh amounts
 * @returns Object containing amount data and loading status
 */
export const usePurchaseAmounts = (toggleAllPurchases: boolean, refreshTrigger: number) => {
  const { getJson } = useSecuredApi();
  const [titleData, setTitleData] = useState({
    notRefundedAmount: 0,
    refundedAmount: 0,
  });

  // Load amounts when toggle changes or table refreshes
  useEffect(() => {
    if (toggleAllPurchases) {
      // Load refunded amounts
      getJson(`${import.meta.env.API_BASE_URL}/purchases/refunded-amount`).then(
        (data) => {
          if (data.success) {
            setTitleData((prev) => ({
              ...prev,
              refundedAmount: data.amount,
            }));
          }
        },
      );
    } else {
      // Load not refunded amounts
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
    }
  }, [toggleAllPurchases, refreshTrigger, getJson]);

  return {
    titleData,
  };
};