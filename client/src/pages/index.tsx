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

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import PaginatedTable from "@/components/paginated-table";

export default function IndexPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth0();
  const [refundPurchases, setRefundPurchases] = useState(false);
  const [toggleAllPurchases, setToggleAllPurchases] = useState(false);

  const renderAtionColumn = (item: any) => {
    if (item.refunded) {
      return <span className="text-green-500">Refunded</span>;
    }
    if (!item.hasFeedback) {
      return (
        <div className="flex gap-2">
          <Button
            color="primary"
            size="md"
            onPress={() =>
              window.alert(`TODO: handle create feedback ${item.purchase}`)
            }
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
            color="primary"
            size="md"
            onPress={() =>
              window.alert(`TODO: handle publish feedback ${item.purchase}`)
            }
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
            onPress={() => handleRefundPurchases(item.purchase)}
          >
            {t("refund")}
          </Button>
        </div>
      );
    }

    return <span className="text-red-500">Unknown</span>;
  };

  const renderTitle: () => ReactNode = () => {
    // When the use click on the title, it will toggle all purchases
    const handleToggleAllPurchases = () => {
      setToggleAllPurchases(!toggleAllPurchases);
    };

    if (toggleAllPurchases) {
      return (
        <Button
          aria-role="button"
          className="text-3xl font-bold"
          variant="light"
          onPress={handleToggleAllPurchases}
        >
          {t("purchases-refunded")}
        </Button>
      );
    } else {
      return (
        <Button
          aria-role="button"
          className="text-3xl font-bold"
          variant="light"
          onPress={handleToggleAllPurchases}
        >
          {t("purchases-not-refunded")}
        </Button>
      );
    }
  };

  const handleRefundPurchases = (purchaseId: string) => {
    console.log("Refunding purchase with ID:", purchaseId);
    setRefundPurchases(true);
    // Logic to refund purchases
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
              rowKey="purchase"
              title={() => renderTitle()}
            />
          </div>
        )}
      </section>
      {refundPurchases && <div>modal</div>}
    </DefaultLayout>
  );
}
