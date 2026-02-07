/**
 * @copyright Copyright (c) 2024-2025 Ronan LE MEILLAT
 * @license AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

// Import React hooks and utilities
import { useClipboard } from "@heroui/use-clipboard";
import { memo, useState, useEffect, useCallback } from "react";

import { IconSvgProps } from "@/types";

import type React from "react";

import { forwardRef } from "react";
import { Button, type ButtonProps } from "@heroui/button";
import { clsx } from "@heroui/shared-utils";
import { addToast } from "@heroui/toast";
import { useTranslation } from "react-i18next";

// PreviewButton is a simple wrapper around HeroUI Button for icon-only buttons
export interface PreviewButtonProps extends ButtonProps {
  icon: React.ReactNode;
}

/**
 * CopyButton Component
 *
 * A versatile React component that provides an easy way to copy text or images to the clipboard.
 * It supports both single and multiple values, with automatic visual feedback and error handling.
 *
 * Key Features:
 * - Supports copying text strings or arrays of text
 * - Supports copying single images or multiple images (automatically stacked vertically)
 * - Handles various image formats (PNG, JPEG, WebP, etc.) with automatic conversion
 * - Provides visual feedback with animated icons (copy → checkmark → error)
 * - Includes toast notifications for success/error states
 * - Fully accessible with proper ARIA labels and keyboard support
 * - Internationalization support with react-i18next
 *
 * Use Cases:
 * - Copy API keys, tokens, or configuration values
 * - Copy user-generated content or feedback
 * - Copy QR codes or other visual elements
 * - Copy multiple screenshots stacked vertically for documentation
 * - Any scenario where users need to copy content to clipboard
 *
 * Example Usage:
 *
 * // Copy text
 * <CopyButton value="Hello World" />
 *
 * // Copy multiple text values
 * <CopyButton value={["Item 1", "Item 2", "Item 3"]} />
 *
 * // Copy a single image (URL or data URL)
 * <CopyButton value="https://example.com/image.png" isImage />
 *
 * // Copy multiple images (stacked vertically)
 * <CopyButton
 *   value={["image1.png", "image2.png", "image3.png"]}
 *   isImage
 *   showToast
 *   toastText="Images copied!"
 * />
 *
 * // With custom styling and callbacks
 * <CopyButton
 *   value="Secret API Key"
 *   className="absolute top-2 right-2"
 *   onCopySuccess={() => console.log("Copied successfully")}
 *   onCopyError={(error) => console.error("Copy failed", error)}
 * />
 */

export const PreviewButton = forwardRef<
  HTMLButtonElement | null,
  PreviewButtonProps
>((props, ref) => {
  const { icon, className, ...buttonProps } = props;

  return (
    <Button
      ref={ref}
      isIconOnly
      className={clsx("relative z-50 text-zinc-300", className)}
      size="sm"
      variant={props.variant ?? "light"}
      {...buttonProps}
    >
      {icon}
    </Button>
  );
});

PreviewButton.displayName = "PreviewButton";

// CopyButtonProps defines all the properties our CopyButton component accepts
export interface CopyButtonProps extends Omit<ButtonProps, 'value'> {
  // value can be a single string or an array of strings (for multiple items)
  value?: string | string[];
  /**
   * Time in milliseconds to show the copied state
   * @default 2000
   */
  copiedTimeout?: number;
  /**
   * Show a toast notification when content is copied
   * @default false
   */
  showToast?: boolean;
  /**
   * Text to show in toast notification
   * @default "Copied to clipboard"
   */
  toastText?: string;
  /**
   * Callback when copy succeeds
   */
  onCopySuccess?: () => void;
  /**
   * Callback when copy fails
   */
  onCopyError?: (error: unknown) => void;
  /**
   * Whether the value is an image (base64 data URL)
   * @default false
   */
  isImage?: boolean;
}

// CopyButton is a reusable component that can copy text or images to clipboard
// It shows different icons based on the copy state (normal, copied, error)
export const CopyButton = memo<CopyButtonProps>(
  ({
    value,
    className,
    copiedTimeout = 2000,
    showToast = false,
    toastText = "Copied to clipboard",
    onCopySuccess,
    onCopyError,
    isImage = false,
    ...buttonProps
  }) => {
    // useTranslation hook for internationalization (i18n)
    const { t } = useTranslation();
    
    // useClipboard hook from HeroUI provides copy function and copied state
    const { copy, copied } = useClipboard();
    
    // State to track if there was an error during copying
    const [hasCopyError, setHasCopyError] = useState(false);
    
    // State to track if an image was successfully copied (separate from text copying)
    const [imageCopied, setImageCopied] = useState(false);

    // Effect to automatically reset error state after a timeout
    // This provides visual feedback to the user
    useEffect(() => {
      if (hasCopyError) {
        const timer = setTimeout(() => {
          setHasCopyError(false);
        }, copiedTimeout);
        return () => clearTimeout(timer); // Cleanup timer on unmount or dependency change
      }
    }, [hasCopyError, copiedTimeout]);

    // Effect to automatically reset image copied state after a timeout
    // This provides visual feedback to the user
    useEffect(() => {
      if (imageCopied) {
        const timer = setTimeout(() => {
          setImageCopied(false);
        }, copiedTimeout);
        return () => clearTimeout(timer); // Cleanup timer on unmount or dependency change
      }
    }, [imageCopied, copiedTimeout]);

    // Main copy handler function - decides whether to copy text or images
    const handleCopy = useCallback(() => {
      if (isImage) {
        // Handle image copying asynchronously (since it involves loading images)
        (async () => {
          try {
            // Convert value to array of URLs, filtering out empty values
            // This allows copying multiple images at once
            const imageUrls = Array.isArray(value) ? value.filter(url => url) : [value].filter(url => url);

            // Validate that we have at least one valid URL
            if (!imageUrls.length || imageUrls.some(url => !url)) {
              throw new Error(t('no-value-to-copy'));
            }

            // Arrays to store loaded images and their MIME types
            const images: HTMLImageElement[] = [];
            const originalMimeTypes: string[] = [];

            // Process each image URL
            for (const url of imageUrls) {
              if (!url) continue;
              
              let blob: Blob;
              let originalMimeType = 'image/png';

              // Check if it's a data URL (base64 encoded image)
              if (url.startsWith('data:')) {
                // Extract MIME type from data URL (e.g., "image/png" from "data:image/png;base64,...")
                const mimeMatch = url.match(/^data:([^;]+)/);
                originalMimeType = mimeMatch ? mimeMatch[1] : 'image/png';

                // Convert data URL to blob
                const parts = url.split(',');
                if (parts.length !== 2) {
                  throw new Error('Invalid data URL format');
                }

                const data = parts[1];

                // Decode base64 to binary string, then to Uint8Array
                const binaryString = atob(data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                blob = new Blob([bytes], { type: originalMimeType });
              } else {
                // It's a regular URL, fetch it from the network
                const response = await fetch(url);
                if (!response.ok) {
                  throw new Error(`Failed to fetch image: ${response.statusText}`);
                }
                blob = await response.blob();
                originalMimeType = blob.type || 'image/png';
              }

              originalMimeTypes.push(originalMimeType);

              // Convert to PNG if needed (clipboard API only supports PNG/JPEG)
              const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
              if (!supportedMimeTypes.includes(originalMimeType)) {
                // Create a canvas to convert the image to PNG
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  throw new Error('Could not get canvas context');
                }

                const img = new Image();
                img.crossOrigin = 'anonymous';
                const blobUrl = URL.createObjectURL(blob);

                try {
                  await new Promise<void>((resolve, reject) => {
                    img.onload = () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx.drawImage(img, 0, 0);
                      canvas.toBlob(
                        (pngBlob) => {
                          if (!pngBlob) {
                            reject(new Error('Failed to convert image to PNG'));
                          } else {
                            blob = pngBlob;
                            resolve();
                          }
                        },
                        'image/png'
                      );
                    };
                    img.onerror = () => {
                      reject(new Error('Failed to load image'));
                    };
                    img.src = blobUrl;
                  });
                } finally {
                  URL.revokeObjectURL(blobUrl);
                }
              }

              // Load image for canvas stacking
              const img = new Image();
              img.crossOrigin = 'anonymous';
              const blobUrl = URL.createObjectURL(blob);

              await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                  images.push(img);
                  resolve();
                };
                img.onerror = () => {
                  reject(new Error('Failed to load image for stacking'));
                };
                img.src = blobUrl;
              });

              URL.revokeObjectURL(blobUrl);
            }

            // Create canvas for stacking images vertically
            // Canvas is like a digital drawing board where we can combine multiple images
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Could not get canvas context');
            }

            // Calculate total height and max width for the combined image
            // We need to know the final size before drawing
            let totalHeight = 0;
            let maxWidth = 0;
            for (const img of images) {
              totalHeight += img.height; // Add up all image heights
              maxWidth = Math.max(maxWidth, img.width); // Find the widest image
            }

            // Set the canvas size to fit all images
            canvas.width = maxWidth;
            canvas.height = totalHeight;

            // Draw images vertically (stacked on top of each other)
            // Start from the top (y = 0) and move down for each image
            let currentY = 0;
            for (const img of images) {
              ctx.drawImage(img, 0, currentY); // Draw at (0, currentY) position
              currentY += img.height; // Move down by the height of this image
            }

            // Convert canvas to blob - this creates the final PNG file
            // toBlob() is asynchronous, so we use a Promise
            const finalBlob = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    reject(new Error('Failed to create stacked image blob'));
                  } else {
                    resolve(blob);
                  }
                },
                'image/png' // Always PNG for clipboard compatibility
              );
            });

            // Use Clipboard API to copy image blob
            // ClipboardItem allows copying different types of data (text, images, etc.)
            const clipboardItem = new ClipboardItem({
              'image/png': finalBlob // Specify the MIME type and the blob data
            });

            // Write the ClipboardItem to the system clipboard
            // This makes the image available for pasting in other applications
            await navigator.clipboard.write([clipboardItem]);

            // Set image copied state for UI feedback
            // This will show a "copied" icon and trigger the timeout effect
            setImageCopied(true);
            setHasCopyError(false);

            // Show success toast if enabled
            if (showToast) {
              addToast({
                title: toastText,
                variant: "solid",
                timeout: copiedTimeout
              });
            }

            // Call success callback if provided
            if (onCopySuccess) {
              onCopySuccess();
            }
          } catch (error) {
            // Handle any errors that occurred during image processing or copying
            console.error('Image copy failed:', error);
            setHasCopyError(true);
            setImageCopied(false);

            // Show error toast if enabled
            if (showToast) {
              addToast({
                title: t('failed-to-copy'),
                variant: "solid",
                timeout: copiedTimeout
              });
            }

            // Call error callback if provided
            if (onCopyError) {
              onCopyError(error);
            }
          }
        })();
      } else {
        // Handle text copying (much simpler than image copying)
        // Join array elements with commas if value is an array
        const textToCopy = Array.isArray(value) ? value.join(', ') : value;
        copy(textToCopy);

        if (showToast) {
          addToast({
            title: toastText,
            variant: "solid",
            timeout: copiedTimeout
          });
        }

        if (onCopySuccess) {
          onCopySuccess();
        }
      }
    }, [value, copy, showToast, toastText, copiedTimeout, onCopySuccess, onCopyError, isImage, t]);

    // Determine if content has been copied (either text or image)
    // This controls which icon to show
    const isCopied = copied || imageCopied;

    // Choose the appropriate icon based on the current state
    // Three possible states: error, copied successfully, or normal (ready to copy)
    const icon = hasCopyError ? (
      // Error state: show red error icon
      <ErrorIcon
        className="opacity-0 scale-50 text-danger data-[visible=true]:opacity-100 data-[visible=true]:scale-100 transition-transform-opacity"
        data-visible={hasCopyError}
        size={16}
      />
    ) : isCopied ? (
      // Success state: show green checkmark icon
      <CheckLinearIcon
        className="opacity-0 scale-50 text-success data-[visible=true]:opacity-100 data-[visible=true]:scale-100 transition-transform-opacity"
        data-visible={isCopied}
        size={16}
      />
    ) : (
      // Normal state: show copy icon
      <CopyLinearIcon
        className="opacity-0 scale-50 data-[visible=true]:opacity-100 data-[visible=true]:scale-100 transition-transform-opacity"
        data-visible={!isCopied && !hasCopyError}
        size={16}
      />
    );

    // Render the button with the appropriate icon
    // PreviewButton is likely a styled button component from HeroUI
    return (
      <PreviewButton
        className={className ?? "bottom-0 left-0.5"}
        icon={icon}
        onPress={handleCopy}
        aria-label={isCopied ? t('copied') : t('copy-to-clipboard')}
        title={isCopied ? t('copied') : t('copy-to-clipboard')}
        {...buttonProps}
      />
    );
  },
);

CopyButton.displayName = "CopyButton";

// Icon components for the copy button states
// These are SVG icons that change based on the copy state (normal, success, error)
// They use the IconSvgProps interface for consistent sizing and styling

export const CopyLinearIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height={height || size}
    role="presentation"
    viewBox="0 0 24 24"
    width={width || size}
    {...props}
  >
    <path
      d="M16 12.9V17.1C16 20.6 14.6 22 11.1 22H6.9C3.4 22 2 20.6 2 17.1V12.9C2 9.4 3.4 8 6.9 8H11.1C14.6 8 16 9.4 16 12.9Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M22 6.9V11.1C22 14.6 20.6 16 17.1 16H16V12.9C16 9.4 14.6 8 11.1 8H8V6.9C8 3.4 9.4 2 12.9 2H17.1C20.6 2 22 3.4 22 6.9Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

// Check icon for successful copy operations
export const CheckLinearIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height={size || height}
    role="presentation"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Error icon for failed copy operations
export const ErrorIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height={size || height}
    role="presentation"
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
  >
    <path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M15 9L9 15"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <path
      d="M9 9L15 15"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);