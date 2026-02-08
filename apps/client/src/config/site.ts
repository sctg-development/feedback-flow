export type SiteConfig = typeof siteConfig;

import i18next from "../i18n";

import AddNewUser from "@/pages/add-new-user";
import OldestReadyToRefundPage from "@/pages/oldest-ready-to-refund";
import ManageDatabasePage from "@/pages/manage-database";
import StatsPage from "@/pages/stats";
import UsersAndPermissionsPage from "@/pages/users-and-permissions";

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
        href: import.meta.env.BASE_URL + "/",
      },
      // {
      //   label: i18next.t("utilities"),
      //   href: import.meta.env.BASE_URL + "/utilities",
      // },
      // {
      //   label: i18next.t("pricing"),
      //   href: import.meta.env.BASE_URL + "/pricing",
      // },
      // {
      //   label: i18next.t("blog"),
      //   href: import.meta.env.BASE_URL + "/blog",
      // },
      // {
      //   label: i18next.t("about"),
      //   href: import.meta.env.BASE_URL + "/about",
      // },
    ],
    utilitiesMenuItems: [
      {
        label: i18next.t("oldest-ready-to-refund-pdf"),
        href: import.meta.env.BASE_URL + "ready-to-refund-pdf",
        permission: import.meta.env.READ_PERMISSION,
        component: OldestReadyToRefundPage,
      },
      {
        label: i18next.t('statistics'),
        href: import.meta.env.BASE_URL + "stats",
        permission: import.meta.env.READ_PERMISSION,
        component: StatsPage,
      }
    ],
    navMenuItems: [
      {
        label: i18next.t("home"),
        href: import.meta.env.BASE_URL + "/",
      },
    ],
    apiMenuItems: [
      {
        label: i18next.t("add-a-new-user"),
        href: import.meta.env.BASE_URL + "/add-user",
        permission: import.meta.env.ADMIN_PERMISSION,
        component: AddNewUser,
      },
      {
        label: i18next.t("manage-database"),
        href: import.meta.env.BASE_URL + "/manage-db",
        permission: import.meta.env.BACKUP_PERMISSION,
        component: ManageDatabasePage,
      },
      {
        label: i18next.t("users-and-permissions"),
        href: import.meta.env.BASE_URL + "/users-and-permissions",
        permission: import.meta.env.ADMIN_AUTH0_PERMISSION,
        component: UsersAndPermissionsPage,
      }
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
