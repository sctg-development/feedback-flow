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
import { clsx } from "@heroui/shared-utils";
import { HTMLHeroUIProps } from "@heroui/system";
import { FC, ReactElement } from "react";

type FileSize = `${number} KB` | `${number} MB` | `${number}KB` | `${number}MB`;

export interface FileUploadTopbarProps extends HTMLHeroUIProps<"div"> {
  /**
   * Max number of items.
   * @default 1
   */
  maxItems?: number;
  /**
   * Max number of items text.
   * @default  "Max number of items"
   */
  maxItemsText?: string;
  /**
   * Custom Element to show Max number of items.
   */
  maxItemsElement?: ReactElement;
  /**
   * Max file size allowed.
   */
  maxAllowedSize?: FileSize;
  /**
   * Max file size text.
   * @default "Max File Size"
   */
  maxAllowedSizeText?: string;
  /**
   * Custom Element to show Max file size.
   */
  maxAllowedSizeElement?: ReactElement;
  /**
   * Total max size allowed for multiple files combined.
   */
  totalMaxAllowedSize?: FileSize;
  /**
   * Total max file size text.
   * @default "Total Max Files Size"
   */
  totalMaxAllowedSizeText?: string;
  /**
   * Custom Element to show Total Max file size.
   */
  totalMaxAllowedSizeElement?: ReactElement;
}

const FileUploadTopbar: FC<FileUploadTopbarProps> = ({
  maxItemsText = "Max number of items",
  maxAllowedSizeText = "Max File Size",
  totalMaxAllowedSizeText = "Total Max Files Size",
  maxItems = 1,
  maxItemsElement,
  maxAllowedSize,
  maxAllowedSizeElement,
  totalMaxAllowedSize,
  totalMaxAllowedSizeElement,
  className,
  ...otherProps
}) => {
  return (
    <div
      aria-label="File upload constraints"
      className={clsx("flex gap-2 text-sm text-default-500", className)}
      role="region"
      {...otherProps}
    >
      {maxItems > 1 &&
        (maxItemsElement ?? (
          <span aria-label={`${maxItemsText}: ${maxItems}`}>
            {maxItemsText}: {maxItems}
          </span>
        ))}
      {maxAllowedSize &&
        (maxAllowedSizeElement ?? (
          <span aria-label={`${maxAllowedSizeText}: ${maxAllowedSize}`}>
            {maxAllowedSizeText}: {maxAllowedSize}
          </span>
        ))}
      {totalMaxAllowedSize &&
        (totalMaxAllowedSizeElement ?? (
          <span
            aria-label={`${totalMaxAllowedSizeText}: ${totalMaxAllowedSize}`}
          >
            {totalMaxAllowedSizeText}: {totalMaxAllowedSize}
          </span>
        ))}
    </div>
  );
};

FileUploadTopbar.displayName = "NextUI.FileUploadTopbar";

export default FileUploadTopbar;
