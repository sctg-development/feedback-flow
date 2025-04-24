export type SiteConfig = typeof siteConfig;

import i18next from "../i18n";

import AddNewUser from "@/pages/add-new-user";
import ManageDatabasePage from "@/pages/manage-database";

export const siteConfig = () => {
  const t = i18next.t;

  return {
    name: t("Feedback Flow"),
    description: i18next.t(
      "make-beautiful-websites-regardless-of-your-design-experience",
    ),
    navItems: [
      {
        label: i18next.t("home"),
        href: "/",
      },
      // {
      //   label: i18next.t("utilities"),
      //   href: "/utilities",
      // },
      // {
      //   label: i18next.t("pricing"),
      //   href: "/pricing",
      // },
      // {
      //   label: i18next.t("blog"),
      //   href: "/blog",
      // },
      // {
      //   label: i18next.t("about"),
      //   href: "/about",
      // },
    ],
    utilitiesMenuItems: [
      {
        label: i18next.t("oldest-ready-to-refund-pdf"),
        href: "/ready-to-refund-pdf",
        permission: import.meta.env.READ_PERMISSION,
      },
    ],
    navMenuItems: [
      {
        label: i18next.t("home"),
        href: "/",
      },
    ],
    apiMenuItems: [
      {
        label: i18next.t("add-a-new-user"),
        href: "/add-user",
        permission: import.meta.env.ADMIN_PERMISSION,
        component: AddNewUser,
      },
      {
        label: i18next.t("manage-database"),
        href: "/manage-db",
        permission: import.meta.env.BACKUP_PERMISSION,
        component: ManageDatabasePage,
      },
    ],
    links: {
      github: "https://github.com/sctg-development/feedback-flow",
      sctg: "https://sctg.eu.org",
      docs: "https://github.com/sctg-development/feedback-flow/blob/main/README.md",
      // discord: "https://discord.gg/9b6yyZKmH4",
      sponsor: "https://github.com/sponsors/sctg-development",
    },
  };
};
