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
import { forwardRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/button";

import FileUpload, { FileUploadProps } from "./file-upload/file-upload";

export interface ImageUploadProps extends Omit<FileUploadProps, "onChange"> {
  /**
   * Function called when images are selected, added, or removed
   */
  onChange?: (
    files: File[],
    convertedImages?: { original: File; converted: string }[],
  ) => void;

  /**
   * Whether to convert images to WebP format
   * @default false
   */
  convertToWebp?: boolean;

  /**
   * Quality of the WebP conversion (0-1)
   * @default 0.8
   */
  webpQuality?: number;

  /**
   * Whether to limit image size
   * @default false
   */
  limitSize?: boolean;

  /**
   * Maximum dimension (width or height) for images
   * @default 1000
   */
  maxDimension?: number;

  /**
   * Show preview of images
   * @default true
   */
  showPreview?: boolean;

  /**
   * Preview size in pixels
   * @default 150
   */
  previewSize?: number;

  /**
   * Maximum file size in bytes
   * @default undefined
   */
  maxFileSize?: number;
}

/**
 * A specialized component for uploading and processing images.
 * Extends FileUpload with image-specific features like WebP conversion
 * and size limiting while maintaining aspect ratio.
 * @example
 * ```tsx
 * <ImageUpload
 *            convertToWebp
 *            limitSize
 *            multiple
 *            showPasteButton
 *            accept="image/png, image/jpeg, image/webp, image/gif"
 *            addButtonText="Add"
 *            browseButtonText="Browsr"
 *            className="rounded p-1 my-4"
 *            dragDropZoneText="Drop your image here"
 *            maxDimension={800}
 *            maxFileSize={10 * 1024 * 1024} // 10MB max
 *            pasteButtonText="Paste"
 *            previewSize={120}
 *            resetButtonText="Reset"
 *            webpQuality={0.7}
 *          />
 * ```
 */
const ImageUpload = forwardRef<"div", ImageUploadProps>((props, ref) => {
  const {
    onChange,
    convertToWebp = false,
    webpQuality = 0.8,
    limitSize = false,
    maxDimension = 1000,
    showPreview = true,
    previewSize = 150,
    maxFileSize,
    accept = "image/png, image/jpeg, image/gif, image/webp",
    ...fileUploadProps
  } = props;

  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ id: string; url: string }[]>([]);
  const [convertedImages, setConvertedImages] = useState<
    { original: File; converted: string }[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Process images whenever files change
  useEffect(() => {
    const processImages = async () => {
      if (!files.length) {
        setPreviews([]);
        setConvertedImages([]);

        return;
      }

      setIsProcessing(true);

      try {
        const newPreviews: { id: string; url: string }[] = [];
        const newConvertedImages: { original: File; converted: string }[] = [];

        for (const file of files) {
          // Check file size if maxFileSize is provided
          if (maxFileSize && file.size > maxFileSize) {
            // eslint-disable-next-line no-console
            console.warn(
              `File ${file.name} exceeds maximum size of ${maxFileSize} bytes`,
            );
            continue;
          }

          // Create unique ID for the file
          const fileId = `${file.name}-${file.lastModified}-${file.size}`;

          // Process image based on settings
          let processedImage: string | null = null;

          if (convertToWebp || limitSize) {
            processedImage = await getWebpConvertedImageContent(
              file,
              webpQuality,
              limitSize ? maxDimension : Number.MAX_SAFE_INTEGER,
            );
          } else {
            // Just create a standard preview URL
            processedImage = URL.createObjectURL(file);
          }

          if (processedImage) {
            newPreviews.push({ id: fileId, url: processedImage });

            if (convertToWebp || limitSize) {
              newConvertedImages.push({
                original: file,
                converted: processedImage,
              });
            }
          }
        }

        setPreviews(newPreviews);
        setConvertedImages(newConvertedImages);

        // Call onChange with the processed results
        onChange?.(
          files,
          newConvertedImages.length > 0 ? newConvertedImages : undefined,
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error processing images:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    processImages();

    // Clean up URLs when component unmounts or files change
    return () => {
      // Only revoke URLs that are not data URLs (convertToWebp creates data URLs)
      if (!convertToWebp && !limitSize) {
        previews.forEach((preview) => {
          if (preview.url.startsWith("blob:")) {
            URL.revokeObjectURL(preview.url);
          }
        });
      }
    };
  }, [
    files,
    convertToWebp,
    webpQuality,
    limitSize,
    maxDimension,
    maxFileSize,
    onChange,
  ]);

  // Handle file change from FileUpload
  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles);
  };

  return (
    <div className="image-upload-container">
      <FileUpload
        ref={ref as any}
        {...fileUploadProps}
        accept={accept}
        onChange={handleFileChange}
      />

      {isProcessing && (
        <div className="mt-2 text-sm text-blue-600">
          <div className="flex items-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                fill="currentColor"
              />
            </svg>
            {t("Processing images...")}
          </div>
        </div>
      )}

      {showPreview && previews.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">{t("Image Preview")}</h3>
          <div className="flex flex-wrap gap-3">
            {previews.map((preview) => (
              <div
                key={preview.id}
                className="relative border rounded-lg overflow-hidden"
                style={{ width: previewSize, height: previewSize }}
              >
                <img
                  alt="Preview"
                  className="w-full h-full object-cover"
                  src={preview.url}
                />
                {(convertToWebp || limitSize) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                    {convertToWebp && limitSize
                      ? `WebP ${limitSize ? `(max ${maxDimension}px)` : ""}`
                      : convertToWebp
                        ? "WebP"
                        : `Max ${maxDimension}px`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {convertedImages.length > 0 && (
        <div className="mt-4">
          <Button
            color="primary"
            size="sm"
            onClick={() => {
              // Download all converted images as a zip file
              // This is just a placeholder - you'll need to implement zip functionality
              // or handle downloads individually
              const firstImage = convertedImages[0];
              const link = document.createElement("a");

              link.href = firstImage.converted;
              link.download = `${firstImage.original.name.split(".")[0]}.webp`;
              link.click();
            }}
          >
            {t("Download Converted Images")}
          </Button>
        </div>
      )}
    </div>
  );
});

ImageUpload.displayName = "HeroUI.ImageUpload";

export default ImageUpload;

/**
 * Converts an image file to WebP format with customizable quality and maximum dimension
 * @param file Image file to convert
 * @param quality WebP quality (0-1, default 0.8)
 * @param maxDimension Maximum size for the largest dimension (width or height)
 * @returns Promise resolving to WebP image as data URL or null if no file
 */
const getWebpConvertedImageContent = (
  file?: File | null,
  quality = 0.8,
  maxDimension = Number.MAX_SAFE_INTEGER,
): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);

      return;
    }

    // Check if the file is already a WebP image
    if (file.type === "image/webp") {
      // We still need to read and possibly resize the WebP image
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          // Check if we need to resize
          if (image.width <= maxDimension && image.height <= maxDimension) {
            // No resizing needed, return as is
            resolve(reader.result as string);

            return;
          }

          // Need to resize, continue with canvas
          const { width, height } = calculateDimensions(
            image.width,
            image.height,
            maxDimension,
          );

          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Failed to get 2D context"));

            return;
          }

          // Draw resized image
          context.drawImage(image, 0, 0, width, height);

          // Export as WebP
          const resizedWebpData = canvas.toDataURL("image/webp", quality);

          resolve(resizedWebpData);
        };

        image.onerror = () => {
          reject(new Error("Failed to load WebP image for resizing"));
        };

        image.src = reader.result as string;
      };

      reader.onerror = () => reject(new Error("Failed to read WebP file"));
      reader.readAsDataURL(file);

      return;
    }

    try {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          // Calculate new dimensions while maintaining aspect ratio
          const { width, height } = calculateDimensions(
            image.width,
            image.height,
            maxDimension,
          );

          // Create canvas with calculated dimensions
          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          // Get drawing context
          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Failed to get 2D context"));

            return;
          }

          // Draw image to canvas (resized)
          context.drawImage(image, 0, 0, width, height);

          // Try to convert to WebP with custom quality
          const webpDataUrl = canvas.toDataURL("image/webp", quality);

          // Verify if conversion was successful by checking if format changed
          if (webpDataUrl.startsWith("data:image/webp")) {
            resolve(webpDataUrl);
          } else {
            // Fallback - this browser might not support WebP output
            // eslint-disable-next-line no-console
            console.warn(
              "Browser may not support WebP conversion. Falling back to original format.",
            );

            // Check the original file type and use that instead
            const originalFormat = file.type || "image/png";

            resolve(canvas.toDataURL(originalFormat, quality));
          }
        };

        image.onerror = () => {
          reject(new Error("Failed to load image"));
        };

        image.src = reader.result as string;
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Calculate new dimensions while maintaining aspect ratio
 * @param originalWidth Original width of the image
 * @param originalHeight Original height of the image
 * @param maxDimension Maximum allowed dimension
 * @returns Object with new width and height
 */
const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxDimension: number,
): { width: number; height: number } => {
  // If image is already smaller than max dimension, return original size
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }

  // Determine which dimension is larger
  if (originalWidth > originalHeight) {
    // Width is the limiting factor
    const ratio = originalHeight / originalWidth;

    return {
      width: maxDimension,
      height: Math.round(maxDimension * ratio),
    };
  } else {
    // Height is the limiting factor
    const ratio = originalWidth / originalHeight;

    return {
      width: Math.round(maxDimension * ratio),
      height: maxDimension,
    };
  }
};
