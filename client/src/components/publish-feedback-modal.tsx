import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
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

import { postJsonToSecuredApi } from "./auth0";

import { ImageUpload } from "@/components/image-upload";

export default function PublishFeedbackModal({
  purchaseId,
  isOpen,
  onClose,
  ...props
}: {
  purchaseId: string;
  isOpen: boolean;
  onClose: () => void;
} & Omit<ModalProps, "isOpen" | "onClose">) {
  const { t } = useTranslation();
  const { getAccessTokenSilently } = useAuth0();
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (
    files: File[],
    dataUrls:
      | {
          original: File;
          converted: string;
        }[]
      | undefined,
  ) => {
    console.log("Files changed:", files);
    console.log("Data URLs:", dataUrls);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!screenshot) {
      window.alert(t("please-upload-screenshot"));

      return;
    }

    setIsSubmitting(true);
    try {
      const date = new Date().toISOString().split("T")[0];
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
        // Force reload the page to refresh the table
        window.location.reload();
      } else {
        window.alert(t("error-publishing-feedback"));
      }
    } catch (error) {
      console.error("Error publishing feedback:", error);
      window.alert(t("error-publishing-feedback"));
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} {...props}>
      <ModalContent>
        <ModalHeader>{t("publish-feedback")}</ModalHeader>
        <ModalBody>
          <p className="mb-4">{t("upload-screenshot-instruction")}</p>
          <Form onSubmit={handleSubmit}>
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
              onChange={(files, datasUrl) => handleFileChange(files, datasUrl)}
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button
                color="danger"
                disabled={isSubmitting}
                variant="flat"
                onPress={onClose}
              >
                {t("cancel")}
              </Button>
              <Button color="primary" isLoading={isSubmitting} type="submit">
                {t("publish")}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
