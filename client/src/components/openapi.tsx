/* eslint-disable no-console */
import { useEffect, useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { useTranslation } from "react-i18next";

export function OpenAPI() {
  const { t } = useTranslation();
  const url = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL + "openapi.json"
    : import.meta.env.BASE_URL + "/openapi.json";

  // Fetch the OpenAPI spec from the server
  const [openApiSpec, setOpenApiSpec] = useState(null);

  useEffect(() => {
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        data.servers = [
          {
            url: import.meta.env.API_BASE_URL.endsWith("/api")
              ? import.meta.env.API_BASE_URL.split("/api")[0]
              : import.meta.env.API_BASE_URL,
            description: t("api-server"),
          },
        ];
        setOpenApiSpec(data);
      })
      .catch((error) => console.error("Error fetching OpenAPI spec:", error));
  }, [url]);

  return <SwaggerUI spec={openApiSpec as unknown as Object} />;
}
