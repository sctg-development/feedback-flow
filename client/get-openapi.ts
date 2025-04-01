import fs from "fs";

import swaggerJsdoc from "swagger-jsdoc";

const options = {
  encoding: "utf8",
  failOnErrors: true, // Whether or not to throw when parsing errors. Defaults to false.
  format: "json",
  info: {
    title: "Feedback Flow API",
    version: "1.0.0",
  },
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Feedback Flow API",
      version: "1.0.0",
    },
  }, // You can move properties from definition here if needed
  apis: ["../cloudflare-worker/src/routes/index.ts"], // Path to the API docs
};

const openApi = await swaggerJsdoc(options);

// Write the OpenAPI spec to a file public/openapi.json
fs.writeFileSync(
  "./public/openapi.json",
  JSON.stringify(openApi, null, 2),
  "utf8",
);
