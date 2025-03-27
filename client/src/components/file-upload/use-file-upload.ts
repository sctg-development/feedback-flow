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
import type { SlotsToClasses } from "@heroui/theme";
import type {
  FileUploadSlots,
  FileUploadVariantProps,
} from "./file-upload-theme";

import { HTMLHeroUIProps, mapPropsVariants } from "@heroui/system";
import { ReactRef, useDOMRef } from "@heroui/react-utils";
import { objectToDeps } from "@heroui/shared-utils";
import { ReactElement, useMemo } from "react";
import { ButtonProps } from "@heroui/button";

import { fileUpload } from "./file-upload-theme";

interface Props extends Omit<HTMLHeroUIProps<"div">, "onChange"> {
  /**
   * Ref to the DOM node.
   */
  ref?: ReactRef<HTMLElement | null>;
  classNames?: SlotsToClasses<FileUploadSlots>;
  /**
   * A property to set initial files (which might be fetched) or to control files from outside of the component.
   */
  files?: File[];
  /**
   * Custom Browse Button.
   */
  browseButton?: ReactElement<ButtonProps>;
  /**
   * A different text for the browse button.
   */
  browseButtonText?: string;
  /**
   * Custom Add Button.
   */
  addButton?: ReactElement<ButtonProps>;
  /**
   * Custom Reset Button.
   */
  resetButton?: ReactElement<ButtonProps>;
  /**
   * A different text for the reset button.
   */
  resetButtonText?: string;
  /**
   * Drag and Drop zone text default to Drop files here
   */
  dragDropZoneText?: string;
  /**
   * Custom Upload Button.
   */
  uploadButton?: ReactElement<ButtonProps>;
  /**
   * Custom element to display buttons such as the browse button in customized design and order.
   */
  buttons?: (
    onBrowse: () => void,
    onAdd: () => void,
    onReset: () => void,
  ) => ReactElement<HTMLElement>;
  /**
   * If set to true, multiple files can be selected from the device.
   * @default false
   */
  multiple?: boolean;
  /**
   * Accept certain file format(s).
   */
  accept?: string;
  /**
   * Custom Element for an Upload File Item.
   */
  fileItemElement?: (file: File) => ReactElement<HTMLElement>;
  /**
   * Custom Element for topbar of the component.
   */
  topbar?: ReactElement<HTMLElement>;
  /**
   * Triggered when file(s) selected, added or removed.
   */
  onChange?: (files: File[]) => void;
  /**
   * Whether to show the paste button
   * @default false
   */
  showPasteButton?: boolean;

  /**
   * Text to display on the paste button
   * @default "Paste"
   */
  pasteButtonText?: string;

  /**
   * Custom paste button element
   */
  pasteButton?: ReactElement<ButtonProps>;
}

export type UseFileUploadProps = Props & FileUploadVariantProps;

export function useFileUpload(originalProps: UseFileUploadProps) {
  const [props, variantProps] = mapPropsVariants(
    originalProps,
    fileUpload.variantKeys,
  );

  const {
    ref,
    as,
    className,
    multiple = false,
    browseButtonText = "Browse",
    resetButtonText = "Reset",
    dragDropZoneText = "Drop files here",
    ...otherProps
  } = props;

  const Component = as || "div";

  const domRef = useDOMRef(ref);

  const styles = useMemo(
    () =>
      fileUpload({
        ...variantProps,
        className,
      }),
    [objectToDeps(variantProps), className],
  );

  return {
    Component,
    styles,
    domRef,
    className,
    multiple,
    dragDropZoneText,
    browseButtonText,
    resetButtonText,
    ...otherProps,
  };
}

export type UseFileUploadReturn = ReturnType<typeof useFileUpload>;
