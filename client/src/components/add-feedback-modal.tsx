import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalProps,
} from "@heroui/modal";
import { getLocalTimeZone, today } from "@internationalized/date";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@heroui/button";
import { DatePicker } from "@heroui/date-picker";
import { Form } from "@heroui/form";
import { Textarea } from "@heroui/input";
import { useTranslation } from "react-i18next";

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
  ...props
}: {
  purchaseId: string;
} & ModalProps) {
  const { getAccessTokenSilently } = useAuth0();
  const { t } = useTranslation();

  return (
    <Modal {...props}>
      <ModalContent>
        <ModalHeader>{t("add-feedback")}</ModalHeader>
        <ModalBody>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const feedback = formData.get("feedback") as string;
              const date = new Date().toISOString().split("T")[0];
              const data = { date, purchase: purchaseId, feedback };
              const url = `/api/feedback`;

              // Call the function to send the feedback to the server
              postJsonToSecuredApi(url, data, getAccessTokenSilently);
            }}
          >
            <DatePicker
              isRequired
              className="w-full p-2 border rounded"
              defaultValue={today(getLocalTimeZone()).subtract({ days: 1 })}
              label={t("select-date")}
              maxValue={today(getLocalTimeZone())}
              minValue={today(getLocalTimeZone()).add({ months: -1 })}
              name="date"
            />
            <Textarea
              className="w-full p-2 border rounded"
              name="feedback"
              placeholder={t("enter-your-feedback-here")}
              rows={4}
            />
            <Button className="mt-2 btn btn-primary" type="submit">
              {t("submit-feedback")}
            </Button>
          </Form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
