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

import { Button } from "@heroui/button";
import { useTranslation } from "react-i18next";
import ButtonAddFeedbackOrReturn from "@/components/button-add-feedback-or-return";
import { PurchaseStatus } from "@/types/db";

/**
 * Props interface for the ActionCell component
 * Defines the structure of data and callback functions needed
 */
interface ActionCellProps {
  /** The purchase item data containing status information */
  item: PurchaseStatus;
  /** Whether the current user has write permissions (null while loading) */
  hasWritePermission: boolean | null;
  /** Callback function to create feedback for a purchase */
  onCreateFeedback: (purchaseId: string, amount: number) => void;
  /** Callback function to return/return a purchase */
  onReturnItem: (purchaseId: string, amount: number) => void;
  /** Callback function to publish feedback for a purchase */
  onPublishFeedback: (purchaseId: string, amount: number) => void;
  /** Callback function to refund a purchase */
  onRefundPurchase: (purchaseId: string, amount: number) => void;
}

/**
 * ActionCell Component
 *
 * This component renders the action buttons for each row in the purchase table.
 * The actions available depend on the purchase status and user permissions:
 *
 * - If the purchase is refunded: Shows "Refunded" status text
 * - If no feedback exists and user has write permission: Shows buttons to create feedback or return item
 * - If feedback exists but not published and user has write permission: Shows "Publish Feedback" button
 * - If feedback is published and user has write permission: Shows "Refund" button
 * - If user lacks write permission: Shows no actions
 *
 * The component uses conditional rendering to display appropriate actions based on:
 * 1. Purchase status (refunded, hasFeedback, hasPublication)
 * 2. User permissions (hasWritePermission)
 * 3. Loading state (when permissions are still being checked)
 *
 * @param props - The component props containing item data and callback functions
 * @returns JSX element representing the action cell content
 */
export const ActionCell = ({
  item,
  hasWritePermission,
  onCreateFeedback,
  onReturnItem,
  onPublishFeedback,
  onRefundPurchase,
}: ActionCellProps) => {
  // Hook to access translation functions for internationalization
  const { t } = useTranslation();

  // Show loading text while permissions are being checked
  // This prevents showing incorrect action buttons during the loading phase
  if (hasWritePermission === null) {
    return <span className="text-gray-400">{t("loading")}</span>;
  }

  // If the purchase has been refunded, show the refunded status
  // No further actions are possible for refunded purchases
  if (item.refunded) {
    return <span className="text-green-500">{t("refunded")}</span>;
  }

  // If no feedback exists and user has write permission,
  // show the combined button for creating feedback or returning the item
  if (!item.hasFeedback && hasWritePermission) {
    return (
      <div className="flex gap-2">
        {/* Custom button component that handles both feedback creation and item return */}
        <ButtonAddFeedbackOrReturn
          onAction={(key) => {
            // Handle the action based on the key returned by the button
            if (key === "feedback") {
              // Call the callback to create feedback for this purchase
              onCreateFeedback(item.purchase, item.amount);
            } else if (key === "return") {
              // Call the callback to return this purchase
              onReturnItem(item.purchase, item.amount);
            }
          }}
        />
      </div>
    );
  }

  // If has feedback but no publication and user has write permission, show publish button
  if (item.hasFeedback && !item.hasPublication && hasWritePermission) {
    return (
      <div className="flex gap-2">
        <Button
          key={"publish-feedback"}
          color="primary"
          size="md"
          onPress={() => onPublishFeedback(item.purchase, item.amount)}
        >
          {t("publish-feedback")}
        </Button>
      </div>
    );
  }

  // If has feedback and publication and user has write permission, show refund button
  if (item.hasFeedback && item.hasPublication && hasWritePermission) {
    return (
      <div className="flex gap-2">
        <Button
          color="primary"
          size="md"
          onPress={() => onRefundPurchase(item.purchase, item.amount)}
        >
          {t("refund")}
        </Button>
      </div>
    );
  }

  // Default: read-only status
  return <span className="text-red-500">{t("read-only")}</span>;
};