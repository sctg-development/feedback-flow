import { Route, Routes } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import { SiteLoading } from "./components/site-loading";
import DefaultLayout from "./layouts/default";
import { title } from "./components/primitives";
import {
  AuthenticationGuard,
  AuthenticationGuardWithPermission,
  LogoutButton,
} from "./components/auth0";
import { siteConfig } from "./config/site";
import { PageNotFound } from "./pages/404";

import IndexPage from "@/pages/index";
import ApiPage from "@/pages/api";
import LinkPage from "@/pages/link";

function App() {
  const { isLoading, error } = useAuth0();
  const { t } = useTranslation();

  if (isLoading) {
    return <SiteLoading />;
  }
  if (error) {
    return (
      <DefaultLayout>
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
          <div className="inline-block max-w-lg text-center justify-center">
            <div className="mb-4">
              <h1 className={title()}>
                {t("error")}: {error.message}
              </h1>
            </div>
            <div>
              <LogoutButton
                showButtonIfNotAuthenticated={true}
                text={t("reload")}
              />
            </div>
          </div>
        </section>
      </DefaultLayout>
    );
  }

  return (
    <Suspense fallback={<SiteLoading />}>
      <Routes>
        <Route element={<IndexPage />} path="/" />
        <Route element={<ApiPage />} path="/docs" />
        <Route
          element={<AuthenticationGuard component={ApiPage} />}
          path="/api"
        />
        <Route
          element={<LinkPage />}
          path="/link"
        />
        {siteConfig().utilitiesMenuItems.map((item) => {
          // Check if item.component exists
          const Component = item.component;

          return (
            <Route
              key={item.href}
              element={
                <AuthenticationGuardWithPermission permission={item.permission}>
                  {Component ? <Component /> : null}
                </AuthenticationGuardWithPermission>
              }
              path={item.href}
            />
          );
        })}
        {siteConfig().apiMenuItems.map((item) => {
          // Check if item.component exists
          const Component = item.component;

          return (
            <Route
              key={item.href}
              element={
                <AuthenticationGuardWithPermission permission={item.permission}>
                  {Component ? <Component /> : null}
                </AuthenticationGuardWithPermission>
              }
              path={item.href}
            />
          );
        })}
        <Route element={<PageNotFound githubUrl="https://github.com/sctg-development/feedback-flow"/>} path="*" />
      </Routes>
    </Suspense>
  );
}

export default App;
