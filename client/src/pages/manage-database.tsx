import { useTranslation } from "react-i18next";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { ProtectedFetchToDownload } from "@/components/secured-fetch-to-download-button";

export default function ManageDatabasePage() {
  const { t } = useTranslation();

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <h1 className={title()}>{t("manage-database")}</h1>
        </div>
        <ProtectedFetchToDownload
          buttonText={t('export-database')}
          downloadLinkText={t('download-backup')}
          filename={`database-backup-${new Date().toISOString()}.json`}
          permission={import.meta.env.BACKUP_PERMISSION}
          url={`${import.meta.env.API_BASE_URL}/backup/json`}
        />
      </section>
    </DefaultLayout>
  );
}
