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
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Spinner } from "@heroui/spinner";
import { useTranslation } from "react-i18next";
import { Modal, ModalContent } from "@heroui/modal";
import { Button } from "@heroui/button";

import MiniLayout from "@/layouts/mini";
import { CopyButton } from "@/components/copy-button";

interface PublicLinkData {
  orderNumber: string;
  orderDate: string;
  purchaseAmount: number;
  purchaseScreenshot: string;
  secondaryScreenshot?: string;
  feedbackDate: string;
  feedbackText: string;
  publicationDate: string;
  publicationScreenshot: string;
  refundAmount?: number;
  refundTransactionId?: string;
  isRefunded: boolean;
}

export default function LinkPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const [data, setData] = useState<PublicLinkData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Check if url parameter "code" exists and it seems valid (a 7-character alphanumeric string)
  const isValidCode = code && /^[a-zA-Z0-9]{7}$/.test(code);

  useEffect(() => {
    if (!isValidCode) return;

    const fetchLinkData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${import.meta.env.API_BASE_URL}/link/${code}`,
        );
        const result = await response.json();

        if (!result.success) {
          setError(result.error || "Failed to load link data");

          return;
        }

        setData(result.data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while loading the link",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinkData();
  }, [code, isValidCode]);

  if (!isValidCode) {
    return (
      <MiniLayout>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t("invalid-link")}</h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t("invalid-link-code")}
          </p>
        </div>
      </MiniLayout>
    );
  }

  if (isLoading) {
    return (
      <MiniLayout>
        <div className="flex flex-col items-center justify-center gap-4">
          <Spinner size="lg" />
          <p className="text-gray-600 dark:text-gray-300">
            {t("loading-link-data")}
          </p>
        </div>
      </MiniLayout>
    );
  }

  if (error) {
    return (
      <MiniLayout>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">
            {t("error-loading-link")}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
        </div>
      </MiniLayout>
    );
  }

  if (!data) {
    return (
      <MiniLayout>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t("no-data")}</h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t("no-link-data")}
          </p>
        </div>
      </MiniLayout>
    );
  }

  return (
    <MiniLayout>
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          {t("dispute-resolution")}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Purchase Information */}
          <div className="bg-default-50 dark:bg-default-900 rounded-lg p-6 border border-default-200 dark:border-default-800">
            <h2 className="text-xl font-semibold mb-4">{t("purchase-info")}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-600 dark:text-gray-400">
                  {t("order-number")}
                </p>
                <p className="text-gray-900 dark:text-gray-100">
                  {data.orderNumber}
                  <CopyButton value={data.orderNumber} />
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-600 dark:text-gray-400">
                  {t("order-date")}
                </p>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(data.orderDate).toLocaleDateString()}
                  <CopyButton
                    value={new Date(data.orderDate).toLocaleDateString()}
                  />
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-600 dark:text-gray-400">
                  {t("amount")}
                </p>
                <p className="text-gray-900 dark:text-gray-100">
                  €{data.purchaseAmount.toFixed(2)}{" "}
                  <CopyButton value={data.purchaseAmount.toFixed(2)} />
                </p>
              </div>
              {data.purchaseScreenshot && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-600 dark:text-gray-400">
                      {t("purchase-screenshot")}
                    </p>
                    <CopyButton
                      isImage={true}
                      showToast={true}
                      toastText={t("copied-to-clipboard")}
                      value={data.purchaseScreenshot}
                    />
                  </div>
                  <img
                    alt="Purchase receipt"
                    className="w-full rounded border border-default-300 cursor-pointer hover:opacity-75 transition-opacity"
                    src={data.purchaseScreenshot}
                    onClick={() => setSelectedImage(data.purchaseScreenshot)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Feedback Information */}
          <div className="bg-default-50 dark:bg-default-900 rounded-lg p-6 border border-default-200 dark:border-default-800">
            <h2 className="text-xl font-semibold mb-4">{t("feedback-info")}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-600 dark:text-gray-400">
                  {t("feedback-date")}
                </p>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(data.feedbackDate).toLocaleDateString()}
                  <CopyButton
                    value={new Date(data.feedbackDate).toLocaleDateString()}
                  />
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t("feedback-text")}
                </p>
                <p className="text-gray-900 dark:text-gray-100 bg-white dark:bg-default-800 p-3 rounded">
                  {data.feedbackText}
                </p>
              </div>
            </div>
          </div>

          {/* Publication Information */}
          <div className="bg-default-50 dark:bg-default-900 rounded-lg p-6 border border-default-200 dark:border-default-800">
            <h2 className="text-xl font-semibold mb-4">
              {t("publication-info")}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-600 dark:text-gray-400">
                  {t("publication-date")}
                </p>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(data.publicationDate).toLocaleDateString()}
                  <CopyButton
                    value={new Date(data.publicationDate).toLocaleDateString()}
                  />
                </p>
              </div>
              {data.publicationScreenshot && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-600 dark:text-gray-400">
                      {t("publication-screenshot")}
                    </p>
                    <CopyButton
                      isImage={true}
                      showToast={true}
                      toastText={t("copied-to-clipboard")}
                      value={data.publicationScreenshot}
                    />
                  </div>
                  <img
                    alt="Publication proof"
                    className="w-full rounded border border-default-300 cursor-pointer hover:opacity-75 transition-opacity"
                    src={data.publicationScreenshot}
                    onClick={() => setSelectedImage(data.publicationScreenshot)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Refund Information (if applicable) */}
          {data.isRefunded && (
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-6 border border-green-200 dark:border-green-800">
              <h2 className="text-xl font-semibold mb-4 text-green-800 dark:text-green-200">
                {t("refund-info")}
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-green-700 dark:text-green-300">
                    {t("refund-amount")}
                  </p>
                  <p className="text-green-900 dark:text-green-100">
                    €{data.refundAmount?.toFixed(2) || "N/A"}
                  </p>
                </div>
                {data.refundTransactionId && (
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">
                      {t("transaction-id")}
                    </p>
                    <p className="text-green-900 dark:text-green-100 break-all">
                      {data.refundTransactionId}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Image Zoom Modal */}
        <Modal
          className="bg-black"
          isOpen={!!selectedImage}
          size="4xl"
          onClose={() => setSelectedImage(null)}
        >
          <ModalContent className="bg-black/90">
            <div className="relative flex items-center justify-center min-h-96">
              <Button
                isIconOnly
                className="absolute top-4 right-4 z-50"
                variant="flat"
                onPress={() => setSelectedImage(null)}
              >
                ✕
              </Button>
              {selectedImage && (
                <img
                  alt="Full size screenshot"
                  className="max-w-full max-h-[80vh] object-contain"
                  src={selectedImage}
                />
              )}
            </div>
          </ModalContent>
        </Modal>
      </div>
    </MiniLayout>
  );
}
