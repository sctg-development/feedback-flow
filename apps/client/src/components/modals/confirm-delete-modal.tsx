import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { Button } from "@heroui/button";
import { useTranslation } from "react-i18next";

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
  isProcessing,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  onConfirm: () => Promise<void> | void;
  isProcessing?: boolean;
  children?: import("react").ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Modal {...{ isOpen }} isDismissable={!isProcessing} onClose={onClose}>
      <ModalContent>
        <ModalHeader>{title ?? t("delete")}</ModalHeader>
        <ModalBody>
          <p className="mb-4">{description ?? t("confirm-delete-warning")}</p>
          <div className="flex justify-end gap-2">
            <Button color="secondary" disabled={isProcessing} onPress={onClose}>
              {t("cancel")}
            </Button>
            <Button
              color="danger"
              isLoading={!!isProcessing}
              onPress={() => onConfirm()}
            >
              {t("delete")}
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
