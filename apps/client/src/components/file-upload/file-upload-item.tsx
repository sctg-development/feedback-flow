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
import { HTMLHeroUIProps } from "@heroui/system";
import { DeleteIcon } from "@heroui/shared-icons";
import { FC } from "react";

export interface FileUploadItemProps extends HTMLHeroUIProps<"div"> {
  file: File;
  onFileRemove: (file: File) => void;
  isDisabled?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const FileUploadItem: FC<FileUploadItemProps> = ({
  file,
  onFileRemove,
  isDisabled,
  ...otherProps
}) => {
  return (
    <div {...otherProps}>
      <Button
        aria-label={`Remove ${file.name}`}
        isDisabled={isDisabled}
        role="listitem"
        onPress={() => onFileRemove(file)}
      >
        <DeleteIcon />
      </Button>
      <span>{file.name}</span>
      <span>{formatFileSize(file.size)}</span>
      <span>{file.type.split("/").at(1)?.toUpperCase()}</span>
    </div>
  );
};

FileUploadItem.displayName = "HeroUI.FileUploadItem";

export default FileUploadItem;
