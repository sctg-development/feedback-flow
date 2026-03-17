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

import { Tooltip } from "@heroui/tooltip";
import { useTranslation } from "react-i18next";

import { CopyButton } from "@/components/copy-button";
import { Transparent1x1WebpPixel } from "@/components/icons";

/**
 * Props interface for the StatusCell component
 * Defines the structure of data needed to display status with optional screenshot
 */
interface StatusCellProps {
  /** The main text to display in the cell */
  text: string;
  /** Optional screenshot URL for the purchase */
  screenshot?: string;
  /** Optional screenshot summary URL (for additional context) */
  screenshotSummary?: string;
  /** Translation key for the copy button tooltip */
  copyTooltipKey: "copy-screenshot" | "copy-screenshots";
  /** Callback function when screenshot is clicked */
  onScreenshotClick: (screenshot: string | string[]) => void;
}

/**
 * StatusCell Component
 *
 * This component renders table cells that display status text with optional screenshot functionality.
 * It provides a user-friendly way to view and copy screenshots associated with purchases.
 *
 * Features:
 * - Displays the main status text (e.g., "Yes", "No", or description)
 * - Shows a tooltip when hovering over the text indicating it can be clicked to view screenshot
 * - Includes a copy button to copy screenshot URLs to clipboard
 * - Handles both single screenshots and screenshot pairs (main + summary)
 *
 * The component uses HeroUI's Tooltip component to provide helpful user guidance
 * and a custom CopyButton component for copying screenshot data.
 *
 * @param props - The component props containing text, screenshot data, and callbacks
 * @returns JSX element representing the status cell with optional screenshot functionality
 */
export const StatusCell = ({
  text,
  screenshot,
  screenshotSummary,
  copyTooltipKey,
  onScreenshotClick,
}: StatusCellProps) => {
  // Hook to access translation functions for internationalization
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      {/* Main text content with click-to-view functionality */}
      <Tooltip content={t("click-to-see-the-screenshot")}>
        <span
          className="flex-1 cursor-pointer"
          onClick={() => {
            // Handle click to show screenshot(s)
            // If both main screenshot and summary exist, show both
            if (screenshotSummary && screenshot) {
              onScreenshotClick([screenshot, screenshotSummary]);
            } else if (screenshot) {
              // Otherwise show just the main screenshot
              onScreenshotClick(screenshot);
            }
          }}
        >
          {text}
        </span>
      </Tooltip>

      {/* Copy button for screenshot URLs - only shown if screenshot exists */}
      {screenshot && (
        <Tooltip content={t(copyTooltipKey)}>
          <CopyButton
            // Prepare the value to copy - either single screenshot or array of screenshots
            value={
              screenshotSummary && screenshot
                ? [screenshot, screenshotSummary || Transparent1x1WebpPixel]
                : screenshot
            }
            // Indicate that this is image data for proper clipboard handling
            className="ml-2"
            isImage={true}
            showToast={true}
            toastText={t("copied-to-clipboard")}
          />
        </Tooltip>
      )}
    </div>
  );
};
