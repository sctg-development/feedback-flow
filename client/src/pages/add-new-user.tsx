import { Trans, useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState, FormEvent } from "react";
import { Form } from "@heroui/form";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Pagination } from "@heroui/pagination";

import {
  GetTestersResponse,
  OrderCriteria,
  Tester,
  TesterCreateResponse,
  TesterSortCriteria,
} from "@/types/data";
import { title } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import {
  getJsonFromSecuredApi,
  postJsonToSecuredApi,
  userHasPermission,
} from "@/components/auth0";

export default function AddNewUser() {
  const { t } = useTranslation();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const [hasAdminPermission, setHasAdminPermission] = useState(false);
  const [testers, setTesters] = useState([] as Array<Tester>);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState("name" as TesterSortCriteria);
  const [order, setOrder] = useState("asc" as OrderCriteria);
  /**
   * Function to refresh the list of testers
   */
  const refreshTesters = async (
    page: number,
    limit: number,
    sort: TesterSortCriteria,
    order: OrderCriteria,
  ) => {
    const response = (await getJsonFromSecuredApi(
      `${import.meta.env.API_BASE_URL}/testers?page=${page}&limit=${limit}&sort=${sort}&order=${order}`,
      getAccessTokenSilently,
    )) as GetTestersResponse;

    if (response && response.success) {
      setTesters(response.data);
      setPage(response.page);
      setTotal(response.total);
      setLimit(response.limit);
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(e.currentTarget));

    const ids = [data["oauthId"] as string];
    const name = data["name"] as string;

    const apiResponse = (await postJsonToSecuredApi(
      `${import.meta.env.API_BASE_URL}/tester`,
      { name, ids },
      getAccessTokenSilently,
    )) as TesterCreateResponse;

    if (apiResponse && apiResponse.success) {
      console.log(`Created tester with UUID: ${apiResponse.uuid}`);

      // Refresh the list of testers
      await refreshTesters(page, limit, sort, order);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (isAuthenticated) {
        try {
          setHasAdminPermission(
            await userHasPermission(
              import.meta.env.ADMIN_PERMISSION,
              getAccessTokenSilently,
            ),
          );
          if (hasAdminPermission) {
            await refreshTesters(page, limit, sort, order);
          }

          // eslint-disable-next-line no-console
          console.log(
            `You have ${hasAdminPermission ? "" : "not "}permission to add a new user.`,
          );
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log(error as Error);
        }
      }
    };

    fetchData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && hasAdminPermission) {
      refreshTesters(page, limit, sort, order);
    }
  }, [page, limit, sort, order, isAuthenticated, hasAdminPermission]);

  return (
    <DefaultLayout>
      {hasAdminPermission ? (
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
          <div className="inline-block max-w-lg text-center justify-center">
            <h1 className={title()}>
              <Trans t={t}>add-a-new-user</Trans>
            </h1>
            {/** Show the testers as a HeroUI table, testers have Tester[] type */}
            <Table
              aria-label="Example table with dynamic content"
              bottomContent={
                <div className="flex w-full justify-center">
                  <Pagination
                    isCompact
                    showControls
                    showShadow
                    color="secondary"
                    page={page}
                    total={Math.ceil(total/limit)}
                    onChange={(page) => setPage(page)}
                  />
                </div>
              }
              className="my-4"
            >
              <TableHeader>
                <TableColumn>Tester Name</TableColumn>
                <TableColumn>OAuth IDs</TableColumn>
              </TableHeader>
              <TableBody items={testers}>
                {(item) => (
                  <TableRow key={item.uuid}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.ids.join(", ")}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
          </Form>
        </section>
      ) : (
        <></>
      )}
    </DefaultLayout>
  );
}
