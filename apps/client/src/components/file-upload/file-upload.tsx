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
import { forwardRef } from "@heroui/system";
import { Button } from "@heroui/button";
import {
  cloneElement,
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { clsx } from "@heroui/shared-utils";
import { useTranslation } from "react-i18next";

import { PasteIcon } from "../icons";

import { UseFileUploadProps, useFileUpload } from "./use-file-upload";
import FileUploadItem from "./file-upload-item";

export interface FileUploadProps extends UseFileUploadProps {}

const FileUpload = forwardRef<"div", FileUploadProps>((props, ref) => {
  const {
    Component,
    domRef,
    children,
    files: initialFiles,
    styles,
    className,
    classNames,
    multiple,
    accept,
    browseButton,
    browseButtonText,
    addButton,
    addButtonText,
    resetButton,
    resetButtonText,
    uploadButton,
    dragDropZoneText,
    buttons,
    fileItemElement,
    topbar,
    onChange,
    showPasteButton = false,
    pasteButtonText = "Paste",
    pasteButton,
    ...otherProps
  } = useFileUpload({ ...props, ref });

  const inputFileRef = useRef<HTMLInputElement>(null);
  const singleInputFileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>(initialFiles ?? []);
  const [isDragging, setIsDragging] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    initialFiles && setFiles(initialFiles);
  }, [initialFiles]);

  const updateFiles = useCallback(
    (files: File[]) => {
      setFiles(files);
      onChange?.(files);
      // Setting input values to "" in order to ignore previously-selected file(s).
      // This will fix some bugs when "removing" and re-adding "the exact same" file(s) (e.g. removing foo.txt and adding foo.txt again).
      if (inputFileRef.current) inputFileRef.current.value = "";
      if (singleInputFileRef.current) singleInputFileRef.current.value = "";
    },
    [setFiles, onChange],
  );

  // Check if file type is acceptable
  const isAcceptableFileType = useCallback(
    (file: File): boolean => {
      if (!accept) return true;

      // Split the accept string into individual MIME types or extensions
      const acceptableTypes = accept.split(",").map((type) => type.trim());

      // Check if the file type matches any of the acceptable types
      return acceptableTypes.some((type) => {
        // If accept type is a MIME type (e.g. "image/jpeg")
        if (type.includes("/")) {
          // Handle wildcards like "image/*"
          if (type.endsWith("/*")) {
            const category = type.split("/")[0];

            return file.type.startsWith(`${category}/`);
          }

          return file.type === type;
        }
        // If accept type is a file extension (e.g. ".jpg")
        else if (type.startsWith(".")) {
          const extension = type.toLowerCase();

          return file.name.toLowerCase().endsWith(extension);
        }

        return false;
      });
    },
    [accept],
  );

  // Filter files to only include acceptable types
  const filterAcceptableFiles = useCallback(
    (files: File[]): File[] => {
      return files.filter((file) => isAcceptableFileType(file));
    },
    [isAcceptableFileType],
  );

  // Handle drag events
  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (props.isDisabled) return;
      setIsDragging(true);
    },
    [props.isDisabled],
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (props.isDisabled) return;
      setIsDragging(true);
    },
    [props.isDisabled],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (props.isDisabled) return;

      const droppedFiles: File[] = [];

      // Handle drag and drop
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // Convert FileList to Array
        const fileList = e.dataTransfer.files;

        for (let i = 0; i < fileList.length; i++) {
          droppedFiles.push(fileList[i]);
        }

        // Filter files by accepted types
        const acceptableFiles = filterAcceptableFiles(droppedFiles);

        if (acceptableFiles.length === 0) {
          // eslint-disable-next-line no-console
          console.warn("No acceptable file types were dropped");

          return;
        }

        // Update files based on multiple flag
        if (multiple) {
          updateFiles([...files, ...acceptableFiles]);
        } else {
          // If not multiple, just take the first file
          updateFiles([acceptableFiles[0]]);
        }
      }
    },
    [props.isDisabled, multiple, files, filterAcceptableFiles, updateFiles],
  );

  // Add new state to track paste errors
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Function to convert clipboard items to files
  const clipboardItemToFile = useCallback(
    async (item: ClipboardItem): Promise<File | null> => {
      // Get all types from the clipboard item
      const types = item.types;

      // If accept prop exists, check if the item type is acceptable
      if (accept) {
        const acceptableTypes = accept.split(",").map((type) => type.trim());

        // Find a matching type
        const matchingType = types.find((type) => {
          // Check for direct match
          if (acceptableTypes.includes(type)) return true;

          // Check for wildcard matches (e.g., "image/*")
          return acceptableTypes.some((acceptType) => {
            if (acceptType.endsWith("/*")) {
              const category = acceptType.split("/")[0];

              return type.startsWith(`${category}/`);
            }

            return false;
          });
        });

        if (!matchingType) {
          // No acceptable types found
          return null;
        }

        // Try to get the blob for the matching type
        try {
          const blob = await item.getType(matchingType);

          // Create a file from the blob
          const fileName = `pasted-${new Date().getTime()}.${getExtensionFromMimeType(matchingType)}`;

          return new File([blob], fileName, { type: matchingType });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error getting clipboard item:", error);

          return null;
        }
      } else {
        // If no accept prop, try to get the first type
        try {
          const firstType = types[0];
          const blob = await item.getType(firstType);

          // Create a file from the blob
          const fileName = `pasted-${new Date().getTime()}.${getExtensionFromMimeType(firstType)}`;

          return new File([blob], fileName, { type: firstType });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error getting clipboard item:", error);

          return null;
        }
      }
    },
    [accept],
  );

  // Helper function to get file extension from MIME type
  const getExtensionFromMimeType = (mimeType: string): string => {
    const mimeToExt: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "text/plain": "txt",
      "application/pdf": "pdf",
      "application/json": "json",
      "application/xml": "xml",
      "text/html": "html",
      "text/csv": "csv",
    };

    return mimeToExt[mimeType] || "bin";
  };

  // Function to handle pasting from clipboard
  const handlePaste = useCallback(async () => {
    try {
      setPasteError(null);

      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setPasteError(t("clipboard-api-not-supported-in-this-browser"));

        return;
      }

      // Read clipboard data
      const clipboardItems = await navigator.clipboard.read();

      if (clipboardItems.length === 0) {
        setPasteError(t("clipboard-is-empty"));

        return;
      }

      // Convert clipboard items to files
      const newFiles: File[] = [];

      for (const item of clipboardItems) {
        const file = await clipboardItemToFile(item);

        if (file) {
          newFiles.push(file);
        }
      }

      if (newFiles.length === 0) {
        setPasteError(
          t("no-acceptable-content-found-in-clipboard", {
            acceptableTypes: accept ? accept : "",
          }),
        );

        return;
      }

      // Update files based on multiple flag
      if (multiple) {
        updateFiles([...files, ...newFiles]);
      } else {
        // If not multiple, just use the first file
        updateFiles([newFiles[0]]);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error pasting from clipboard:", error);
      setPasteError(t("failed-to-paste-from-clipboard"));
    }
  }, [multiple, files, clipboardItemToFile, updateFiles, accept]);

  // Create paste button element
  const pasteButtonElement = useMemo(
    () =>
      pasteButton ? (
        cloneElement(pasteButton, {
          disabled: props.isDisabled,
          onPress: (ev) => {
            handlePaste();
            pasteButton.props.onPress?.(ev);
          },
        })
      ) : (
        <Button
          color="secondary"
          disabled={props.isDisabled}
          startContent={<PasteIcon />}
          onPress={handlePaste}
        >
          {pasteButtonText}
        </Button>
      ),
    [pasteButton, pasteButtonText, handlePaste, props.isDisabled],
  );

  const topbarElement = useMemo(() => {
    if (topbar) {
      return cloneElement(topbar, {
        className: styles.topbar({
          class: clsx(classNames?.topbar, topbar?.props.className),
        }),
      });
    }
  }, [styles, classNames, topbar]);

  const items = useMemo(
    () =>
      files.map((file) => {
        if (!fileItemElement) {
          return (
            <FileUploadItem
              key={`${file.name}-${file.lastModified}-${file.size}`}
              className={styles.item()}
              file={file}
              isDisabled={props.isDisabled}
              onFileRemove={(fileToRemove) => {
                if (props.isDisabled) return;
                const newFiles = files.filter((file) => {
                  const fileInfo = `${file.name}-${file.lastModified}-${file.size}`;
                  const fileToRemoveInfo = `${fileToRemove.name}-${fileToRemove.lastModified}-${fileToRemove.size}`;

                  return fileInfo !== fileToRemoveInfo;
                });

                updateFiles(newFiles);
              }}
            />
          );
        }

        const customFileElm = fileItemElement(file);

        return cloneElement(customFileElm, {
          key: file.name,
          className: styles.item({
            class: clsx(classNames?.item, customFileElm.props.className),
          }),
        });
      }),
    [styles, classNames, files, fileItemElement, updateFiles],
  );

  const onBrowse = useCallback(() => {
    if (props.isDisabled) return;
    inputFileRef.current?.click();
  }, [props.isDisabled]);

  const onAdd = useCallback(() => {
    if (props.isDisabled) return;
    singleInputFileRef.current?.click();
  }, [props.isDisabled]);

  const onReset = useCallback(() => {
    if (props.isDisabled) return;
    updateFiles([]);
  }, [props.isDisabled]);

  const browseButtonElement = useMemo(
    () =>
      browseButton ? (
        cloneElement(browseButton, {
          disabled: props.isDisabled,
          onPress: (ev) => {
            onBrowse();
            browseButton.props.onPress?.(ev);
          },
        })
      ) : (
        <Button disabled={props.isDisabled} onPress={() => onBrowse()}>
          {browseButtonText}
        </Button>
      ),
    [browseButton, browseButtonText, onBrowse, props.isDisabled],
  );

  const addButtonElement = useMemo(
    () =>
      addButton ? (
        cloneElement(addButton, {
          disabled: props.isDisabled,
          onPress: (ev) => {
            onAdd();
            addButton.props.onPress?.(ev);
          },
        })
      ) : (
        <Button
          color="secondary"
          disabled={props.isDisabled}
          onPress={() => onAdd()}
        >
          {addButtonText}
        </Button>
      ),
    [addButton, onAdd],
  );

  const resetButtonElement = useMemo(
    () =>
      resetButton ? (
        cloneElement(resetButton, {
          disabled: props.isDisabled,
          onPress: (ev) => {
            onReset();
            resetButton.props.onPress?.(ev);
          },
        })
      ) : (
        <Button
          color="primary"
          disabled={props.isDisabled}
          onPress={() => {
            onReset();
          }}
        >
          {resetButtonText}
        </Button>
      ),
    [resetButton, resetButtonText, onReset],
  );

  const buttonsElement = useMemo(() => {
    if (!buttons) {
      const uploadButtonElement =
        uploadButton &&
        cloneElement(uploadButton, { disabled: props.isDisabled });

      return (
        <div className={styles.buttons()}>
          {multiple && files.length !== 0 && addButtonElement}
          {files.length !== 0 && resetButtonElement}
          {browseButtonElement}
          {showPasteButton && pasteButtonElement}
          {uploadButtonElement}
        </div>
      );
    }

    const customButtonsElement = buttons(onBrowse, onAdd, onReset);

    return cloneElement(customButtonsElement, {
      className: styles.buttons({
        class: clsx(classNames?.buttons, customButtonsElement.props.className),
      }),
    });
  }, [
    onBrowse,
    onAdd,
    onReset,
    styles,
    multiple,
    files,
    browseButtonElement,
    addButtonElement,
    resetButtonElement,
    uploadButton,
    showPasteButton,
    pasteButtonElement,
  ]);

  // Add dragOver styles to the base styles
  const baseStyles = useMemo(() => {
    return styles.base({
      class: clsx(
        classNames?.base,
        className,
        "relative", // Add relative positioning to the parent component
        isDragging && "border-primary border-dashed border-2 bg-primary-50",
      ),
    });
  }, [styles, classNames?.base, className, isDragging]);

  return (
    <Component
      ref={domRef}
      aria-label="File upload"
      className={baseStyles}
      role="region"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      {...otherProps}
    >
      <input
        ref={inputFileRef}
        accept={accept}
        aria-hidden="true" // Since it's visually hidden
        className="hidden"
        multiple={multiple}
        title="file upload"
        type="file"
        onChange={(ev) => {
          if (!ev.target.files?.length) return;
          const newFiles: File[] = [];

          for (let index = 0; index < ev.target.files.length; index++) {
            const file = ev.target.files.item(index);

            file && newFiles.push(file);
          }
          updateFiles(newFiles);
        }}
      />

      <input
        ref={singleInputFileRef}
        accept={accept}
        className="hidden"
        title="single file upload"
        type="file"
        onChange={(ev) => {
          const singleFile = ev.target.files?.item(0);

          if (!singleFile) return;
          if (files.find((file) => file.name === singleFile.name)) return;
          updateFiles([...files, singleFile]);
        }}
      />

      {topbarElement}

      {pasteError && (
        <div className="text-danger text-sm p-2 mt-1 bg-danger-50 rounded">
          {pasteError}
        </div>
      )}

      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary-50 bg-opacity-80 text-primary-600 text-xl font-medium rounded-lg z-10">
          {dragDropZoneText}
        </div>
      )}

      {(files.length || children) && (
        <div className={styles.items()}>
          {children}
          {items}
        </div>
      )}

      {buttonsElement}
    </Component>
  );
});

FileUpload.displayName = "HeroUI.FileUpload";

export default FileUpload;
