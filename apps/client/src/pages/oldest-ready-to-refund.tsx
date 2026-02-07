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
import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import {
  Image as PDFImage,
  Page,
  PDFViewer,
  Text,
  View,
  Document,
  StyleSheet,
} from "@react-pdf/renderer";
import { NumberInput } from "@heroui/number-input";

import { useSecuredApi } from "@/components/auth0";
import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { ReadyForRefundPurchase } from "@/types/data";

// Constants
const MAX_OLDEST_READY_TO_REFUND = 10;
const ORDER = "asc";

// PDF styles using StyleSheet for better organization
const styles = StyleSheet.create({
  pageNumber: {
    position: "absolute",
    fontSize: 8,
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "grey",
  },
  page: {
    padding: 10,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  standardText: {
    fontSize: 12,
    marginBottom: 3,
  },
  image: {
    width: "50%",
    height: "auto",
    marginVertical: 5,
  },
  purchaseView: {
    marginBottom: 10,
  },
});

/**
 * Function for converting a webp base64 image url to a png base64 image
 * @param {string} base64DataUrl - The base64 data URL of the webp image
 * @returns {Promise<string>} - A promise that resolves to a base64 image url containing the png conversion
 */
const convertWebpToPng = (
  base64DataUrl: string | undefined,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!base64DataUrl) {
      reject(new Error("No base64 data URL provided"));

      return;
    }

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const pngDataUrl = canvas.toDataURL("image/png");

        resolve(pngDataUrl);
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };

    img.onerror = (error) => {
      reject(error);
    };

    img.src = base64DataUrl;
  });
};

/**
 * Component for rendering PDF content with precalculated image conversions
 * Separating this component helps with performance and code organization
 */
const PurchasePdfDocument = ({
  purchases,
  convertedImages,
}: {
  purchases: ReadyForRefundPurchase[];
  convertedImages: Record<string, string>;
}) => {
  const { t } = useTranslation();

  if (purchases.length === 0) {
    return <p>{t("no-data-available")}</p>;
  }

  return (
    <PDFViewer className="w-full h-screen">
      <Document
        author="Ronan LE MEILLAT"
        creationDate={new Date()}
        creator="SCTG - Feedback Flow"
        keywords="SCTG, Feedback Flow, Refund"
        language="en"
        subject="Oldest ready to refund"
        title="Oldest ready to refund"
      >
        {purchases.map((purchase) => (
          <Page
            key={purchase.id}
            dpi={72}
            size={[446, 632]}
            style={styles.page}
          >
            <View style={styles.purchaseView}>
              <Text style={styles.titleText}>{`Order: ${purchase.order}`}</Text>
              <Text
                style={styles.standardText}
              >{`Date: ${purchase.date}`}</Text>
              <Text
                style={styles.standardText}
              >{`Description: ${purchase.description}`}</Text>
              <Text
                style={styles.standardText}
              >{`Refunded: ${purchase.refunded}`}</Text>
              <Text style={styles.standardText}>
                {`Amount: ${purchase.amount}`} €
              </Text>

              {/* Display purchase screenshot if available */}
              {convertedImages[`screenshot_${purchase.id}`] && (
                <PDFImage
                  src={convertedImages[`screenshot_${purchase.id}`]}
                  style={styles.image}
                />
              )}

              {/* Display publication screenshot if available */}
              {convertedImages[`publication_${purchase.id}`] && (
                <PDFImage
                  src={convertedImages[`publication_${purchase.id}`]}
                  style={styles.image}
                />
              )}
            </View>
            <Text
              fixed
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
              style={styles.pageNumber}
            />
          </Page>
        ))}
      </Document>
    </PDFViewer>
  );
};

/**
 * Main component that displays the oldest purchases ready for refund in a PDF viewer
 * The PDF displays purchase details and screenshots for each purchase that has both
 * feedback and publication but hasn't been refunded yet, sorted by date (oldest first)
 */
export default function OldestReadyToRefundPage() {
  const { t } = useTranslation();
  const { getJson } = useSecuredApi();

  // State management
  const [readyToRefund, setReadyToRefund] = useState<ReadyForRefundPurchase[]>(
    [],
  );
  const [maxReadyToRefund, setMaxReadyToRefund] = useState(
    MAX_OLDEST_READY_TO_REFUND,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [convertedImages, setConvertedImages] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches purchases that are ready for refund and converts their images
   * Memoized to prevent unnecessary re-creation on renders
   */
  const fetchReadyToRefund = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch data from API
      const response = await getJson(
        `${import.meta.env.API_BASE_URL}/purchases/ready-to-refund?limit=${maxReadyToRefund}&order=${ORDER}`,
      );

      if (!response.success) {
        throw new Error(response.error || "Unknown error occurred");
      }

      setReadyToRefund(response.data as ReadyForRefundPurchase[]);

      // Convert images in parallel for better performance
      const imagePromises: Array<Promise<[string, string]>> = [];

      (response.data as ReadyForRefundPurchase[]).forEach((purchase) => {
        if (purchase.screenshot) {
          imagePromises.push(
            convertWebpToPng(purchase.screenshot).then((converted) => [
              `screenshot_${purchase.id}`,
              converted,
            ]),
          );
        }

        if (purchase.publicationScreenShot) {
          imagePromises.push(
            convertWebpToPng(purchase.publicationScreenShot).then(
              (converted) => [`publication_${purchase.id}`, converted],
            ),
          );
        }
      });

      // Wait for all image conversions to complete
      const convertedImageEntries = await Promise.allSettled(imagePromises);

      // Process results, including only successful conversions
      const newConvertedImages: Record<string, string> = {};

      convertedImageEntries.forEach((result) => {
        if (result.status === "fulfilled") {
          const [key, value] = result.value;

          newConvertedImages[key] = value;
        }
      });

      setConvertedImages(newConvertedImages);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error fetching or processing data:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [maxReadyToRefund]);

  // Fetch data when component mounts or when max items changes
  useEffect(() => {
    fetchReadyToRefund();
  }, [maxReadyToRefund]);

  return (
    <DefaultLayout>
      {/* Page title and description */}
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <h1 className={title()}>{t("oldest-ready-to-refund")}</h1>
          <p>{t("oldest-ready-to-refund-description")}</p>
        </div>
      </section>

      {/* Controls section */}
      <section className="flex flex-col gap-4 mb-4">
        <div className="flex w-full items-left">
          <NumberInput
            className="w-52"
            defaultValue={MAX_OLDEST_READY_TO_REFUND}
            label={t("max-number-of-items")}
            maxValue={100}
            minValue={1}
            placeholder="Max number of items"
            step={1}
            onValueChange={(value: number) =>
              setMaxReadyToRefund(Math.round(value))
            }
          />
          {/* Reload button */}
          <div className="flex items-center justify-center">
            <button
              className="mx-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading}
              onClick={() => fetchReadyToRefund()}
            >
              {isLoading ? t("loading") : t("reload")}
            </button>
          </div>
        </div>
      </section>

      {/* Error message display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>
            {t("error")}: {error}
          </p>
        </div>
      )}

      {/* PDF viewer section */}
      <section className="flex flex-col items-center justify-center min-w-full lg:min-w-2xl">
        {isLoading ? (
          <p>{t("loading")}</p>
        ) : (
          <PurchasePdfDocument
            convertedImages={convertedImages}
            purchases={readyToRefund}
          />
        )}
      </section>
    </DefaultLayout>
  );
}
