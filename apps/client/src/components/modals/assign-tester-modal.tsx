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
 * Modal: Assign one or many Auth0 user ids to an existing tester, or create a new tester and assign.
 */
import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useTranslation } from "react-i18next";
import { addToast } from "@heroui/toast";

import { useSecuredApi } from "@/components/auth0";

export default function AssignTesterModal({
  isOpen,
  onClose,
  userIds,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  userIds: string[]; // one or more Auth0 IDs
  onSuccess?: () => void;
}) {
  const { t } = useTranslation();
  const { getJson, postJson } = useSecuredApi();
  const [testers, setTesters] = useState<Array<{ uuid: string; name: string }>>(
    [],
  );
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const resp = await getJson(`${import.meta.env.API_BASE_URL}/testers`);
        const data = resp?.data || [];

        setTesters(data);
      } catch (err) {
        console.error(err);
        addToast({
          title: t("error"),
          description: t("error-fetching-data"),
          variant: "solid",
        });
      }
    })();
  }, [isOpen]);

  const assignToExisting = async () => {
    if (!selectedUuid) return;
    setIsSubmitting(true);
    try {
      const resp = await postJson(
        `${import.meta.env.API_BASE_URL}/tester/ids`,
        { uuid: selectedUuid, ids: userIds },
      );

      if (resp.success) {
        addToast({
          title: t("success"),
          description: t("assigned-successfully"),
          variant: "solid",
        });
        onSuccess?.();
        onClose();
      } else {
        addToast({
          title: t("error"),
          description: resp.error || t("error-assigning-testers"),
          variant: "solid",
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        title: t("error"),
        description: t("error-assigning-testers"),
        variant: "solid",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createAndAssign = async () => {
    if (!createName.trim()) return;
    setIsCreating(true);
    try {
      const resp = await postJson(`${import.meta.env.API_BASE_URL}/tester`, {
        name: createName.trim(),
        ids: userIds,
      });

      if (resp.success) {
        addToast({
          title: t("success"),
          description: t("tester-created-and-assigned"),
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
      setIsCreating(false);
    }
  };

  return (
    <Modal
      aria-labelledby="assign-tester-title"
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader id="assign-tester-title">{t("assign-tester")}</ModalHeader>
        <ModalBody>
          <div className="mb-4">
            <label className="text-sm font-semibold">
              {t("select-tester")}
            </label>
            <select
              className="w-full p-2 border rounded mt-2"
              value={selectedUuid ?? ""}
              onChange={(e) => setSelectedUuid(e.target.value || null)}
            >
              <option value="">{t("choose-tester")}</option>
              {testers.map((tst) => (
                <option key={tst.uuid} value={tst.uuid}>
                  {tst.name}
                </option>
              ))}
            </select>
            <div className="text-sm text-muted-foreground mt-2">
              {t("or-create-new-tester")}
            </div>
            <Input
              className="mt-2"
              placeholder={t("enter-tester-name")}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button color="secondary" onPress={onClose}>
              {t("cancel")}
            </Button>
            <Button
              color="primary"
              disabled={!selectedUuid}
              isLoading={isSubmitting}
              onPress={assignToExisting}
            >
              {t("assign")}
            </Button>
            <Button
              color="primary"
              disabled={!createName.trim()}
              isLoading={isCreating}
              onPress={createAndAssign}
            >
              {t("create-and-assign")}
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
