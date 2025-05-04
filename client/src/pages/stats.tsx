import { useTranslation } from "react-i18next";

import DefaultLayout from "@/layouts/default";
export default function StatsPage() {
  const { t } = useTranslation();

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <h1 className="text-2xl font-bold">{t("statistics")}</h1>
        <p className="text-lg">{t('coming-soon')}</p>
      </section>
    </DefaultLayout>
  );
}
