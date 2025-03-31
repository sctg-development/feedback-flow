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
import { addToast } from "@heroui/toast";

import { postJsonToSecuredApi } from "../auth0";

import { ImageUpload } from "@/components/image-upload";

export default function PublishFeedbackModal({
  purchaseId,
  onSuccess,
  ...props
}: {
  purchaseId: string;
  onSuccess?: () => void;
} & ModalProps) {
  const { t, i18n } = useTranslation();
  const { getAccessTokenSilently } = useAuth0();
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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
      // Extraire la partie base64 de l'URL de données
      const base64String = dataUrls[0].converted;

      setScreenshot(base64String);
    } else {
      setScreenshot(null);
    }
  };

  const handleDateChange = (date: any) => {
    // Convertir la date au format YYYY-MM-DD
    if (date) {
      const formattedDate = date.toString();

      setSelectedDate(formattedDate);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validation améliorée
    if (!screenshot) {
      addToast({
        title: t("error"),
        description: t("please-upload-screenshot"),
        variant: "solid",
        timeout: 5000,
      });

      return;
    }

    setIsSubmitting(true);

    try {
      // Utiliser la date sélectionnée ou la date du jour
      const date = selectedDate || new Date().toISOString().split("T")[0];
      const data = {
        date,
        purchase: purchaseId,
        screenshot,
      };

      const response = await postJsonToSecuredApi(
        `${import.meta.env.API_BASE_URL}/publish`,
        data,
        getAccessTokenSilently,
      );

      if (response.success) {
        addToast({
          title: t("success"),
          description: t("feedback-published-successfully"),
          variant: "solid",
          timeout: 5000,
        });

        // Appeler le callback de succès au lieu de recharger la page
        if (onSuccess) {
          onSuccess();
        }
        props.onClose?.();
      } else {
        addToast({
          title: t("error"),
          description: t("error-publishing-feedback"),
          variant: "solid",
          timeout: 5000,
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error publishing feedback:", error);
      addToast({
        title: t("error"),
        description: t("error-publishing-feedback"),
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
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  return (
    <Modal
      {...props}
      aria-labelledby="publish-feedback-title"
      isDismissable={!isSubmitting}
    >
      <ModalContent>
        <ModalHeader id="publish-feedback-title">
          {t("publish-feedback")}
        </ModalHeader>
        <ModalBody>
          <p className="mb-4">{t("upload-screenshot-instruction")}</p>
          <Form ref={formRef} onSubmit={handleSubmit}>
            <div className="mb-4">
              <ImageUpload
                convertToWebp
                limitSize
                showPasteButton
                accept="image/png, image/jpeg, image/webp, image/gif"
                browseButtonText={t("browse")}
                dragDropZoneText={t("drop-your-image-here")}
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
                  {t("screenshot-required")}
                </p>
              )}
            </div>

            <div className="mb-4">
              <I18nProvider locale={i18n.language}>
                <DatePicker
                  isRequired
                  defaultValue={today(getLocalTimeZone()).subtract({ days: 1 })}
                  label={t("select-date")}
                  maxValue={today(getLocalTimeZone())}
                  minValue={today(getLocalTimeZone()).add({ months: -1 })}
                  name="date"
                  onChange={handleDateChange}
                />
              </I18nProvider>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                color="secondary"
                disabled={isSubmitting || (!screenshot && !selectedDate)}
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
                disabled={isSubmitting || !screenshot}
                isLoading={isSubmitting}
                type="submit"
              >
                {t("publish")}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
