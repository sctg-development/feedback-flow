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
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalProps,
} from "@heroui/modal";
import { Form } from "@heroui/form";
import { Button } from "@heroui/button";
import { addToast } from "@heroui/toast";

import { useSecuredApi } from "../auth0";

export default function ReturnPurchaseModal({
  purchaseId,
  onSuccess,
  ...props
}: {
  purchaseId: string;
  purchaseAmount?: number;
  onSuccess?: () => void;
} & ModalProps) {
  const { t } = useTranslation();
  const { deleteJson } = useSecuredApi();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      // Use the selected date or today

      const response = await deleteJson(
        `${import.meta.env.API_BASE_URL}/purchase/${purchaseId}`,
      );

      if (response.success) {
        addToast({
          title: t("success"),
          description: t("refund-processed-successfully"),
          variant: "solid",
          timeout: 5000,
        });

        if (onSuccess) {
          onSuccess();
        }
        props.onClose?.();
      } else {
        addToast({
          title: t("error"),
          description: t("error-processing-refund"),
          variant: "solid",
          timeout: 5000,
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error processing refund:", error);
      addToast({
        title: t("error"),
        description: t("error-processing-refund"),
        variant: "solid",
        timeout: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      {...props}
      aria-labelledby="refund-purchase-title"
      isDismissable={!isSubmitting}
    >
      <ModalContent>
        <ModalHeader>{t("return-item")}</ModalHeader>
        <ModalBody>
          <p>{t("are-you-sure-you-want-to-return-this-item")}</p>
        </ModalBody>
        <ModalFooter>
          <Form onSubmit={handleSubmit}>
            <Button color="primary" type="submit">
              {t("confirm")}
            </Button>
            <Button variant="light" onPress={props.onClose}>
              {t("cancel")}
            </Button>
          </Form>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
