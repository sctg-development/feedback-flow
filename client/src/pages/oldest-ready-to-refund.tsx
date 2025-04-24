import { useTranslation } from "react-i18next";
import { Page, Text, View, Document, PDFViewer } from "@react-pdf/renderer";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
export default function OldestReadyToRefundPage() {
  const { t } = useTranslation();

  const ReadyToRefundPDF = () => (
    <Document>
      <Page size="A4">
        <View>
          <Text>Section #1</Text>
        </View>
        <View>
          <Text>Section #2</Text>
        </View>
      </Page>
    </Document>
  );

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <h1 className={title()}>{t("oldest-ready-to-refund")}</h1>
          <p>{t("oldest-ready-to-refund-description")}</p>
        </div>
      </section>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <PDFViewer style={{ width: "100%", height: "600px" }}>
            <ReadyToRefundPDF />
          </PDFViewer>
        </div>
      </section>
    </DefaultLayout>
  );
}
