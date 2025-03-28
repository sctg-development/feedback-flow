/**
 * @copyright Copyright (c) 2024-2025 Ronan LE MEILLAT
 * @license AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@heroui/button";
import { useAuth0 } from "@auth0/auth0-react";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { ProtectedFetchToDownload } from "@/components/secured-fetch-to-download-button";
import FileUpload from "@/components/file-upload/file-upload";
import { postJsonToSecuredApi } from "@/components/auth0";
import Panel from "@/components/panel";

export default function ManageDatabasePage() {
  const { t } = useTranslation();
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const { getAccessTokenSilently } = useAuth0();
  const [restoreDatabaseResult, setRestoreDatabaseResult] = useState<
    any | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const validateBackupFile = (
    file: File,
  ): { valid: boolean; error?: string } => {
    // Vérifier le type MIME
    if (file.type !== "application/json") {
      return { valid: false, error: t("error-not-json-file") };
    }

    // Vérifier la taille
    if (file.size > 10 * 1024 * 1024) {
      // 10MB max
      return { valid: false, error: t("error-file-too-large") };
    }

    return { valid: true };
  };

  const handleJsonFileUpload = async (file: File) => {
    setError(null);
    setIsLoading(true);

    const reader = new FileReader();

    reader.onload = async (event) => {
      const jsonData = event.target?.result;

      if (jsonData) {
        try {
          // Valider que le JSON est bien formé
          const parsedData = JSON.parse(jsonData as string);

          // Vous pouvez ajouter ici une validation de la structure du JSON

          const ret = await postJsonToSecuredApi(
            `${import.meta.env.API_BASE_URL}/backup/json`,
            parsedData,
            getAccessTokenSilently,
          );

          setRestoreDatabaseResult(ret);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error processing JSON:", error);
          setError(error instanceof Error ? error.message : t("error-unknown"));
        } finally {
          setIsLoading(false);
        }
      }
    };

    reader.onerror = () => {
      setError(t("error-reading-file"));
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center mb-6">
          <h1 className={title()}>{t("manage-database")}</h1>
        </div>

        <div className="grid gap-8 w-full max-w-xl">
          {/* Section Export */}
          <Panel
            description={t("export-database-description")}
            title={t("export-database")}
          >
            <ProtectedFetchToDownload
              putDateInFilename
              buttonText={t("export-database")}
              downloadLinkText={t("download-backup")}
              filename={`database-backup.json`}
              permission={import.meta.env.BACKUP_PERMISSION}
              url={`${import.meta.env.API_BASE_URL}/backup/json`}
            />
          </Panel>

          {/* Section Restore */}
          <Panel
            description={t("restore-database-description")}
            title={t("restore-database")}
          >
            <div className="space-y-4">
              <FileUpload
                accept="application/json"
                browseButtonText={t("browse")}
                className="rounded-xl"
                resetButtonText={t("reset")}
                onChange={(files) => {
                  if (files && files.length > 0) {
                    const validation = validateBackupFile(files[0]);

                    if (validation.valid) {
                      setFileUpload(files[0]);
                      setError(null);
                    } else {
                      setFileUpload(null);
                      setError(validation.error || "");
                    }
                  } else {
                    setFileUpload(null);
                    setError(null);
                  }
                  setRestoreDatabaseResult(null);
                }}
              />

              {fileUpload && !restoreDatabaseResult?.success && (
                <div className="flex justify-center">
                  <Button
                    color="primary"
                    onPress={() => setShowConfirmDialog(true)}
                  >
                    {t("restore-the-database")}
                  </Button>
                </div>
              )}

              {error && (
                <div className="mt-2 p-3 bg-danger-50 text-danger border border-danger-200 rounded-lg">
                  <p className="text-center">{error}</p>
                </div>
              )}

              {restoreDatabaseResult?.success && (
                <div className="mt-2 p-3 bg-success-50 text-success border border-success-200 rounded-lg">
                  <p className="text-center">{t("restore-database-success")}</p>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Confirmation dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg max-w-md w-full">
              <h3 className="text-lg font-semibold mb-2">
                {t("confirm-restore")}
              </h3>
              <p className="mb-4 text-danger">{t("confirm-restore-warning")}</p>
              <div className="flex justify-end gap-2">
                <Button
                  color="warning"
                  variant="light"
                  onPress={() => setShowConfirmDialog(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  color="danger"
                  isLoading={isLoading}
                  onPress={async () => {
                    setShowConfirmDialog(false);
                    await handleJsonFileUpload(fileUpload!);
                  }}
                >
                  {t("confirm-restore")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </DefaultLayout>
  );
}
