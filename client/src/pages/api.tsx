import { Trans, useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { Snippet } from "@heroui/snippet";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { getJsonFromSecuredApi } from "@/components/auth0";

export default function ApiPage() {
  const { t } = useTranslation();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [apiResponse, setApiResponse] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (isAuthenticated) {
        try {
          const response = await getJsonFromSecuredApi(
            `${import.meta.env.API_BASE_URL}/purchases/refunded`,
            getAccessTokenSilently,
          );

          setApiResponse(response);
        } catch (error) {
          setApiResponse((error as Error).message);
        }
      }
    };

    fetchData();
  }, [isAuthenticated]);

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <h1 className={title()}>
            <Trans t={t}>api-answer</Trans>
          </h1>
        </div>
        <Snippet className="max-w-11/12" symbol="" title="api-response">
          <div className="max-w-2xs sm:max-w-sm md:max-w-md lg:max-w-5xl  whitespace-break-spaces  text-wrap break-words">
            {JSON.stringify(apiResponse, null, 2)}
          </div>
        </Snippet>
      </section>
    </DefaultLayout>
  );
}
