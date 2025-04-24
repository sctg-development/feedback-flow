import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  Image as PDFImage,
  Page,
  Text,
  View,
  Document,
  PDFViewer,
} from "@react-pdf/renderer";

import { useSecuredApi } from "@/components/auth0";
import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { ReadyForRefundPurchase } from "@/types/data";

const MAX_OLDEST_READY_TO_REFUND = 10;

/** Function for converting a webp base64 image url ( data:image/webp;base64,… )to a base64 image containing the image converted to png
 * @param {string} base64DataUrl - The base64 data URL ( data:image/webp;base64,… ) of the webp image
 * @returns {Promise<string>} - A promise that resolves to a base64 image url ( data:image/webp;base64,… ) containing the png converted of the webp image
 */
function convertWebpToPng(base64DataUrl: string | undefined): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!base64DataUrl) {
      reject(new Error("No base64 data URL provided"));

      return;
    }
    const img = new Image();

    img.src = base64DataUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const pngDataUrl = canvas.toDataURL("image/png");

        resolve(pngDataUrl);
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };
    img.onerror = (error) => {
      reject(error);
    };
  });
}

export default function OldestReadyToRefundPage() {
  const { t } = useTranslation();
  const [readyToRefund, setReadyToRefund] = useState(
    [] as ReadyForRefundPurchase[],
  );
  const { getJson } = useSecuredApi();
  const fetchReadyToRefund = async () => {
    try {
      const response = await getJson(
        `${import.meta.env.API_BASE_URL}/purchases/ready-to-refund?limit=${MAX_OLDEST_READY_TO_REFUND}`,
      );

      if (response.success) {
        setReadyToRefund(response.data);
      } else {
        // eslint-disable-next-line no-console
        console.error("Error fetching data:", JSON.stringify(response));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchReadyToRefund();
  }, []);

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <h1 className={title()}>{t("oldest-ready-to-refund")}</h1>
          <p>{t("oldest-ready-to-refund-description")}</p>
        </div>
      </section>
      <section className="flex flex-col items-center justify-center min-w-full lg:min-w-2xl">
        {readyToRefund && readyToRefund.length > 0 ? (
          <PDFViewer className="w-full h-screen">
            <Document>
              <Page size="A4">
                <View>
                  {readyToRefund.map((purchase) => (
                    <View key={purchase.id}>
                      <Text>{`ID: ${purchase.id}`}</Text>
                      <Text>{`Date: ${purchase.date}`}</Text>
                      <Text>{`Order: ${purchase.order}`}</Text>
                      <Text>{`Description: ${purchase.description}`}</Text>
                      <Text>{`Refunded: ${purchase.refunded}`}</Text>
                      <Text>{`Amount: ${purchase.amount}`}</Text>
                      <PDFImage
                        src={convertWebpToPng(purchase.publicationScreenShot)}
                        style={{ width: "50%", height: "auto" }}
                      />
                    </View>
                  ))}
                </View>
              </Page>
            </Document>
          </PDFViewer>
        ) : (
          <p>{t("no-data-available")}</p>
        )}
      </section>
    </DefaultLayout>
  );
}
