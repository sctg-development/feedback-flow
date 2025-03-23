export type SiteConfig = typeof siteConfig;
import i18next from "../i18n";

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
      {
        label: i18next.t("api"),
        href: "/api",
      },
      {
        label: i18next.t("pricing"),
        href: "/pricing",
      },
      {
        label: i18next.t("blog"),
        href: "/blog",
      },
      {
        label: i18next.t("about"),
        href: "/about",
      },
    ],
    navMenuItems: [
      {
        label: i18next.t("home"),
        href: "/",
      },
      {
        label: i18next.t("api"),
        href: "/api",
      },
      {
        label: i18next.t("pricing"),
        href: "/pricing",
      },
      {
        label: i18next.t("blog"),
        href: "/blog",
      },
      {
        label: i18next.t("about"),
        href: "/about",
      },
    ],
    apiMenuItems: [
      {
        label: i18next.t("add-a-new-user"),
        href: "/add-user",
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
