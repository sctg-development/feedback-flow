import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";
import { link as linkStyles } from "@heroui/theme";
import { clsx } from "@heroui/shared-utils";
import { useTranslation } from "react-i18next";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";

import { I18nIcon, LanguageSwitch } from "./language-switch";
import { LoginLogoutButton, LoginLogoutLink } from "./auth0";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { ChevronDown, GithubIcon } from "@/components/icons";
import { Logo } from "@/components/icons";
import { availableLanguages } from "@/i18n";

export const Navbar = () => {
  const { t } = useTranslation();

  return (
    <HeroUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand className="gap-3 max-w-fit">
          <Link
            className="flex justify-start items-center gap-1"
            color="foreground"
            href="/"
          >
            <Logo />
            <p className="font-bold text-inherit">{t("brand")}</p>
          </Link>
        </NavbarBrand>
        <div className="hidden lg:flex gap-4 justify-start ml-2">
          {siteConfig().navItems.map((item) => (
            <NavbarItem key={item.href}>
              <Link
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium",
                )}
                color="foreground"
                href={item.href}
              >
                {item.label}
              </Link>
            </NavbarItem>
          ))}
        </div>
        <NavbarItem>
          <Dropdown>
            <DropdownTrigger>
              <Button
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium",
                )}
                variant="light"
              >
                {t("Administration")} <ChevronDown />
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              {siteConfig().apiMenuItems.map((item) => (
                <DropdownItem key={item.href} textValue={item.label}>
                  <Link color="foreground" href="/add-user">
                    {item.label}
                  </Link>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <NavbarItem className="hidden sm:flex gap-2">
          <Link isExternal href={siteConfig().links.github} title={t("github")}>
            <GithubIcon className="text-default-500" />
          </Link>
          <ThemeSwitch />
          <LanguageSwitch
            availableLanguages={availableLanguages}
            icon={I18nIcon}
          />
          <LoginLogoutButton />
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <Link isExternal href={siteConfig().links.github}>
          <GithubIcon className="text-default-500" />
        </Link>
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <LanguageSwitch
          availableLanguages={availableLanguages}
          icon={I18nIcon}
        />
        <div className="mx-4 mt-2 flex flex-col gap-2">
          {siteConfig().navMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item}-${index}`}>
              <Link
                color={
                  index === 2
                    ? "primary"
                    : index === siteConfig().navMenuItems.length - 1
                      ? "danger"
                      : "foreground"
                }
                href={item.href}
                size="lg"
              >
                {item.label}
              </Link>
            </NavbarMenuItem>
          ))}
          <NavbarMenuItem key="login-logout">
            <LoginLogoutLink color="primary" />
          </NavbarMenuItem>
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
