import fs from "fs";

import swaggerJsdoc from "swagger-jsdoc";

export const API_VERSION = "1.6.0";

const options = {
  encoding: "utf8",
  failOnErrors: false, // Whether or not to throw when parsing errors. Defaults to false.
  format: "json",
  info: {
    title: "Feedback Flow API",
    version: API_VERSION,
  },
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Feedback Flow API",
      version: API_VERSION,
    },
  }, // You can move properties from definition here if needed
  apis: [
    "../cloudflare-worker/src/routes/index.ts",
    "../cloudflare-worker/src/routes/testers/index.ts",
    "../cloudflare-worker/src/routes/purchases/index.ts",
    "../cloudflare-worker/src/routes/purchases/crud.ts",
    "../cloudflare-worker/src/routes/purchases/list.ts",
    "../cloudflare-worker/src/routes/purchases/amounts.ts",
    "../cloudflare-worker/src/routes/purchases/status.ts",
    "../cloudflare-worker/src/routes/purchases/search.ts",
    "../cloudflare-worker/src/routes/feedback/index.ts",
    "../cloudflare-worker/src/routes/refunds/index.ts",
    "../cloudflare-worker/src/routes/stats/index.ts",
    "../cloudflare-worker/src/routes/system/index.ts",
    "../cloudflare-worker/src/routes/links/index.ts",
  ], // Path to the API docs
};

const openApi = await swaggerJsdoc(options);

openApi.components.securitySchemes = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  },
};
openApi.security = [
  {
    bearerAuth: [],
  },
];

// Write the OpenAPI spec to a file public/openapi.json
fs.writeFileSync(
  "./public/openapi.json",
  JSON.stringify(openApi, null, 2),
  "utf8",
);
