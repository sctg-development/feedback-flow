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
import { NumberInput } from "@heroui/number-input";

import { postJsonToSecuredApi } from "../auth0";

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
  const { getAccessTokenSilently } = useAuth0();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [refundDate, setRefundDate] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const refundDatePickerRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    const formData = new FormData(e.target as HTMLFormElement);
    const amount = parseFloat(formData.get("amount") as string);
    const dateValue = formData.get("refundDate") as string;

    setRefundDate(dateValue || null);
    e.preventDefault();

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

    if (!refundDate) {
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
      // Use the selected date or today
      const date = new Date().toISOString().split("T")[0];
      const data = {
        date,
        purchase: purchaseId,
        refundDate,
        amount,
      };

      const response = await postJsonToSecuredApi(
        `${import.meta.env.API_BASE_URL}/refund`,
        data,
        getAccessTokenSilently,
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

  //   const resetForm = () => {
  //     setAmount(defaultAmount);
  //     setSelectedDate(null);
  //     setRefundDate(null);
  //     if (formRef.current) {
  //       formRef.current.reset();
  //     }
  //   };

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
                  minValue={today(getLocalTimeZone()).add({ days: -30 })}
                  name="refundDate"
                />
              </I18nProvider>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              {/* <Button
                color="secondary"
                disabled={isSubmitting}
                type="button"
                onPress={resetForm}
              >
                {t("reset")}
              </Button> */}
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
