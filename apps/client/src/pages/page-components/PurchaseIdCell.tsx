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

import { CopyButton } from "@/components/copy-button";
import { EditIcon } from "@heroui/shared-icons";

/**
 * Props interface for the PurchaseIdCell component
 * Defines the structure of data and callback functions needed
 */
interface PurchaseIdCellProps {
  /** The unique identifier of the purchase */
  purchaseId: string;
  /** Whether this purchase has been published (affects link generation availability) */
  hasPublication: boolean;
  /** Whether the current user has write permissions (null while loading) */
  hasWritePermission?: boolean | null;
  /** Callback function to edit the purchase */
  onEditPurchase: (purchaseId: string) => void;
  /** Callback function to generate a public link for the purchase */
  onGenerateLink: (purchaseId: string) => void;
}

/**
 * PurchaseIdCell Component
 *
 * This component renders the purchase ID cell in the purchase table.
 * It displays the purchase ID with interactive features based on user permissions and purchase status.
 *
 * Features:
 * - Displays the purchase ID as clickable text (if publication exists)
 * - Clicking the ID generates a public link (only available for published purchases)
 * - Includes a copy button to copy the purchase ID to clipboard
 * - Shows an edit icon for admin users to modify the purchase
 * - Uses authentication guard to restrict edit functionality to admin users only
 *
 * The component combines multiple UI elements:
 * 1. Clickable purchase ID (when publication exists)
 * 2. CopyButton for easy ID copying
 * 3. EditIcon with authentication guard for admin editing
 *
 * @param props - The component props containing purchase data and callback functions
 * @returns JSX element representing the purchase ID cell with interactive features
 */
export const PurchaseIdCell = ({
  purchaseId,
  hasPublication,
  hasWritePermission,
  onEditPurchase,
  onGenerateLink,
}: PurchaseIdCellProps) => {
  // Determine if the user can generate a public link
  // Link generation is only available for purchases that have been published
  const canGenerateLink = hasPublication;

  return (
    <>
      <div className="flex items-center">
        {/* Purchase ID display - clickable if publication exists */}
        <div
          // Apply clickable styling only if link generation is available
          className={canGenerateLink ? "cursor-pointer hover:underline text-blue-500" : ""}
          onClick={() => {
            // Generate public link when clicked (only if publication exists)
            if (canGenerateLink) {
              onGenerateLink(purchaseId);
            }
          }}
        >
          {purchaseId}
        </div>

        {/* Action buttons container */}
        <div className="flex flex-col">
          {/* Copy button to copy purchase ID to clipboard */}
          <CopyButton value={purchaseId} />

          {/* Edit button - only visible to admin users (use pre-computed permission to avoid per-row permission checks) */}
          {hasWritePermission === null ? (
            <></>
          ) : hasWritePermission ? (
            <EditIcon
              // Click handler to open edit modal
              onClick={() => onEditPurchase(purchaseId)}
              // Styling classes for the edit icon (HeroUI styling)
              className="group inline-flex items-center justify-center box-border appearance-none select-none whitespace-nowrap font-normal subpixel-antialiased overflow-hidden tap-highlight-transparent transform-gpu data-[pressed=true]:scale-[0.97] cursor-pointer outline-hidden data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-tiny rounded-small px-0 transition-transform-colors-opacity motion-reduce:transition-none bg-transparent data-[hover=true]:bg-default/40 min-w-4 w-4 h-4 relative z-50 text-zinc-300 bottom-0 left-2"
            />
          ) : null}
        </div>
      </div>
    </>
  );
};