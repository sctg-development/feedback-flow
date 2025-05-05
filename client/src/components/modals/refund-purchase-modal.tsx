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
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { DatePicker } from "@heroui/date-picker";
import { addToast } from "@heroui/toast";
import { NumberInput } from "@heroui/number-input";
import { Input } from "@heroui/input";

import { useSecuredApi } from "../auth0";

export default function RefundPurchaseModal({
  purchaseId,
  defaultAmount = 0,
  onSuccess,
  ...props
}: {
  purchaseId: string;
  defaultAmount?: number;
  onSuccess?: () => void;
} & ModalProps) {
  const { t, i18n } = useTranslation();
  const { postJson } = useSecuredApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const refundDatePickerRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    const formData = new FormData(e.target as HTMLFormElement);
    const amount = parseFloat(formData.get("amount") as string);
    const transactionId = formData.get("transactionId") as string;

    // Validation
    if (amount <= 0) {
      addToast({
        title: t("error"),
        description: t("please-enter-valid-amount"),
        variant: "solid",
        timeout: 5000,
      });

      return;
    }

    if (!selectedDate) {
      addToast({
        title: t("error"),
        description: t("please-select-refund-date"),
        variant: "solid",
        timeout: 5000,
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const refundDate = selectedDate || new Date().toISOString().split("T")[0];
      // Use the selected date or today
      const date = new Date().toISOString().split("T")[0];
      const data = {
        date,
        purchase: purchaseId,
        refundDate,
        amount,
        transactionId: transactionId || undefined,
      };

      const response = await postJson(
        `${import.meta.env.API_BASE_URL}/refund`,
        data,
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

  const resetForm = () => {
    setAmount(defaultAmount);
    setSelectedDate(null);
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  return (
    <Modal
      {...props}
      aria-labelledby="refund-purchase-title"
      isDismissable={!isSubmitting}
    >
      <ModalContent>
        <ModalHeader id="refund-purchase-title">
          {t("refund-purchase")}
        </ModalHeader>
        <ModalBody>
          <p className="mb-4">{t("refund-instructions")}</p>
          <Form ref={formRef} onSubmit={handleSubmit}>
            <div className="mb-4">
              <NumberInput
                isRequired
                label={t("amount")}
                min={0.01}
                name="amount"
                placeholder="0.00"
                step={0.01}
                type="number"
                value={amount}
                onValueChange={setAmount}
              />
            </div>

            <div className="mb-4">
              <I18nProvider locale={i18n.language}>
                <DatePicker
                  ref={refundDatePickerRef}
                  isRequired
                  defaultValue={today(getLocalTimeZone())}
                  label={t("refund-date")}
                  maxValue={today(getLocalTimeZone()).add({ days: 10 })}
                  minValue={today(getLocalTimeZone()).add({ months: -12 })}
                  name="refundDate"
                  onChange={handleDateChange}
                />
              </I18nProvider>
            </div>
            <div className="mb-4 w-full">
              <Input
                label={t("transaction-id")}
                name="transactionId"
                placeholder={t("optional-transaction-id")}
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
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
                disabled={isSubmitting || amount <= 0}
                isLoading={isSubmitting}
                type="submit"
              >
                {t("process-refund")}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
