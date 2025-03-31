/**
 * MIT License
 *
 * Copyright (c) 2025 Ronan LE MEILLAT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@heroui/button";
import { EditIcon } from "@heroui/shared-icons";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import PaginatedTable from "@/components/paginated-table";
import AddFeedbackModal from "@/components/modals/add-feedback-modal";
import PublishFeedbackModal from "@/components/modals/publish-feedback-modal";
import RefundPurchaseModal from "@/components/modals/refund-purchase-modal";
import CreatePurchaseModal from "@/components/modals/create-purchase-modal";

/**
 * Main page of the application displaying purchase data in a tabular format
 *
 * Features:
 * - Display purchase data with sorting and filtering
 * - Toggle between showing all purchases or only non-refunded purchases
 * - Create new purchases
 * - Add feedback to existing purchases
 * - Publish feedback with screenshots
 * - Process refunds for purchases with published feedback
 *
 * @returns {JSX.Element} The rendered IndexPage component
 */
export default function IndexPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth0();
  const [createNewPurchase, setCreateNewPurchase] = useState(false);
  const [refundPurchases, setRefundPurchases] = useState(false);
  const [createFeedbackPurchase, setCreateFeedbackPurchase] = useState(false);
  const [publishFeedbackPurchase, setPublishFeedbackPurchase] = useState(false);
  const [toggleAllPurchases, setToggleAllPurchases] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [purchase, setPurchase] = useState({ purchaseId: "", amount: 0 });

  // Function to refresh the table
  const refreshTable = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  /**
   * Renders the action column for a purchase row based on its status
   *
   * The available actions depend on the purchase status:
   * - If refunded, displays a "Refunded" label
   * - If no feedback, shows "Create Feedback" button
   * - If has feedback but no publication, shows "Publish Feedback" button
   * - If has feedback and publication, shows "Refund" button
   *
   * @param {Object} item - The purchase item data
   * @param {string} item.purchase - Purchase ID
   * @param {boolean} item.refunded - Whether the purchase has been refunded
   * @param {boolean} item.hasFeedback - Whether the purchase has feedback
   * @param {boolean} item.hasPublication - Whether the feedback has been published
   * @param {number} item.amount - The purchase amount
   * @returns {JSX.Element} The rendered action column content
   */
  const renderAtionColumn = (item: any) => {
    if (item.refunded) {
      return <span className="text-green-500">{t("refunded")}</span>;
    }
    if (!item.hasFeedback) {
      return (
        <div className="flex gap-2">
          <Button
            color="primary"
            size="md"
            onPress={() => handleCreateFeedback(item.purchase, item.amount)}
          >
            {t("create-feedback")}
          </Button>
        </div>
      );
    }
    if (item.hasFeedback && !item.hasPublication) {
      return (
        <div className="flex gap-2">
          <Button
            key={"publish-feedback"}
            color="primary"
            size="md"
            onPress={() => handlePublishFeedback(item.purchase, item.amount)}
          >
            {t("publish-feedback")}
          </Button>
        </div>
      );
    }
    if (item.hasFeedback && item.hasPublication) {
      return (
        <div className="flex gap-2">
          <Button
            color="primary"
            size="md"
            onPress={() => handleRefundPurchases(item.purchase, item.amount)}
          >
            {t("refund")}
          </Button>
        </div>
      );
    }

    return <span className="text-red-500">Unknown</span>;
  };

  /**
   * Renders the table title with toggle functionality and create button
   *
   * The title changes based on the current filter state:
   * - "Purchases Not Refunded" when showing only non-refunded purchases
   * - "Purchases Refunded" when showing all purchases
   *
   * Clicking the title toggles between these two views
   *
   * @returns {ReactNode} The rendered title element
   */
  const renderTitle: () => ReactNode = () => {
    // When the use click on the title, it will toggle all purchases
    const handleToggleAllPurchases = () => {
      setToggleAllPurchases(!toggleAllPurchases);
    };

    if (toggleAllPurchases) {
      return (
        <div className="flex justify-between items-center w-full">
          <Button
            className="text-3xl font-bold"
            variant="light"
            onPress={handleToggleAllPurchases}
          >
            {t("purchases-refunded")}
          </Button>
          <Button
            color="primary"
            startContent={<EditIcon />}
            onPress={() => setCreateNewPurchase(true)}
          >
            {t("new-purchase")}
          </Button>
        </div>
      );
    } else {
      return (
        <div className="flex justify-between items-center w-full">
          <Button
            className="text-3xl font-bold"
            variant="light"
            onPress={handleToggleAllPurchases}
          >
            {t("purchases-not-refunded")}
          </Button>
          <Button
            color="primary"
            startContent={<EditIcon />}
            onPress={() => setCreateNewPurchase(true)}
          >
            {t("new-purchase")}
          </Button>
        </div>
      );
    }
  };

  /**
   * Handles opening the refund modal for a specific purchase
   *
   * @param {string} purchaseId - The ID of the purchase to refund
   * @param {number} amount - The purchase amount
   */
  const handleRefundPurchases = (purchaseId: string, amount: number) => {
    setPurchase({ purchaseId, amount });
    setRefundPurchases(true);
  };

  /**
   * Handles opening the feedback modal for a specific purchase
   *
   * @param {string} purchaseId - The ID of the purchase to add feedback to
   * @param {number} amount - The purchase amount
   */
  const handleCreateFeedback = (purchaseId: string, amount: number) => {
    setPurchase({ purchaseId, amount });
    setCreateFeedbackPurchase(true);
  };

  /**
   * Handles opening the publish feedback modal for a specific purchase
   *
   * @param {string} purchaseId - The ID of the purchase to publish feedback for
   * @param {number} amount - The purchase amount
   */
  const handlePublishFeedback = (purchaseId: string, amount: number) => {
    setPurchase({ purchaseId, amount });
    setPublishFeedbackPurchase(true);
  };

  return (
    <DefaultLayout>
      <section
        className={`flex flex-col ${!isAuthenticated ? "h-full" : ""} items-center justify-center gap-4 py-8 md:py-10`}
      >
        {!isAuthenticated ? (
          <div className="inline-block max-w-lg text-center justify-center">
            <span className={title()}>{t("manage-all-your")}&nbsp;</span>
            <span className={title({ color: "violet" })}>
              {"feedbacks"}&nbsp;
            </span>
            <br />
            <span className={title()}>{t("in-one-place")}</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <PaginatedTable
              columns={[
                { field: "purchase", label: t("purchase"), sortable: false },
                { field: "date", label: t("date"), sortable: true },
                { field: "order", label: t("order"), sortable: true },
                {
                  field: "description",
                  label: t("description"),
                  sortable: false,
                },
                { field: "amount", label: t("amount"), sortable: false },
                {
                  field: "hasFeedback",
                  label: t("hasFeedback"),
                  sortable: false,
                },
                {
                  field: "hasPublication",
                  label: t("hasPublication"),
                  sortable: false,
                },
                { field: "refunded", label: t("refunded"), sortable: false },
                {
                  field: "actions",
                  label: t("actions"),
                  render: (item) => renderAtionColumn(item),
                },
              ]}
              dataUrl={`${import.meta.env.API_BASE_URL}/purchase-status?limitToNotRefunded=${toggleAllPurchases ? "false" : "true"}`}
              defaultSortField="date"
              defaultSortOrder="desc"
              permission={import.meta.env.READ_PERMISSION}
              refreshTrigger={refreshTrigger}
              rowKey="purchase"
              title={() => renderTitle()}
            />
          </div>
        )}
      </section>

      {/* Add the new Create Purchase Modal */}
      {createNewPurchase && (
        <CreatePurchaseModal
          children={undefined}
          isOpen={createNewPurchase}
          onClose={() => setCreateNewPurchase(false)}
          onSuccess={refreshTable}
        />
      )}
      {/* Add Feedback Modal */}
      {createFeedbackPurchase && (
        <AddFeedbackModal
          isOpen={createFeedbackPurchase}
          purchaseId={purchase.purchaseId}
          onClose={() => setCreateFeedbackPurchase(false)}
          onSuccess={refreshTable}
        >
          <></>
        </AddFeedbackModal>
      )}

      {/* Publish Feedback Modal */}
      {publishFeedbackPurchase && (
        <PublishFeedbackModal
          isOpen={publishFeedbackPurchase}
          purchaseId={purchase.purchaseId}
          onClose={() => setPublishFeedbackPurchase(false)}
          onSuccess={refreshTable}
        >
          <></>
        </PublishFeedbackModal>
      )}

      {/* Refund Modal */}
      {refundPurchases && (
        <RefundPurchaseModal
          children={undefined}
          defaultAmount={purchase.amount}
          isOpen={refundPurchases}
          purchaseId={purchase.purchaseId}
          onClose={() => setRefundPurchases(false)}
          onSuccess={refreshTable}
        />
      )}
    </DefaultLayout>
  );
}
