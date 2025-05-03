/* global process */
import type { ResolvedConfig } from "vite";

import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

import _package from "./package.json" with { type: "json" };

/**
 * Package.json type definition for React project
 *
 * Provides TypeScript typing for package.json structure with
 * common fields used in React applications
 */
export type PackageJson = {
  name: string;
  private: boolean;
  version: string;
  type: string;
  scripts: {
    dev: string;
    build: string;
    lint: string;
    preview: string;
    [key: string]: string;
  };
  dependencies: {
    react: string;
    "react-dom": string;
    "react-router-dom": string;
    [key: string]: string;
  };
  devDependencies: {
    typescript: string;
    eslint: string;
    vite: string;
    [key: string]: string;
  };
};

const packageJson: PackageJson = _package;

/**
 * Vite plugin to add an inline helper script for Github Pages
 * Github Pages does not support SPAs, if user hits refresh on a SPA
 * it will return a 404 error. This plugin adds this script to the index.html after
 * the opening head tag.
 *   <script type="text/javascript">
 *     // Single Page Apps for GitHub Pages
 *     // MIT License
 *     // https://github.com/rafgraph/spa-github-pages
 *     (function(l) {
 *       if (l.search[1] === '/' ) {
 *         var decoded = l.search.slice(1).split('&').map(function(s) {
 *           return s.replace(/~and~/g, '&')
 *         }).join('?');
 *         window.history.replaceState(null, null,
 *             l.pathname.slice(0, -1) + decoded + l.hash
 *         );
 *       }
 *     }(window.location))
 *   </script>
 * This plugin also creates a 404.html file in the dist directory
 * with the required script to handle the window.location.replace
 * and redirect to the correct URL.
 */
let _viteConfig: ResolvedConfig;
const githubPagesPlugin = {
  name: "github-pages-plugin",
  transformIndexHtml(html: string) {
    if (_viteConfig.base.includes("github.io")) {
      // If the base URL is a GitHub Pages URL, add the script
      const distPath = resolve(_viteConfig.root, _viteConfig.build.outDir);
      const urlBase = new URL(_viteConfig.base);
      const urlPath = urlBase.pathname;
      const pathSegmentsToKeep = urlPath.split("/").length - 2;
      const fileContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Not Found</title>
    <script type="text/javascript">
        // Single Page Apps for GitHub Pages
        // MIT License
        // https://github.com/rafgraph/spa-github-pages
        var pathSegmentsToKeep = ${pathSegmentsToKeep}; // Number of path segments to keep in the URL (1 keeps the repo name)

        var l = window.location;
        l.replace(
            l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
            l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
            l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
            (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
            l.hash
        );

    </script>
</head>
<body>
</body>
</html>`;
      const filePath = resolve(distPath, "404.html");

      // eslint-disable-next-line no-console
      console.warn(`\nCreating 404.html in ${filePath} for GitHub Pages`);

      // Write the file to the dist directory
      writeFileSync(filePath, fileContent);

      return html.replace(
        /<head>/,
        `<head>
      <script type="text/javascript">
        // Single Page Apps Helper for GitHub Pages
        // MIT License
        // https://github.com/rafgraph/spa-github-pages
        (function(l) {
          if (l.search[1] === '/' ) {
            var decoded = l.search.slice(1).split('&').map(function(s) { 
              return s.replace(/~and~/g, '&')
            }).join('?');
            window.history.replaceState(null, null,
                l.pathname.slice(0, -1) + decoded + l.hash
            );
          }
        }(window.location))
      </script>`,
      );
    }
    // eslint-disable-next-line no-console
    console.warn(
      `\nDon't use GitHub Pages? Remove the githubPagesPlugin plugin from vite.config.ts`,
    );

    return html;
  },
  configResolved(resolvedConfig: ResolvedConfig) {
    _viteConfig = resolvedConfig;
  },
};

/**
 * Extract dependencies with a specific vendor prefix
 *
 * @param packageJson - The package.json object
 * @param vendorPrefix - Vendor namespace prefix (e.g. "@heroui")
 * @returns Array of dependency names matching the vendor prefix
 *
 * Used for chunk optimization in the build configuration
 */
export function extractPerVendorDependencies(
  packageJson: PackageJson,
  vendorPrefix: string,
): string[] {
  const dependencies = Object.keys(packageJson.dependencies || {});

  return dependencies.filter((dependency) =>
    dependency.startsWith(`${vendorPrefix}/`),
  );
}

/**
 * Vite configuration
 * @see https://vitejs.dev/config/
 */
// eslint-disable-next-line no-console
console.warn(
  `Launching Vite with\nAUTH0_DOMAIN: ${process.env.AUTH0_DOMAIN}\nAUTH0_CLIENT_ID: ${process.env.AUTH0_CLIENT_ID}\nAUTH0_AUDIENCE: ${process.env.AUTH0_AUDIENCE}\nAUTH0_SCOPE: ${process.env.AUTH0_SCOPE}\nAPI_BASE_URL: ${process.env.API_BASE_URL}`,
);
export default defineConfig({
  define: {
    "import.meta.env.AUTH0_DOMAIN": JSON.stringify(process.env.AUTH0_DOMAIN),
    "import.meta.env.AUTH0_CLIENT_ID": JSON.stringify(
      process.env.AUTH0_CLIENT_ID,
    ),
    "import.meta.env.AUTH0_AUDIENCE": JSON.stringify(
      process.env.AUTH0_AUDIENCE,
    ),
    "import.meta.env.AUTH0_SCOPE": JSON.stringify(process.env.AUTH0_SCOPE),
    "import.meta.env.API_BASE_URL": JSON.stringify(process.env.API_BASE_URL),
    "import.meta.env.READ_PERMISSION": JSON.stringify(
      process.env.READ_PERMISSION,
    ),
    "import.meta.env.WRITE_PERMISSION": JSON.stringify(
      process.env.WRITE_PERMISSION,
    ),
    "import.meta.env.ADMIN_PERMISSION": JSON.stringify(
      process.env.ADMIN_PERMISSION,
    ),
    "import.meta.env.BACKUP_PERMISSION": JSON.stringify(
      process.env.BACKUP_PERMISSION,
    ),
    "import.meta.env.DB_MAX_IMAGE_SIZE": JSON.stringify(
      process.env.DB_MAX_IMAGE_SIZE,
    ),
    "import.meta.env.AMAZON_BASE_URL": JSON.stringify(
      process.env.AMAZON_BASE_URL,
    ),
  },
  plugins: [react(), tsconfigPaths(), tailwindcss(), githubPagesPlugin],
  build: {
    // Inline assets smaller than 1KB
    // This is for demonstration purposes only
    // and should be adjusted based on the project requirements
    assetsInlineLimit: 1024,
    // Enable source maps for better debugging experience
    // This should be disabled in production for better performance and security
    sourcemap: true,
    rollupOptions: {
      output: {
        // Customizing the output file names
        assetFileNames: `assets/${packageJson.name}-[name]-[hash][extname]`,
        entryFileNames: `js/${packageJson.name}-[hash].js`,
        chunkFileNames: `js/${packageJson.name}-[hash].js`,
        /**
         * Manual chunk configuration for better code splitting
         *
         * Groups all @heroui dependencies into a single chunk
         * to optimize loading performance and avoid oversized chunks
         */
        manualChunks: {
          react: [
            "react",
            "react-dom",
            "react-router-dom",
            "react-i18next",
            "i18next",
            "i18next-http-backend",
          ],
          aria: [
            "@react-aria/button",
            "@react-aria/calendar",
            "@react-aria/checkbox",
            "@react-aria/dialog",
            "@react-aria/focus",
            "@react-aria/grid",
            "@react-aria/interactions",
            "@react-aria/label",
            "@react-aria/live-announcer",
            "@react-aria/menu",
            "@react-aria/overlays",
            "@react-aria/selection",
            "@react-aria/spinbutton",
            "@react-aria/switch",
            "@react-aria/table",
            "@react-aria/textfield",
            "@react-aria/tooltip",
            "@react-aria/utils",
          ],
          swagger: ["swagger-ui-react"],
          heroui: extractPerVendorDependencies(packageJson, "@heroui"),
          auth0: extractPerVendorDependencies(packageJson, "@auth0"),
        },
      },
    },
  },
});
