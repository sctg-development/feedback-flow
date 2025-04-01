import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export function OpenAPI() {
  return <SwaggerUI url={`${import.meta.env.BASE_URL || ""}openapi.json`} />;
}
