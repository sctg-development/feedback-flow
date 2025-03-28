import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import PaginatedTable from "@/components/paginated-table";

export default function IndexPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth0();

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        {!isAuthenticated ? (
          <div className="inline-block max-w-lg text-center justify-center">
            <span className={title()}>{"Manage all your"}&nbsp;</span>
            <span className={title({ color: "violet" })}>
              {"feedbacks"}&nbsp;
            </span>
            <br />
            <span className={title()}>{"in one place."}</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <PaginatedTable
              columns={[
                { field: "id", label: t("id"), sortable: false },
                { field: "date", label: t("date"), sortable: true },
                { field: "order", label: t("order"), sortable: true },
                {
                  field: "description",
                  label: t("description"),
                  sortable: false,
                },
                { field: "amount", label: t("amount"), sortable: true },
              ]}
              dataUrl={`${import.meta.env.API_BASE_URL}/purchases/not-refunded`}
              title={"Purchases not refunded"}
            />
          </div>
        )}
      </section>
    </DefaultLayout>
  );
}
