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
import { useAuth0 } from "@auth0/auth0-react";
import { useState, FormEvent } from "react";
import { Form } from "@heroui/form";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { TesterCreateResponse } from "@/types/data";
import DefaultLayout from "@/layouts/default";
import {
  AuthenticationGuardWithPermission,
  postJsonToSecuredApi,
} from "@/components/auth0";
import PaginatedTable from "@/components/paginated-table";

export default function AddNewUser() {
  const { t } = useTranslation();
  const { getAccessTokenSilently } = useAuth0();
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * Handle form submission to create a new tester
   */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Store a reference to the form before async operations
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const ids = [data["oauthId"] as string];
    const name = data["name"] as string;

    const apiResponse = (await postJsonToSecuredApi(
      `${import.meta.env.API_BASE_URL}/tester`,
      { name, ids },
      getAccessTokenSilently,
    )) as TesterCreateResponse;

    if (apiResponse && apiResponse.success) {
      // Reset the form
      form.reset();

      // Increment the refresh key to force the PaginatedTable to refresh
      setRefreshKey((prev) => prev + 1);
    }
  };

  return (
    <DefaultLayout>
      <AuthenticationGuardWithPermission
        permission={import.meta.env.ADMIN_PERMISSION}
      >
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
          {/* Use the PaginatedTable component */}
          <PaginatedTable
            key={refreshKey} // Force refresh when a new user is added
            columns={[
              { field: "name", label: t("tester-name"), sortable: true },
              { field: "ids", label: t("oauth-ids"), sortable: true },
            ]}
            dataUrl={`${import.meta.env.API_BASE_URL}/testers`}
            defaultPageSize={10}
            defaultSortField="name"
            defaultSortOrder="asc"
            permission={import.meta.env.ADMIN_PERMISSION}
            title={t("add-a-new-user")}
          />

          {/* Form for adding a new user */}
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
      </AuthenticationGuardWithPermission>
    </DefaultLayout>
  );
}
