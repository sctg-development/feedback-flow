import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalProps,
} from "@heroui/modal";
import { getLocalTimeZone, today } from "@internationalized/date";
import { I18nProvider } from "@react-aria/i18n";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@heroui/button";
import { DatePicker } from "@heroui/date-picker";
import { Form } from "@heroui/form";
import { addToast } from "@heroui/toast";
import { Textarea } from "@heroui/input";
import { useTranslation } from "react-i18next";
import { FormEvent, useState } from "react";

import { postJsonToSecuredApi } from "./auth0";

/**
 * Constructs a modal for adding feedback.
 * a purchaseId is passed to the modal
 * and the modal will provide a form to send feedback
 * Then the feedback will be sent to the server using:
 *  postJsonToSecuredApi(
 *  url: string,
 *  data: any,
 *  getAccessTokenFunction: GetAccessTokenFunction,
 * )
 * from the @/components/auth0.tsx file
 *  {
 *     date: new Date().toISOString().split('T')[0],
 *     purchase: purchaseId,
 *     feedback: 'This is a fantastic product! Works exactly as described.'
 *   }
 *
 */

export default function AddFeedbackModal({
  purchaseId,
  onSuccess,
  ...props
}: {
  purchaseId: string;
  onSuccess?: () => void;
} & ModalProps) {
  const { getAccessTokenSilently } = useAuth0();
  const { t, i18n } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const feedback = formData.get("feedback") as string;
    const dateValue = formData.get("date") as string;

    // Better validation
    if (!feedback || feedback.trim() === "" || feedback === t("not-filled")) {
      window.alert(t("please-enter-feedback"));

      return;
    }

    setIsSubmitting(true);

    try {
      // Use the selected date instead of today
      const date = dateValue || new Date().toISOString().split("T")[0];
      const data = { date, purchase: purchaseId, feedback };
      const url = `${import.meta.env.API_BASE_URL}/feedback`;

      // Call the function to send the feedback to the server
      const result = await postJsonToSecuredApi(
        url,
        data,
        getAccessTokenSilently,
      );

      if (result && result.success) {
        addToast({
          title: t("success"),
          description: t("feedback-submitted"),
          timeout: 5000,
          variant: "solid",
        });
        if (onSuccess) {
          onSuccess(); // Parent component can refresh data
        }
        props.onClose?.();
      } else {
        // Error handling
        addToast({
          title: t("error"),
          description: t("error-submitting-feedback"),
          timeout: 5000,
          variant: "solid",
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error submitting feedback:", error);
      addToast({
        title: t("error"),
        description: t("error-submitting-feedback"),
        timeout: 5000,
        variant: "solid",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal {...props}>
      <ModalContent>
        <ModalHeader>{t("add-feedback")}</ModalHeader>
        <ModalBody>
          <Form onSubmit={handleSubmit}>
            <I18nProvider locale={i18n.language}>
              <DatePicker
                isRequired
                className="w-full p-2 border rounded"
                defaultValue={today(getLocalTimeZone()).subtract({ days: 1 })}
                label={t("select-date")}
                maxValue={today(getLocalTimeZone())}
                minValue={today(getLocalTimeZone()).add({ months: -1 })}
                name="date"
              />
            </I18nProvider>
            <Textarea
              className="w-full p-2 border rounded"
              defaultValue={t("not-filled")}
              name="feedback"
              placeholder={t("enter-your-feedback-here")}
              rows={4}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                color="danger"
                disabled={isSubmitting}
                variant="flat"
                onPress={props.onClose}
              >
                {t("cancel")}
              </Button>
              <Button
                color="primary"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                type="submit"
              >
                {t("submit-feedback")}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
