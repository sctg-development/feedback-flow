import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export function OpenAPI() {
  const url = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL + "openapi.json"
    : import.meta.env.BASE_URL + "/openapi.json";

  return <SwaggerUI url={url} />;
}
