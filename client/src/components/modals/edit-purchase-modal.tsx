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
import { FormEvent, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { I18nProvider } from "@react-aria/i18n";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    ModalProps,
    ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Form } from "@heroui/form";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";
import { DatePicker } from "@heroui/date-picker";
import { Input } from "@heroui/input";
import { addToast } from "@heroui/toast";
import { NumberInput } from "@heroui/number-input";

import { useSecuredApi } from "../auth0";

import { ImageUpload } from "@/components/image-upload";

/**
 * Modal component for editing an existing purchase record
 *
 * Provides a form with fields for:
 * - Order number
 * - Product description
 * - Purchase amount
 * - Purchase date
 * - Receipt screenshot
 *
 * Features:
 * - Pre-fills form fields with existing purchase data
 * - Form validation for all required fields
 * - Image upload with preview
 * - Form reset functionality
 * - Loading state during submission
 * - Success/error toast notifications
 *
 * @param {Object} props - Component props
 * @param {string} props.purchaseId - The ID of the purchase to edit
 * @param {Function} [props.onSuccess] - Optional callback to execute after successful update
 * @param {boolean} props.isOpen - Whether the modal is currently visible
 * @param {Function} props.onClose - Function to close the modal
 * @returns {JSX.Element} The rendered modal component
 */
export default function EditPurchaseModal({
    purchaseId,
    onSuccess,
    ...props
}: {
    purchaseId: string;
    onSuccess?: () => void;
} & ModalProps) {
    const { t, i18n } = useTranslation();
    const { postJson, getJson } = useSecuredApi();
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [screenshotSummary, setScreenshotSummary] = useState<string | null>(
        null,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [orderNumber, setOrderNumber] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [amount, setAmount] = useState<number>(0);
    const formRef = useRef<HTMLFormElement>(null);

    /**
     * Loads the existing purchase data when the modal opens
     */
    useEffect(() => {
        if (props.isOpen && purchaseId) {
            loadPurchaseData();
        }
    }, [props.isOpen, purchaseId]);

    /**
     * Loads the purchase data from the API and pre-fills the form
     */
    const loadPurchaseData = async () => {
        setIsLoading(true);
        try {
            const response = await getJson(
                `${import.meta.env.API_BASE_URL}/purchase/${purchaseId}`,
            );

            if (response.success && response.data) {
                const purchase = response.data;
                setOrderNumber(purchase.order || "");
                setDescription(purchase.description || "");
                setAmount(purchase.amount || 0);
                setSelectedDate(purchase.date || null);
                setScreenshot(purchase.screenshot || null);
                setScreenshotSummary(purchase.screenshotSummary || null);
            } else {
                addToast({
                    title: t("error"),
                    description: t("error-loading-purchase"),
                    variant: "solid",
                    timeout: 5000,
                });
            }
        } catch (error) {
            console.error("Error loading purchase:", error);
            addToast({
                title: t("error"),
                description: t("error-loading-purchase"),
                variant: "solid",
                timeout: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

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
     * Handles form submission to update the existing purchase
     * Validates all form fields, submits the data to the API, and handles the response
     *
     * @returns {Promise<void>} A promise that resolves when the submission is complete
     */
    const handleSubmit = async () => {
        console.log("HandleSubmit called - starting update process");

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
            // Use selected date or keep the original date
            const date = selectedDate || new Date().toISOString().split("T")[0];
            const data = {
                date,
                order: orderNumber,
                description,
                amount,
                screenshot,
                screenshotSummary,
            };

            console.log("Sending update data:", data);
            console.log("Update URL:", `${import.meta.env.API_BASE_URL}/purchase/${purchaseId}`);

            const response = await postJson(
                `${import.meta.env.API_BASE_URL}/purchase/${purchaseId}`,
                data,
            );

            console.log("Update response:", response);

            if (response.success) {
                addToast({
                    title: t("success"),
                    description: t("purchase-updated-successfully"),
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
                    description: response.error || t("error-updating-purchase"),
                    variant: "solid",
                    timeout: 5000,
                });
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Error updating purchase:", error);
            addToast({
                title: t("error"),
                description: t("error-updating-purchase"),
                variant: "solid",
                timeout: 5000,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handles the form submission event
     */
    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await handleSubmit();
    };

    /**
     * Resets the form to its initial state by reloading data from the API
     */
    const resetForm = () => {
        loadPurchaseData();
    };

    return (
        <Modal
            {...props}
            aria-labelledby="edit-purchase-title"
            isDismissable={!isSubmitting && !isLoading}
            size="2xl"
        >
            <ModalContent>
                <ModalHeader id="edit-purchase-title">
                    {t("edit-purchase")}
                </ModalHeader>
                <ModalBody>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="text-lg">{t("loading-purchase-data")}</div>
                        </div>
                    ) : (
                        <Form ref={formRef} onSubmit={handleFormSubmit}>
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
                                        label={t("purchase-date")}
                                        value={selectedDate ? parseDate(selectedDate) : today(getLocalTimeZone())}
                                        onChange={handleDateChange}
                                    />
                                </I18nProvider>
                            </div>

                            <div className="mb-4">
                                <div className="text-sm font-medium mb-2">{t("receipt-screenshot")}</div>
                                {screenshot && (
                                    <div className="mb-2">
                                        <img
                                            alt="Current screenshot"
                                            className="max-w-32 max-h-32 object-cover rounded border"
                                            src={screenshot}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">{t("current-screenshot")}</p>
                                    </div>
                                )}
                                <ImageUpload
                                    convertToWebp
                                    limitSize
                                    showPasteButton
                                    accept="image/png, image/jpeg, image/webp, image/gif"
                                    browseButtonText={t("browse")}
                                    dragDropZoneText={t("drop-your-receipt-here")}
                                    maxDimension={parseInt(
                                        import.meta.env.DB_MAX_IMAGE_SIZE || "800",
                                    )}
                                    maxFileSize={4 * 1024 * 1024}
                                    pasteButtonText={t("paste")}
                                    previewSize={120}
                                    resetButtonText={t("reset")}
                                    webpQuality={0.7}
                                    onChange={handleFileScreenshotChange}
                                />
                            </div>

                            <div className="mb-4">
                                <div className="text-sm font-medium mb-2">{t("receipt-screenshot_summary")}</div>
                                {screenshotSummary && (
                                    <div className="mb-2">
                                        <img
                                            alt="Current screenshot summary"
                                            className="max-w-32 max-h-32 object-cover rounded border"
                                            src={screenshotSummary}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">{t("current-screenshot-summary")}</p>
                                    </div>
                                )}
                                <ImageUpload
                                    convertToWebp
                                    limitSize
                                    showPasteButton
                                    accept="image/png, image/jpeg, image/webp, image/gif"
                                    browseButtonText={t("browse")}
                                    dragDropZoneText={t("drop-your-receipt-here")}
                                    maxDimension={parseInt(
                                        import.meta.env.DB_MAX_IMAGE_SIZE || "800",
                                    )}
                                    maxFileSize={4 * 1024 * 1024}
                                    pasteButtonText={t("paste")}
                                    previewSize={120}
                                    resetButtonText={t("reset")}
                                    webpQuality={0.7}
                                    onChange={handleFileScreenshotSummaryChange}
                                />
                            </div>
                        </Form>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="light"
                        onPress={() => props.onClose?.()}
                        isDisabled={isSubmitting || isLoading}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        color="primary"
                        onPress={() => resetForm()}
                        isDisabled={isSubmitting || isLoading}
                    >
                        {t("reset")}
                    </Button>
                    <Button
                        color="primary"
                        isLoading={isSubmitting}
                        onPress={() => handleSubmit()}
                        isDisabled={isLoading}
                    >
                        {isSubmitting ? t("updating") : t("update-purchase")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
