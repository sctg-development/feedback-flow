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
import { useClipboard } from "@heroui/use-clipboard";
import { memo, useState, useEffect, useCallback } from "react";

import { IconSvgProps } from "@/types";

import type React from "react";

import { forwardRef } from "react";
import { Button, type ButtonProps } from "@heroui/button";
import { clsx } from "@heroui/shared-utils";
import { addToast } from "@heroui/toast";
import { useTranslation } from "react-i18next";

export interface PreviewButtonProps extends ButtonProps {
  icon: React.ReactNode;
}

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
export interface CopyButtonProps extends ButtonProps {
  value?: string;
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
    const { t } = useTranslation();
    const { copy, copied } = useClipboard();
    const [hasCopyError, setHasCopyError] = useState(false);
    const [imageCopied, setImageCopied] = useState(false);

    // Reset error state after a timeout
    useEffect(() => {
      if (hasCopyError) {
        const timer = setTimeout(() => {
          setHasCopyError(false);
        }, copiedTimeout);
        return () => clearTimeout(timer);
      }
    }, [hasCopyError, copiedTimeout]);

    // Reset image copied state after a timeout
    useEffect(() => {
      if (imageCopied) {
        const timer = setTimeout(() => {
          setImageCopied(false);
        }, copiedTimeout);
        return () => clearTimeout(timer);
      }
    }, [imageCopied, copiedTimeout]);

    const handleCopy = useCallback(() => {
      if (isImage) {
        // Handle image copying asynchronously
        (async () => {
          try {
            if (!value) {
              throw new Error(t('no-value-to-copy'));
            }

            let blob: Blob;
            let originalMimeType = 'image/png';

            // Check if it's a data URL
            if (value.startsWith('data:')) {
              // Extract MIME type from data URL
              const mimeMatch = value.match(/^data:([^;]+)/);
              originalMimeType = mimeMatch ? mimeMatch[1] : 'image/png';

              // Convert data URL to blob
              const parts = value.split(',');
              if (parts.length !== 2) {
                throw new Error('Invalid data URL format');
              }

              const data = parts[1];

              // Decode base64 to binary string
              const binaryString = atob(data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              blob = new Blob([bytes], { type: originalMimeType });
            } else {
              // It's a regular URL, fetch it
              const response = await fetch(value);
              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
              }
              blob = await response.blob();
              originalMimeType = blob.type || 'image/png';
            }

            // Convert image to PNG if it's in an unsupported format for clipboard
            const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
            let finalBlob = blob;
            let finalMimeType = originalMimeType;

            if (!supportedMimeTypes.includes(originalMimeType)) {
              // Convert to PNG using canvas
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
                          finalBlob = pngBlob;
                          finalMimeType = 'image/png';
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

            // Use Clipboard API to copy image blob
            const clipboardItem = new ClipboardItem({
              [finalMimeType]: finalBlob
            });

            await navigator.clipboard.write([clipboardItem]);

            // Set image copied state for UI feedback
            setImageCopied(true);
            setHasCopyError(false);

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
          } catch (error) {
            setHasCopyError(true);
            setImageCopied(false);

            if (showToast) {
              addToast({
                title: t('failed-to-copy'),
                variant: "solid",
                timeout: copiedTimeout
              });
            }

            if (onCopyError) {
              onCopyError(error);
            }
          }
        })();
      } else {
        // Handle text copying (original behavior)
        copy(value);

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

    const isCopied = copied || imageCopied;

    const icon = hasCopyError ? (
      <ErrorIcon
        className="opacity-0 scale-50 text-danger data-[visible=true]:opacity-100 data-[visible=true]:scale-100 transition-transform-opacity"
        data-visible={hasCopyError}
        size={16}
      />
    ) : isCopied ? (
      <CheckLinearIcon
        className="opacity-0 scale-50 text-success data-[visible=true]:opacity-100 data-[visible=true]:scale-100 transition-transform-opacity"
        data-visible={isCopied}
        size={16}
      />
    ) : (
      <CopyLinearIcon
        className="opacity-0 scale-50 data-[visible=true]:opacity-100 data-[visible=true]:scale-100 transition-transform-opacity"
        data-visible={!isCopied && !hasCopyError}
        size={16}
      />
    );

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