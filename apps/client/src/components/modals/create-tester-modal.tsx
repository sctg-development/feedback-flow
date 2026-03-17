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
 *
 * Modal: Create a tester (without assigning any OAuth ids)
 */
import { FormEvent, useRef, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useTranslation } from "react-i18next";
import { addToast } from "@heroui/toast";

import { useSecuredApi } from "@/components/auth0";

export default function CreateTesterModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation();
  const { postJson } = useSecuredApi();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast({
        title: t("error"),
        description: t("please-enter-a-name"),
        variant: "solid",
      });

      return;
    }
    setIsSubmitting(true);
    try {
      const resp = await postJson(`${import.meta.env.API_BASE_URL}/tester`, {
        name: name.trim(),
        ids: [],
      });

      if (resp.success) {
        addToast({
          title: t("success"),
          description: t("tester-created"),
          variant: "solid",
        });
        onSuccess?.();
        onClose();
      } else {
        addToast({
          title: t("error"),
          description: resp.error || t("error-creating-tester"),
          variant: "solid",
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        title: t("error"),
        description: t("error-creating-tester"),
        variant: "solid",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      aria-labelledby="create-tester-title"
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader id="create-tester-title">{t("create-tester")}</ModalHeader>
        <ModalBody>
          <form ref={formRef} onSubmit={handleSubmit}>
            <Input
              label={t("tester-name")}
              labelPlacement="outside"
              placeholder={t("enter-the-user-name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button color="secondary" onPress={onClose}>
                {t("cancel")}
              </Button>
              <Button color="primary" isLoading={isSubmitting} type="submit">
                {t("create")}
              </Button>
            </div>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
