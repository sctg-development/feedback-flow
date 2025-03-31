import { FormEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { I18nProvider } from "@react-aria/i18n";
import { useAuth0 } from "@auth0/auth0-react";
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

import { postJsonToSecuredApi } from "./auth0";

import { ImageUpload } from "@/components/image-upload";

export default function CreatePurchaseModal({
  onSuccess,
  ...props
}: {
  onSuccess?: () => void;
} & ModalProps) {
  const { t, i18n } = useTranslation();
  const { getAccessTokenSilently } = useAuth0();
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileChange = (
    _files: File[],
    dataUrls:
      | {
          original: File;
          converted: string;
        }[]
      | undefined,
  ) => {
    if (dataUrls && dataUrls.length > 0) {
      // Extract the base64 part of the data URL
      const base64String = dataUrls[0].converted;

      setScreenshot(base64String);
    } else {
      setScreenshot(null);
    }
  };

  const handleDateChange = (date: any) => {
    // Convert date to YYYY-MM-DD format
    if (date) {
      const formattedDate = date.toString();

      setSelectedDate(formattedDate);
    }
  };

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
      };

      const response = await postJsonToSecuredApi(
        `${import.meta.env.API_BASE_URL}/purchase`,
        data,
        getAccessTokenSilently,
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

  const resetForm = () => {
    setScreenshot(null);
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
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                {t("order-number")}
              </label>
              <Input
                isRequired
                className="w-full p-2 border rounded"
                name="orderNumber"
                placeholder={t("enter-order-number")}
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                {t("description")}
              </label>
              <Input
                isRequired
                className="w-full p-2 border rounded"
                name="description"
                placeholder={t("enter-product-description")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                {t("amount")}
              </label>
              <NumberInput
                isRequired
                className="w-full p-2 border rounded"
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
                  className="w-full p-2 border rounded"
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
                onChange={handleFileChange}
              />
              {!screenshot && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("receipt-screenshot-required")}
                </p>
              )}
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
