import { Button } from "@heroui/button";
import { useTranslation } from "react-i18next";
import ButtonAddFeedbackOrReturn from "@/components/button-add-feedback-or-return";
import { PurchaseStatus } from "@/types/db";

interface ActionCellProps {
  item: PurchaseStatus;
  hasWritePermission: boolean | null;
  onCreateFeedback: (purchaseId: string, amount: number) => void;
  onReturnItem: (purchaseId: string, amount: number) => void;
  onPublishFeedback: (purchaseId: string, amount: number) => void;
  onRefundPurchase: (purchaseId: string, amount: number) => void;
}

/**
 * Component for rendering the action column in the purchase table
 * Shows different actions based on purchase status and user permissions
 */
export const ActionCell = ({
  item,
  hasWritePermission,
  onCreateFeedback,
  onReturnItem,
  onPublishFeedback,
  onRefundPurchase,
}: ActionCellProps) => {
  const { t } = useTranslation();

  // Early return if permissions are still loading
  if (hasWritePermission === null) {
    return <span className="text-gray-400">{t("loading")}</span>;
  }

  // If refunded, show refunded status
  if (item.refunded) {
    return <span className="text-green-500">{t("refunded")}</span>;
  }

  // If no feedback and user has write permission, show create feedback/return options
  if (!item.hasFeedback && hasWritePermission) {
    return (
      <div className="flex gap-2">
        <ButtonAddFeedbackOrReturn
          onAction={(key) => {
            if (key === "feedback") {
              onCreateFeedback(item.purchase, item.amount);
            } else if (key === "return") {
              onReturnItem(item.purchase, item.amount);
            }
          }}
        />
      </div>
    );
  }

  // If has feedback but no publication and user has write permission, show publish button
  if (item.hasFeedback && !item.hasPublication && hasWritePermission) {
    return (
      <div className="flex gap-2">
        <Button
          key={"publish-feedback"}
          color="primary"
          size="md"
          onPress={() => onPublishFeedback(item.purchase, item.amount)}
        >
          {t("publish-feedback")}
        </Button>
      </div>
    );
  }

  // If has feedback and publication and user has write permission, show refund button
  if (item.hasFeedback && item.hasPublication && hasWritePermission) {
    return (
      <div className="flex gap-2">
        <Button
          color="primary"
          size="md"
          onPress={() => onRefundPurchase(item.purchase, item.amount)}
        >
          {t("refund")}
        </Button>
      </div>
    );
  }

  // Default: read-only status
  return <span className="text-red-500">{t("read-only")}</span>;
};