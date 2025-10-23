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
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@heroui/button";
import { EditIcon } from "@heroui/shared-icons";
import { Link } from "react-router-dom";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import PaginatedTable from "@/components/paginated-table";
import AddFeedbackModal from "@/components/modals/add-feedback-modal";
import PublishFeedbackModal from "@/components/modals/publish-feedback-modal";
import RefundPurchaseModal from "@/components/modals/refund-purchase-modal";
import CreatePurchaseModal from "@/components/modals/create-purchase-modal";
import EditPurchaseModal from "@/components/modals/edit-purchase-modal";
import { ScreenshotModal } from "@/components/modals/screenshot-modal";
import ButtonAddFeedbackOrReturn from "@/components/button-add-feedback-or-return";
import ReturnPurchaseModal from "@/components/modals/return-purchase";
import { PurchaseStatus } from "@/types/db";
import { AuthenticationGuardWithPermission, useSecuredApi } from "@/components/auth0";
import { useSearchResults } from "@/hooks/useSearchResults";
import { CopyButton } from "@/components/copy-button";
import { cleanAmazonOrderNumber } from "@/utilities/amazon";
import { useSearch } from "@/context/SearchContext";

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
  const { getJson, hasPermission } = useSecuredApi();
  const { isAuthenticated } = useAuth0();
  const { searchResults } = useSearch();
  const { data: searchData, isLoading: searchDataLoading } = useSearchResults({
    searchResults,
    isActive: searchResults.length > 0,
  });
  const [createFeedbackPurchase, setCreateFeedbackPurchase] = useState(false);
  const [createNewPurchase, setCreateNewPurchase] = useState(false);
  const [publishFeedbackPurchase, setPublishFeedbackPurchase] = useState(false);
  const [purchase, setPurchase] = useState({ purchaseId: "", amount: 0 });
  const [editPurchase, setEditPurchase] = useState(false);
  const [editPurchaseId, setEditPurchaseId] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refundPurchases, setRefundPurchases] = useState(false);
  const [returnPurchase, setReturnPurchase] = useState(false);
  const [screenshot, setScreenshot] = useState<string | string[] | null>(null);
  const [toggleAllPurchases, setToggleAllPurchases] = useState(false);
  const [hasWritePermission, setHasWritePermission] = useState<boolean | null>(
    null,
  );

  // Get write permissions on component mount
  useEffect(() => {
    const checkPermissions = async () => {
      const canWrite = await hasPermission(import.meta.env.WRITE_PERMISSION);

      setHasWritePermission(canWrite);
    };

    checkPermissions();
  }, [hasPermission]);
  // Add state for title data
  const [titleData, setTitleData] = useState({
    notRefundedAmount: 0,
    refundedAmount: 0,
  });

  // Load amounts when toggle changes or table refreshes
  useEffect(() => {
    if (toggleAllPurchases) {
      // Load refunded amounts
      getJson(`${import.meta.env.API_BASE_URL}/purchases/refunded-amount`).then(
        (data) => {
          if (data.success) {
            setTitleData((prev) => ({
              ...prev,
              refundedAmount: data.amount,
            }));
          }
        },
      );
    } else {
      // Load not refunded amounts
      getJson(
        `${import.meta.env.API_BASE_URL}/purchases/not-refunded-amount`,
      ).then((data) => {
        if (data.success) {
          setTitleData((prev) => ({
            ...prev,
            notRefundedAmount: data.amount,
          }));
        }
      });
    }
  }, [toggleAllPurchases, refreshTrigger]);

  // Refresh table when search results change
  useEffect(() => {
    // Refresh when search results are added or cleared
    setRefreshTrigger((prev) => prev + 1);
  }, [searchResults]);

  // Memoize the title component to prevent unnecessary re-renders
  const memoizedTitle = useMemo(() => {
    // When the user clicks on the title, it will toggle all purchases
    const handleToggleAllPurchases = () => {
      setToggleAllPurchases(!toggleAllPurchases);
    };

    // Determine the title text and amount based on toggle state
    const titleText = toggleAllPurchases
      ? t("purchases-refunded")
      : t("purchases-not-refunded");

    const amountValue = toggleAllPurchases
      ? (titleData.refundedAmount + titleData.notRefundedAmount).toFixed(2)
      : titleData.notRefundedAmount.toFixed(2);

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center w-full">
        <Button
          className="text-3xl font-bold max-w-screen"
          variant="light"
          onPress={handleToggleAllPurchases}
        >
          {titleText}&nbsp;{amountValue}€
        </Button>
        {hasWritePermission && (
          <Button
            color="primary"
            startContent={<EditIcon />}
            onPress={() => setCreateNewPurchase(true)}
          >
            {t("new-purchase")}
          </Button>
        )}
      </div>
    );
  }, [
    toggleAllPurchases,
    titleData.notRefundedAmount,
    titleData.refundedAmount,
    t,
  ]);

  // Use a callback to pass the memoized title
  const getTitleComponent = () => memoizedTitle;

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
  const renderActionColumn = (item: PurchaseStatus) => {
    // Early return if permissions are still loading
    if (hasWritePermission === null) {
      return <span className="text-gray-400">{t("loading")}</span>;
    }

    if (item.refunded) {
      return <span className="text-green-500">{t("refunded")}</span>;
    }

    if (!item.hasFeedback && hasWritePermission) {
      return (
        <div className="flex gap-2">
          <ButtonAddFeedbackOrReturn
            onAction={(key) => {
              if (key === "feedback") {
                handleCreateFeedback(item.purchase, item.amount);
              } else if (key === "return") {
                handleReturnItem(item.purchase, item.amount);
              }
            }}
          />
        </div>
      );
    }

    if (item.hasFeedback && !item.hasPublication && hasWritePermission) {
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

    if (item.hasFeedback && item.hasPublication && hasWritePermission) {
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

    return <span className="text-red-500">{t("read-only")}</span>;
  };

  /**
   * Handles opening the return modal for a specific purchase
   * Show a confirmation Modal to confirm the return
   * and then call the API to directly set the purchase as refunded
   * the refund amount is set to the purchase amount
   * the date is set to the current date
   *
   * @param {string} purchaseId - The ID of the purchase to return
   * @param {number} amount - The purchase amount
   */
  const handleReturnItem = (purchaseId: string, amount: number) => {
    setPurchase({ purchaseId, amount });
    setReturnPurchase(true);
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

  /**
   * Handles editing a purchase by opening the edit purchase modal
   *
   * @param {string} purchaseId - The ID of the purchase to edit
   */
  const handleEditPurchase = (purchaseId: string) => {
    setEditPurchaseId(purchaseId);
    setEditPurchase(true);
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
          <div className="flex gap-3 max-w-screen">
            <PaginatedTable
              columns={[
                {
                  field: "purchase",
                  label: t("purchase"),
                  sortable: false,
                  cellCopyable: true,
                  className: "hidden md:table-cell",
                  headerClassName: "hidden md:table-cell",
                  render: (item) => {
                    return (
                      <>
                        <div className="flex items-center">
                          <div>
                            {item.purchase}
                          </div>
                          <div className="flex flex-col">
                            <CopyButton
                              value={item.purchase}
                            />
                            <AuthenticationGuardWithPermission permission={import.meta.env.ADMIN_PERMISSION}>
                              <EditIcon onClick={() => handleEditPurchase(item.purchase)}
                                className="group inline-flex items-center justify-center box-border appearance-none select-none whitespace-nowrap font-normal subpixel-antialiased overflow-hidden tap-highlight-transparent transform-gpu data-[pressed=true]:scale-[0.97] cursor-pointer outline-hidden data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-tiny rounded-small px-0 transition-transform-colors-opacity motion-reduce:transition-none bg-transparent data-[hover=true]:bg-default/40 min-w-4 w-4 h-4 relative z-50 text-zinc-300 -bottom-0 left-2"
                              />
                            </AuthenticationGuardWithPermission>
                          </div>
                        </div>
                      </>
                    );
                  },
                },
                {
                  field: "date",
                  label: t("date"),
                  sortable: true,
                  className: "hidden md:table-cell",
                  headerClassName: "hidden md:table-cell",
                },
                {
                  field: "order",
                  label: t("order"),
                  sortable: true,
                  className: "hidden md:table-cell",
                  headerClassName: "hidden md:table-cell",
                  render: (item) => {
                    return (
                      <>
                        <Link
                          className="text-blue-500 hover:underline break-keep"
                          target="_blank"
                          to={`${import.meta.env.AMAZON_BASE_URL}${item.order}`}
                        >
                          {cleanAmazonOrderNumber(item.order)}
                        </Link>
                        <CopyButton
                          className="absolute top-0 right-0"
                          value={item.order}
                        />
                      </>
                    );
                  },
                },
                {
                  field: "description",
                  label: t("description"),
                  sortable: false,
                  cellTooltip: t("click-to-see-the-screenshot"),
                  onCellAction: (item) => {
                    item.screenshotSummary
                      ? setScreenshot([
                        item.purchaseScreenshot,
                        item.screenshotSummary,
                      ])
                      : setScreenshot(item.purchaseScreenshot);
                  },
                },
                {
                  field: "amount",
                  label: t("amount"),
                  sortable: false,
                  className: "hidden md:table-cell",
                  headerClassName: "hidden md:table-cell",
                },
                {
                  field: "hasFeedback",
                  label: t("hasFeedback"),
                  sortable: false,
                  className: "hidden md:table-cell",
                  headerClassName: "hidden md:table-cell",
                },
                {
                  field: "hasPublication",
                  label: t("hasPublication"),
                  sortable: false,
                  cellTooltip: t("click-to-see-the-screenshot"),
                  className: "hidden md:table-cell",
                  headerClassName: "hidden md:table-cell",
                  onCellAction: (item) => {
                    if (item.hasPublication) {
                      setScreenshot(item.publicationScreenshot);
                    }
                  },
                },
                {
                  field: "refunded",
                  label: t("refunded"),
                  sortable: false,
                  className: "hidden md:table-cell",
                  headerClassName: "hidden md:table-cell",
                  render: (item) => {
                    return item.refunded ? (
                      <>
                        {item.transactionId && item.transactionId.length >= 4 && !item.transactionId.startsWith("REFUND_") ? (
                          <Link
                            className="text-blue-500 hover:underline break-keep"
                            target="_blank"
                            to={`${import.meta.env.PAYPAL_TRANSACTION_BASE_URL}${item.transactionId}`}>{t("yes")}
                          </Link>
                        ) : (
                          <span>{t("yes")}</span>
                        )}
                      </>) :
                      <>{t("no")}</>;
                  }
                },
                {
                  field: "actions",
                  label: t("actions"),
                  render: (item) => renderActionColumn(item),
                },
              ]}
              dataUrl={`${import.meta.env.API_BASE_URL}/purchase-status?limitToNotRefunded=${toggleAllPurchases ? "false" : "true"}`}
              manualData={searchResults.length > 0 ? searchData : undefined}
              manualIsLoading={searchDataLoading}
              defaultPageSize={10}
              defaultSortField="date"
              defaultSortOrder="desc"
              permission={import.meta.env.READ_PERMISSION}
              refreshTrigger={refreshTrigger}
              rowKey="purchase"
              title={getTitleComponent}
              emptyContent={
                <div className="text-center text-muted-foreground p-4">
                  {t("no-data-available")}
                  {hasWritePermission && (
                    <div className="mt-4">
                      <Button
                        color="primary"
                        startContent={<EditIcon />}
                        onPress={() => setCreateNewPurchase(true)}
                      >
                        {t("new-purchase")}
                      </Button>
                    </div>
                  )}
                </div>
              }
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
      {/* Screenshot Modal */}
      {screenshot && (
        <ScreenshotModal
          children={undefined}
          isOpen={!!screenshot}
          screenshot={screenshot}
          onClose={() => setScreenshot(null)}
        />
      )}

      {/* Return Modal */}
      {returnPurchase && (
        <ReturnPurchaseModal
          children={undefined}
          isOpen={returnPurchase}
          purchaseId={purchase.purchaseId}
          onClose={() => setReturnPurchase(false)}
          onSuccess={refreshTable}
        />
      )}
      {/* Edit Purchase Modal */}
      {editPurchase && (
        <AuthenticationGuardWithPermission permission={import.meta.env.ADMIN_PERMISSION}>
          <EditPurchaseModal
            children={undefined}
            isOpen={editPurchase}
            purchaseId={editPurchaseId}
            onClose={() => {
              setEditPurchase(false);
              setEditPurchaseId("");
            }}
            onSuccess={refreshTable}
          />
        </AuthenticationGuardWithPermission>
      )}
    </DefaultLayout>
  );
}
