import { Trans, useTranslation } from "react-i18next";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import ImageUpload from "@/components/image-upload";

export default function DocsPage() {
  const { t } = useTranslation();

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <h1 className={title()}>
            <Trans t={t}>about</Trans>
          </h1>
          <ImageUpload
            convertToWebp
            limitSize
            multiple
            showPasteButton
            accept="image/png, image/jpeg, image/webp, image/gif"
            addButtonText={t("add")}
            browseButtonText={t("browse")}
            className="rounded p-1 my-4"
            dragDropZoneText={t("drop-your-image-here")}
            maxDimension={800}
            maxFileSize={10 * 1024 * 1024} // 10MB max
            pasteButtonText={t("paste")}
            previewSize={120}
            resetButtonText={t("reset")}
            webpQuality={0.7}
            onChange={(_files, dataUrls) => {
              // eslint-disable-next-line no-console
              console.log(`Number of files: ${(dataUrls || []).length}`);
              (dataUrls || []).forEach((element) => {
                // eslint-disable-next-line no-console
                console.log(element.converted);
              });
            }}
          />
        </div>
      </section>
    </DefaultLayout>
  );
}
