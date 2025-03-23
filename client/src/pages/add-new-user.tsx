import { Trans, useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState, FormEvent } from "react";
import { Form } from "@heroui/form";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { userHasPermission } from "@/components/auth0";

export default function AddNewUser() {
  const { t } = useTranslation();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const [hasPermission, setHasPermission] = useState(false);
  const [submitted, setSubmitted] = useState(
    null as {
      [k: string]: FormDataEntryValue;
    } | null,
  );

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(e.currentTarget));

    setSubmitted(data);
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
          console.log("You have permission to add a new user.");
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
              errorMessage={t('please-enter-a-name')}
              label={t('name')}
              labelPlacement="outside"
              name="name"
              placeholder={t('enter-the-user-name')}
              type="text"
            />
            <Button type="submit" variant="bordered">
              {t('submit')}
            </Button>
            {submitted && (
              <div className="text-small text-default-500">
                You submitted: <code>{JSON.stringify(submitted)}</code>
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
