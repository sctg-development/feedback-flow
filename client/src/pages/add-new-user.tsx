import { Trans, useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState, FormEvent } from "react";
import { Form } from "@heroui/form";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { postJsonToSecuredApi, userHasPermission } from "@/components/auth0";

export default function AddNewUser() {
  const { t } = useTranslation();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const [hasPermission, setHasPermission] = useState(false);
  const [apiResponse, setApiResponse] = useState(
    null as {
      [k: string]: FormDataEntryValue;
    } | null,
  );

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(e.currentTarget));
    const ids = [data["oauthId"] as string];
    const name = data["name"] as string;

    const apiResponse = await postJsonToSecuredApi(
      `${import.meta.env.API_BASE_URL}/tester`,
      { name, ids },
      getAccessTokenSilently,
    );

    setApiResponse(apiResponse);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (isAuthenticated) {
        try {
          setHasPermission(
            await userHasPermission(
              import.meta.env.ADMIN_PERMISSION,
              getAccessTokenSilently,
            ),
          );
          console.log(
            `You have ${hasPermission ? "" : "not "}permission to add a new user.`,
          );
        } catch (error) {
          console.log(error as Error);
        }
      }
    };

    fetchData();
  }, [isAuthenticated]);

  return (
    <DefaultLayout>
      {hasPermission ? (
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
          <div className="inline-block max-w-lg text-center justify-center">
            <h1 className={title()}>
              <Trans t={t}>add-a-new-user</Trans>
            </h1>
          </div>
          <Form className="w-full max-w-xs" onSubmit={onSubmit}>
            <Input
              isRequired
              errorMessage={t("please-enter-a-name")}
              label={t("name")}
              labelPlacement="outside"
              name="name"
              placeholder={t("enter-the-user-name")}
              type="text"
            />
            <Input
              isRequired
              errorMessage={t("please-enter-a-oauth-id")}
              label={t("oauth-id")}
              labelPlacement="outside"
              name="oauthId"
              pattern="^[a-zA-Z0-9]{4,30}\|[a-zA-Z0-9]{4,30}$"
              placeholder={t("enter-the-oauth-id")}
              type="text"
            />
            <Button type="submit" variant="bordered">
              {t("submit")}
            </Button>
            {apiResponse && (
              <div className="text-small text-default-500">
                {t('api-response')}: <code>{JSON.stringify(apiResponse)}</code>
              </div>
            )}
          </Form>
        </section>
      ) : (
        <></>
      )}
    </DefaultLayout>
  );
}
