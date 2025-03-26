import { Button } from "@heroui/button";
import { HTMLHeroUIProps } from "@heroui/system";
import { CloseIcon } from "@heroui/shared-icons";
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
        onClick={() => onFileRemove(file)}
      >
        <CloseIcon />
      </Button>
      <span>{file.name}</span>
      <span>{formatFileSize(file.size)}</span>
      <span>{file.type.split("/").at(1)?.toUpperCase()}</span>
    </div>
  );
};

FileUploadItem.displayName = "HeroUI.FileUploadItem";

export default FileUploadItem;
