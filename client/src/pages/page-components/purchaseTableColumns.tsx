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

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/button";
import { EditIcon } from "@/components/icons";
import { CopyButton } from "@/components/copy-button";
import { Transparent1x1WebpPixel } from "@/components/icons";
import { cleanAmazonOrderNumber } from "@/utilities/amazon";
import { PurchaseStatus } from "@/types/db";
import { ActionCell } from "./ActionCell";
import { StatusCell } from "./StatusCell";
import { PurchaseIdCell } from "./PurchaseIdCell";

/**
 * Props interface for the purchase table columns configuration
 * Defines all the callback functions needed by the table columns
 */
interface PurchaseTableColumnsProps {
  /** Whether the current user has write permissions */
  hasWritePermission: boolean | null;
  /** Callback function to create feedback for a purchase */
  onCreateFeedback: (purchaseId: string, amount: number) => void;
  /** Callback function to return a purchase */
  onReturnItem: (purchaseId: string, amount: number) => void;
  /** Callback function to publish feedback for a purchase */
  onPublishFeedback: (purchaseId: string, amount: number) => void;
  /** Callback function to refund a purchase */
  onRefundPurchase: (purchaseId: string, amount: number) => void;
  /** Callback function to edit a purchase */
  onEditPurchase: (purchaseId: string) => void;
  /** Callback function to generate a public link for a purchase */
  onGenerateLink: (purchaseId: string) => void;
  /** Callback function to set screenshot for viewing */
  onSetScreenshot: (screenshot: string | string[]) => void;
  /** Callback function to create a new purchase */
  onCreateNewPurchase: () => void;
}

/**
 * Custom hook that returns the column definitions for the purchase table
 *
 * This hook centralizes all the column configurations for the purchase table,
 * making the main component cleaner and the column definitions reusable.
 * Each column defines how data should be displayed, sorted, and interacted with.
 *
 * The columns include:
 * - Purchase ID with copy and edit functionality
 * - Date (sortable)
 * - Order number with Amazon link
 * - Description with screenshot viewing
 * - Amount
 * - Feedback status
 * - Publication status with screenshot
 * - Refund status with PayPal link
 * - Actions (create feedback, publish, refund, etc.)
 *
 * @param props - Configuration object containing all necessary callback functions
 * @returns Array of column definitions for the PaginatedTable component
 */
export const usePurchaseTableColumns = ({
  hasWritePermission,
  onCreateFeedback,
  onReturnItem,
  onPublishFeedback,
  onRefundPurchase,
  onEditPurchase,
  onGenerateLink,
  onSetScreenshot,
  onCreateNewPurchase,
}: PurchaseTableColumnsProps) => {
  // Hook to access translation functions for internationalization
  const { t } = useTranslation();

  /**
   * Renders the action column for a purchase row based on its status
   * This is a wrapper function that uses the ActionCell component
   */
  const renderActionColumn = (item: PurchaseStatus) => (
    <ActionCell
      item={item}
      hasWritePermission={hasWritePermission}
      onCreateFeedback={onCreateFeedback}
      onReturnItem={onReturnItem}
      onPublishFeedback={onPublishFeedback}
      onRefundPurchase={onRefundPurchase}
    />
  );

  /**
   * Returns the empty content component for when no data is available
   * Shows a message and optionally a button to create a new purchase
   */
  const getEmptyContent = () => (
    <div className="text-center text-muted-foreground p-4">
      {t("no-data-available")}
      {hasWritePermission && (
        <div className="mt-4">
          <Button
            color="primary"
            startContent={<EditIcon />}
            onPress={onCreateNewPurchase}
          >
            {t("new-purchase")}
          </Button>
        </div>
      )}
    </div>
  );

  // Return the complete column configuration array
  // Each object defines a column in the table
  return {
    // Column definitions array for the PaginatedTable
    columns: [
      {
        // Purchase ID column - shows the unique purchase identifier
        field: "purchase", // Database field name
        label: t("purchase"), // Translated column header
        sortable: false, // Cannot sort by purchase ID
        cellCopyable: true, // Allows copying cell content
        className: "hidden md:table-cell", // Hidden on mobile, visible on medium+ screens
        headerClassName: "hidden md:table-cell", // Header also hidden on mobile
        render: (item: PurchaseStatus) => (
          // Custom component for purchase ID with copy, edit, and link generation
          <PurchaseIdCell
            purchaseId={item.purchase}
            hasPublication={item.hasPublication}
            onEditPurchase={onEditPurchase}
            onGenerateLink={onGenerateLink}
          />
        ),
      },
      {
        // Date column - shows when the purchase was made
        field: "date", // Database field name
        label: t("date"), // Translated column header
        sortable: true, // Allows sorting by date
        className: "hidden md:table-cell", // Responsive visibility
        headerClassName: "hidden md:table-cell",
        // No custom render needed - displays the date field directly
      },
      {
        // Order column - shows the Amazon order number with link
        field: "order", // Database field name
        label: t("order"), // Translated column header
        sortable: true, // Allows sorting by order number
        className: "hidden md:table-cell", // Responsive visibility
        headerClassName: "hidden md:table-cell",
        render: (item: PurchaseStatus) => {
          return (
            <>
              {/* Link to Amazon order page */}
              <Link
                className="text-blue-500 hover:underline break-keep"
                target="_blank" // Opens in new tab
                rel="noopener noreferrer" // Security for external links
                to={`${import.meta.env.AMAZON_BASE_URL}${item.order}`}
              >
                {/* Clean and format the Amazon order number for display */}
                {cleanAmazonOrderNumber(item.order)}
              </Link>
              {/* Copy button positioned absolutely in the top-right of the cell */}
              <CopyButton
                className="absolute top-0 right-0"
                value={item.order} // Copy the raw order number
              />
            </>
          );
        },
      },
      {
        // Description column - shows purchase description with screenshot
        field: "description", // Database field name
        label: t("description"), // Translated column header
        sortable: false, // Cannot sort by description
        render: (item: PurchaseStatus) => (
          // Custom component for description with screenshot viewing
          <StatusCell
            text={item.description}
            screenshot={item.purchaseScreenshot}
            screenshotSummary={item.screenshotSummary}
            copyTooltipKey="copy-screenshots" // Tooltip for copying screenshots
            onScreenshotClick={onSetScreenshot}
          />
        ),
        // Action triggered when clicking on the description cell
        onCellAction: (item: PurchaseStatus) => {
          // Set screenshot(s) for viewing in modal
          item.screenshotSummary
            ? onSetScreenshot([
              item.purchaseScreenshot || Transparent1x1WebpPixel,
              item.screenshotSummary,
            ])
            : onSetScreenshot(item.purchaseScreenshot || Transparent1x1WebpPixel);
        },
      },
      {
        // Amount column - shows the purchase amount in euros
        field: "amount", // Database field name
        label: t("amount"), // Translated column header
        sortable: false, // Cannot sort by amount (would need proper number sorting)
        className: "hidden md:table-cell", // Responsive visibility
        headerClassName: "hidden md:table-cell",
        // No custom render needed - displays the amount field directly
      },
      {
        // Has Feedback column - shows if feedback exists
        field: "hasFeedback", // Database field name
        label: t("hasFeedback"), // Translated column header
        sortable: false, // Cannot sort by boolean field
        className: "hidden md:table-cell", // Responsive visibility
        headerClassName: "hidden md:table-cell",
        // No custom render needed - displays boolean as text
      },
      {
        // Has Publication column - shows if feedback has been published
        field: "hasPublication", // Database field name
        label: t("hasPublication"), // Translated column header
        sortable: false, // Cannot sort by boolean field
        className: "hidden md:table-cell", // Responsive visibility
        headerClassName: "hidden md:table-cell",
        render: (item: PurchaseStatus) => (
          // Custom component for publication status with screenshot
          <StatusCell
            text={item.hasPublication ? t("yes") : t("no")}
            screenshot={item.publicationScreenshot}
            copyTooltipKey="copy-screenshot" // Tooltip for copying single screenshot
            onScreenshotClick={(screenshot) => onSetScreenshot(screenshot)}
          />
        ),
        // Action triggered when clicking on the publication cell
        onCellAction: (item: PurchaseStatus) => {
          // Show publication screenshot if it exists
          if (item.hasPublication && item.publicationScreenshot) {
            onSetScreenshot(item.publicationScreenshot);
          }
        },
      },
      {
        // Refunded column - shows refund status with PayPal link if applicable
        field: "refunded", // Database field name
        label: t("refunded"), // Translated column header
        sortable: false, // Cannot sort by boolean field
        className: "hidden md:table-cell", // Responsive visibility
        headerClassName: "hidden md:table-cell",
        render: (item: PurchaseStatus) => {
          return item.refunded ? (
            <>
              {/* If there's a valid transaction ID, create a PayPal link */}
              {item.transactionId && item.transactionId.length >= 4 && !item.transactionId.startsWith("REFUND_") ? (
                <Link
                  className="text-blue-500 hover:underline break-keep"
                  target="_blank" // Opens in new tab
                  rel="noopener noreferrer" // Security for external links
                  to={`${import.meta.env.PAYPAL_TRANSACTION_BASE_URL}${item.transactionId}`}
                >
                  {t("yes")}
                </Link>
              ) : (
                // Otherwise just show "Yes" without link
                <span>{t("yes")}</span>
              )}
            </>
          ) : (
            // Show "No" if not refunded
            <>{t("no")}</>
          );
        }
      },
      {
        // Actions column - shows available actions based on purchase status
        field: "actions", // Not a real database field, used for actions
        label: t("actions"), // Translated column header
        render: (item: PurchaseStatus) => renderActionColumn(item), // Use the action rendering function
      },
    ],
    // Return the empty content component
    emptyContent: getEmptyContent(),
  };
};