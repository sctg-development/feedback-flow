import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@heroui/button";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import PaginatedTable from "@/components/paginated-table";

export default function IndexPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth0();

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
                { field: "purchase", label: t("id"), sortable: false },
                { field: "date", label: t("date"), sortable: true },
                { field: "order", label: t("order"), sortable: true },
                {
                  field: "description",
                  label: t("description"),
                  sortable: false,
                },
                { field: "amount", label: t("amount"), sortable: false },
                { field: "refunded", label: t("refunded"), sortable: false },
                {
                  field: "hasFeedback",
                  label: t("hasFeedback"),
                  sortable: false,
                },
                { field: "refunded", label: t("refunded"), sortable: false },
                {
                  field: "hasPublication",
                  label: t("hasPublication"),
                  sortable: false,
                },
                {
                  field: "actions",
                  label: "Actions",
                  render: (item) => (
                    <div className="flex gap-2">
                      <Button
                        color="primary"
                        size="md"
                        onPress={() => alert(item.id)}
                      >
                        Refund
                      </Button>
                    </div>
                  ),
                },
              ]}
              dataUrl={`${import.meta.env.API_BASE_URL}/purchases-status`}
              title={t("purchases-not-refunded")}
            />
          </div>
        )}
      </section>
    </DefaultLayout>
  );
}
