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
import { FormEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { I18nProvider } from "@react-aria/i18n";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalProps,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Form } from "@heroui/form";
import { getLocalTimeZone, today } from "@internationalized/date";
import { DatePicker } from "@heroui/date-picker";
import { Input } from "@heroui/input";
import { addToast } from "@heroui/toast";
import { NumberInput } from "@heroui/number-input";

import { useSecuredApi } from "../auth0";

import { ImageUpload } from "@/components/image-upload";

/**
 * Modal component for creating a new purchase record
 *
 * Provides a form with fields for:
 * - Order number
 * - Product description
 * - Purchase amount
 * - Purchase date
 * - Receipt screenshot
 *
 * Features:
 * - Form validation for all required fields
 * - Image upload with preview
 * - Form reset functionality
 * - Loading state during submission
 * - Success/error toast notifications
 *
 * @param {Object} props - Component props
 * @param {Function} [props.onSuccess] - Optional callback to execute after successful creation
 * @param {boolean} props.isOpen - Whether the modal is currently visible
 * @param {Function} props.onClose - Function to close the modal
 * @returns {JSX.Element} The rendered modal component
 */
export default function CreatePurchaseModal({
  onSuccess,
  ...props
}: {
  onSuccess?: () => void;
} & ModalProps) {
  const { t, i18n } = useTranslation();
  const { postJson } = useSecuredApi();
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotSummary, setScreenshotSummary] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Creates a handler for file upload changes
   * Returns a function that sets the provided state to the base64 data of the uploaded image
   *
   * @param {Function} setStateCallback - State setter function to update with the image data
   * @returns {Function} Handler function for the ImageUpload component
   */
  const createImageUploadHandler =
    (setStateCallback: (value: string | null) => void) =>
    (
      _files: File[],
      dataUrls: { original: File; converted: string }[] | undefined,
    ) => {
      if (dataUrls && dataUrls.length > 0) {
        // Extract the base64 part of the data URL
        const base64String = dataUrls[0].converted;

        setStateCallback(base64String);
      } else {
        setStateCallback(null);
      }
    };

  // Create handlers for both screenshot and screenshot summary
  const handleFileScreenshotChange = createImageUploadHandler(setScreenshot);
  const handleFileScreenshotSummaryChange =
    createImageUploadHandler(setScreenshotSummary);
  /**
   * Handles date selection events from the DatePicker component
   * Converts the selected date to a string format and updates state
   *
   * @param {any} date - The date object from the date picker
   */
  const handleDateChange = (date: any) => {
    // Convert date to YYYY-MM-DD format
    if (date) {
      const formattedDate = date.toString();

      setSelectedDate(formattedDate);
    }
  };

  /**
   * Handles form submission to create a new purchase
   * Validates all form fields, submits the data to the API, and handles the response
   *
   * @param {FormEvent} e - The form submission event
   * @returns {Promise<void>} A promise that resolves when the submission is complete
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Form validation
    if (!screenshot) {
      addToast({
        title: t("error"),
        description: t("please-upload-receipt-screenshot"),
        variant: "solid",
        timeout: 5000,
      });

      return;
    }

    if (!orderNumber.trim()) {
      addToast({
        title: t("error"),
        description: t("please-enter-order-number"),
        variant: "solid",
        timeout: 5000,
      });

      return;
    }

    if (!description.trim()) {
      addToast({
        title: t("error"),
        description: t("please-enter-description"),
        variant: "solid",
        timeout: 5000,
      });

      return;
    }

    if (amount <= 0) {
      addToast({
        title: t("error"),
        description: t("please-enter-valid-amount"),
        variant: "solid",
        timeout: 5000,
      });

      return;
    }

    setIsSubmitting(true);

    try {
      // Use selected date or today
      const date = selectedDate || new Date().toISOString().split("T")[0];
      const data = {
        date,
        order: orderNumber,
        description,
        amount,
        screenshot,
        screenshotSummary,
      };

      const response = await postJson(
        `${import.meta.env.API_BASE_URL}/purchase`,
        data,
      );

      if (response.success) {
        addToast({
          title: t("success"),
          description: t("purchase-created-successfully"),
          variant: "solid",
          timeout: 5000,
        });

        // Call success callback instead of reloading page
        if (onSuccess) {
          onSuccess();
        }
        props.onClose?.();
      } else {
        addToast({
          title: t("error"),
          description: t("error-creating-purchase"),
          variant: "solid",
          timeout: 5000,
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error creating purchase:", error);
      addToast({
        title: t("error"),
        description: t("error-creating-purchase"),
        variant: "solid",
        timeout: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resets the form to its initial state
   * Clears all input fields, the screenshot, and selected date
   */
  const resetForm = () => {
    setScreenshot(null);
    setScreenshotSummary(null);
    setSelectedDate(null);
    setOrderNumber("");
    setDescription("");
    setAmount(0);
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  return (
    <Modal
      {...props}
      aria-labelledby="create-purchase-title"
      isDismissable={!isSubmitting}
    >
      <ModalContent>
        <ModalHeader id="create-purchase-title">
          {t("create-new-purchase")}
        </ModalHeader>
        <ModalBody>
          <Form ref={formRef} onSubmit={handleSubmit}>
            <div className="mb-4 w-full">
              <Input
                isRequired
                label={t("order-number")}
                name="orderNumber"
                placeholder={t("enter-order-number")}
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
            </div>

            <div className="mb-4 w-full">
              <Input
                isRequired
                label={t("description")}
                name="description"
                placeholder={t("enter-product-description")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <NumberInput
                isRequired
                label={t("amount")}
                min={0.01}
                name="amount"
                placeholder="0.00"
                step={0.01}
                type="number"
                value={amount === 0 ? 0 : amount}
                onValueChange={setAmount}
              />
            </div>

            <div className="mb-4">
              <I18nProvider locale={i18n.language}>
                <DatePicker
                  isRequired
                  defaultValue={today(getLocalTimeZone())}
                  label={t("purchase-date")}
                  maxValue={today(getLocalTimeZone())}
                  minValue={today(getLocalTimeZone()).add({ months: -3 })}
                  name="date"
                  onChange={handleDateChange}
                />
              </I18nProvider>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium">
                {t("receipt-screenshot")}
              </p>
              <ImageUpload
                convertToWebp
                limitSize
                showPasteButton
                accept="image/png, image/jpeg, image/webp, image/gif"
                browseButtonText={t("browse")}
                dragDropZoneText={t("drop-your-receipt-here")}
                maxDimension={800}
                maxFileSize={4 * 1024 * 1024} // 4MB max
                pasteButtonText={t("paste")}
                previewSize={120}
                resetButtonText={t("reset")}
                webpQuality={0.7}
                onChange={handleFileScreenshotChange}
              />
              {!screenshot && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("receipt-screenshot-required")}
                </p>
              )}
            </div>
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium">
                {t("receipt-screenshot_summary")}
              </p>
              <ImageUpload
                convertToWebp
                limitSize
                showPasteButton
                accept="image/png, image/jpeg, image/webp, image/gif"
                browseButtonText={t("browse")}
                dragDropZoneText={t("drop-your-receipt-here")}
                maxDimension={800}
                maxFileSize={4 * 1024 * 1024} // 4MB max
                pasteButtonText={t("paste")}
                previewSize={120}
                resetButtonText={t("reset")}
                webpQuality={0.7}
                onChange={handleFileScreenshotSummaryChange}
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                color="secondary"
                disabled={isSubmitting}
                type="button"
                onPress={resetForm}
              >
                {t("reset")}
              </Button>
              <Button
                color="danger"
                disabled={isSubmitting}
                type="button"
                variant="flat"
                onPress={props.onClose}
              >
                {t("cancel")}
              </Button>
              <Button
                color="primary"
                disabled={
                  isSubmitting ||
                  !screenshot ||
                  !orderNumber.trim() ||
                  !description.trim() ||
                  amount <= 0
                }
                isLoading={isSubmitting}
                type="submit"
              >
                {t("create")}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
