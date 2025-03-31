/* eslint-disable no-console */
import { FormEvent, useRef, useState } from "react";
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
import { Input } from "@heroui/input";
import { addToast } from "@heroui/toast";

import { postJsonToSecuredApi } from "./auth0";

/**
 * Modal component for adding an OAuth ID to an existing tester
 *
 * Provides a form with a single field for entering the OAuth ID,
 * following the pattern established in test #60.
 *
 * Features:
 * - Input validation for OAuth ID format
 * - Loading state during submission
 * - Success/error toast notifications
 * - Form reset functionality
 *
 * @param {Object} props - Component props
 * @param {string} props.testerName - Name of the tester to add ID to
 * @param {Function} [props.onSuccess] - Optional callback to execute after successful creation
 * @param {boolean} props.isOpen - Whether the modal is currently visible
 * @param {Function} props.onClose - Function to close the modal
 * @returns {JSX.Element} The rendered modal component
 */
export default function AddIdToTester({
  testerName,
  onSuccess,
  ...props
}: {
  testerName: string;
  onSuccess?: () => void;
} & ModalProps) {
  const { t } = useTranslation();
  const { getAccessTokenSilently } = useAuth0();
  const [oauthId, setOauthId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Handles form submission to add an OAuth ID to a tester
   * Validates input, submits data to API, and handles the response
   *
   * @param {FormEvent} e - The form submission event
   * @returns {Promise<void>} A promise that resolves when the submission is complete
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Form validation
    if (!oauthId.trim() || !oauthId.includes("|")) {
      addToast({
        title: t("error"),
        description: t("please-enter-valid-oauth-id"),
        variant: "solid",
        timeout: 5000,
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        name: testerName,
        id: oauthId.trim(),
      };

      const response = await postJsonToSecuredApi(
        `${import.meta.env.API_BASE_URL}/tester/ids`,
        data,
        getAccessTokenSilently,
      );

      if (response.success) {
        addToast({
          title: t("success"),
          description: t("oauth-id-added-successfully"),
          variant: "solid",
          timeout: 5000,
        });

        // Call success callback instead of reloading page
        if (onSuccess) {
          onSuccess();
        }
        resetForm();
        props.onClose?.();
      } else {
        // Handle different error types
        const errorMessage =
          response.error && typeof response.error === "string"
            ? response.error
            : t("error-adding-oauth-id");

        addToast({
          title: t("error"),
          description: t(errorMessage),
          variant: "solid",
          timeout: 5000,
        });
      }
    } catch (error) {
      console.error("Error adding OAuth ID:", error);
      addToast({
        title: t("error"),
        description: t("error-adding-oauth-id"),
        variant: "solid",
        timeout: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resets the form to its initial state
   * Clears the OAuth ID input field
   */
  const resetForm = () => {
    setOauthId("");
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  return (
    <Modal
      {...props}
      aria-labelledby="add-id-to-tester-title"
      isDismissable={!isSubmitting}
    >
      <ModalContent>
        <ModalHeader id="add-id-to-tester-title">
          {t("add-oauth-id-to")} {testerName}
        </ModalHeader>
        <ModalBody>
          <Form ref={formRef} onSubmit={handleSubmit}>
            <div className="mb-4">
              <Input
                isRequired
                className="w-full p-2 border rounded"
                errorMessage={t("please-enter-a-oauth-id")}
                label={t("oauth-id")}
                labelPlacement="outside"
                name="oauthId"
                pattern="^[a-zA-Z0-9]{4,30}\|[a-zA-Z0-9]{4,30}$"
                placeholder={t("enter-the-oauth-id")}
                type="text"
                value={oauthId}
                onChange={(e) => setOauthId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {t("oauth-id-format-hint")}
              </p>
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
                disabled={isSubmitting || !oauthId.trim()}
                isLoading={isSubmitting}
                type="submit"
              >
                {t("add")}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
