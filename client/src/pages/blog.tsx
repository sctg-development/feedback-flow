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
import { Trans, useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Snippet } from "@heroui/snippet";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import FileUpload from "@/components/file-upload/file-upload";

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
  maxDimension = import.meta.env.DB_MAX_IMAGE_SIZE,
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

export default function BlogPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [webpImage, setWebpImage] = useState<string | null>(null);

  useEffect(() => {
    const convertImage = async () => {
      const webpImage = await getWebpConvertedImageContent(file);

      setWebpImage(webpImage);
    };

    convertImage();
  }, [file]);

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <h1 className={title()}>
            <Trans t={t}>blog</Trans>
          </h1>
        </div>
        <FileUpload
          showPasteButton
          accept="image/png, image/jpeg, image/webp"
          browseButtonText={t("browse")}
          dragDropZoneText={t("drop-your-image-here")}
          pasteButtonText={t("paste-from-clipboard")}
          resetButtonText={t("reset")}
          onChange={(file) => setFile(file[0])}
        />
        {webpImage && (
          <>
            <img alt="WebP image" className="rounded-xl" src={webpImage} />
            <Snippet
              className="max-w-2xs sm:max-w-sm md:max-w-md lg:max-w-3xl"
              symbol=""
              title="webp-image"
            >
              <div className="max-w-xs sm:max-w-xs md:max-w-sm lg:max-w-2xl whitespace-break-spaces  text-wrap break-words">
                {webpImage}
              </div>
            </Snippet>{" "}
          </>
        )}
      </section>
    </DefaultLayout>
  );
}
