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
    browseButtonText,
    resetButtonText,
    ...otherProps,
  };
}

export type UseFileUploadReturn = ReturnType<typeof useFileUpload>;
