import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@heroui/button";
import { useAuth0 } from "@auth0/auth0-react";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { ProtectedFetchToDownload } from "@/components/secured-fetch-to-download-button";
import FileUpload from "@/components/file-upload/file-upload";
import { postJsonToSecuredApi } from "@/components/auth0";

export default function ManageDatabasePage() {
  const { t } = useTranslation();
  const [fileUpload, setFileUpload] = useState(null as File | null);
  const { getAccessTokenSilently } = useAuth0();
  const [restoreDatabaseResult, setRestoreDatabaseResult] = useState(
    null as any | null,
  );

  const handleJsonFileUpload = async (file: File) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const jsonData = event.target?.result;

      if (jsonData) {
        try {
          const destUrl = `${import.meta.env.API_BASE_URL}/backup/json`;

          const ret = await postJsonToSecuredApi(
            `${import.meta.env.API_BASE_URL}/backup/json`,
            JSON.parse(jsonData as string),
            getAccessTokenSilently,
          );

          setRestoreDatabaseResult(ret);
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <h1 className={title()}>{t("manage-database")}</h1>
        </div>
        <p className="text-center text-muted-foreground">
          {t("export-database-description")}
        </p>
        <ProtectedFetchToDownload
          putDateInFilename
          buttonText={t("export-database")}
          downloadLinkText={t("download-backup")}
          filename={`database-backup.json`}
          permission={import.meta.env.BACKUP_PERMISSION}
          url={`${import.meta.env.API_BASE_URL}/backup/json`}
        />
        <p className="text-center text-muted-foreground">
          {t("restore-database-description")}
        </p>
        <FileUpload
          accept="application/json"
          browseButtonText={t("browse")}
          resetButtonText={t("reset")}
          onChange={(files) => {
            setFileUpload(files[0]);
          }}
        />
        {fileUpload && !restoreDatabaseResult?.success && (
          <Button onPress={async () => await handleJsonFileUpload(fileUpload)}>
            {t("restore-the-database")}
          </Button>
        )}
        {restoreDatabaseResult?.success && (
          <div className="text-center text-muted-foreground">
            <p>{t("restore-database-success")}</p>
          </div>
        )}
      </section>
    </DefaultLayout>
  );
}
