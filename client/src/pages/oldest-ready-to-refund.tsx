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
import { NumberInput } from "@heroui/number-input";

import { useSecuredApi } from "@/components/auth0";
import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { ReadyForRefundPurchase } from "@/types/data";

const MAX_OLDEST_READY_TO_REFUND = 10;
const ORDER = "asc";
const styles = {
  pageNumber: {
    position: "absolute",
    fontSize: 8,
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "grey",
  },
};

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
  const [maxReadyToRefund, setMaxReadyToRefund] = useState(
    MAX_OLDEST_READY_TO_REFUND,
  );

  const { getJson } = useSecuredApi();
  const fetchReadyToRefund = async () => {
    try {
      const response = await getJson(
        `${import.meta.env.API_BASE_URL}/purchases/ready-to-refund?limit=${maxReadyToRefund}&order=${ORDER}`,
      );

      if (response.success) {
        setReadyToRefund(response.data);
        //console.log("Ready to refund purchases:", response.data);
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
      <div className="flex w-full mb-4 items-left">
        <NumberInput
          className="w-52"
          defaultValue={MAX_OLDEST_READY_TO_REFUND}
          maxValue={100}
          minValue={1}
          placeholder="Max number of items"
          step={1}
          onValueChange={(value: number) =>
            setMaxReadyToRefund(Math.round(value))
          }
        />
      </div>
      <section className="flex flex-col items-center justify-center min-w-full lg:min-w-2xl">
        {readyToRefund && readyToRefund.length > 0 ? (
          <PDFViewer className="w-full h-screen">
            <Document
              author="Ronan LE MEILLAT"
              creationDate={new Date()}
              creator="SCTG - Feedback Flow"
              keywords="SCTG, Feedback Flow, Refund"
              language="en"
              modificationDate={new Date()}
              producer="SCTG - Feedback Flow"
              subject="Oldest ready to refund"
              title="Oldest ready to refund"
            >
              {readyToRefund.map((purchase) => (
                <Page
                  key={purchase.id}
                  dpi={72}
                  size={[446, 632]}
                  style={{ padding: "10px" }}
                >
                  <View key={purchase.id}>
                    <Text
                      style={{ fontSize: "14", fontWeight: "bold" }}
                    >{`Order: ${purchase.order}`}</Text>
                    <Text
                      style={{ fontSize: "12" }}
                    >{`Date: ${purchase.date}`}</Text>
                    <Text
                      style={{ fontSize: "12" }}
                    >{`Description: ${purchase.description}`}</Text>
                    <Text
                      style={{ fontSize: "12" }}
                    >{`Refunded: ${purchase.refunded}`}</Text>
                    <Text style={{ fontSize: "12" }}>
                      {`Amount: ${purchase.amount}`} €
                    </Text>
                    <PDFImage
                      src={convertWebpToPng(purchase.screenshot)}
                      style={{ width: "50%", height: "auto" }}
                    />
                    <PDFImage
                      src={convertWebpToPng(purchase.publicationScreenShot)}
                      style={{ width: "50%", height: "auto" }}
                    />
                  </View>
                  <Text
                    fixed
                    render={({ pageNumber, totalPages }) =>
                      `${pageNumber} / ${totalPages}`
                    }
                    style={styles.pageNumber as any}
                  />
                </Page>
              ))}
            </Document>
          </PDFViewer>
        ) : (
          <p>{t("no-data-available")}</p>
        )}
      </section>
    </DefaultLayout>
  );
}
