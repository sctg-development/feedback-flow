/**
 * MIT License
 *
 * Copyright (c) 2025 Ronan LE MEILLAT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { Button } from "@heroui/button";
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
import React from "react";
import { useHref } from "react-router-dom";

import { I18nIcon, LanguageSwitch } from "./language-switch";
import {
  AuthenticationGuardWithPermission,
  LoginLogoutButton,
  LoginLogoutLink,
} from "./auth0";
import { SearchBar } from "./search-bar";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { ChevronDownIcon, GithubIcon } from "@/components/icons";
import { Logo } from "@/components/icons";
import { availableLanguages } from "@/i18n";
import { LinkUniversal } from "@/components/link-universal";

export const Navbar = React.memo(() => {
  const { t, i18n } = useTranslation();

  const searchInput = <SearchBar />;

  return (
    <HeroUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand className="gap-3 max-w-fit">
          <LinkUniversal
            className="flex justify-start items-center gap-1"
            color="foreground"
            href={useHref("/")}
          >
            <Logo />
            <p className="font-bold text-inherit">{t("brand")}</p>
          </LinkUniversal>
        </NavbarBrand>
        <div className="hidden lg:flex gap-4 justify-start ml-2">
          {siteConfig().navItems.map((item) => (
            <AuthenticationGuardWithPermission
              key={`nav-${item.href}`}
              permission={import.meta.env.READ_PERMISSION}
            >
              <NavbarItem>
                <LinkUniversal
                  className={clsx(
                    linkStyles({ color: "foreground" }),
                    "data-[active=true]:text-primary data-[active=true]:font-medium",
                  )}
                  color="foreground"
                  href={useHref(item.href)}
                >
                  {item.label}
                </LinkUniversal>
              </NavbarItem>
            </AuthenticationGuardWithPermission>
          ))}
        </div>
        <AuthenticationGuardWithPermission
          permission={import.meta.env.READ_PERMISSION}
        >
          <NavbarItem key="utilities-menu" className="hidden md:flex">
            <Dropdown>
              <DropdownTrigger>
                <Button
                  className={clsx(
                    linkStyles({ color: "foreground" }),
                    "data-[active=true]:text-primary data-[active=true]:font-medium",
                  )}
                  variant="light"
                >
                  {t("utilities")} <ChevronDownIcon />
                </Button>
              </DropdownTrigger>
              <DropdownMenu>
                {siteConfig().utilitiesMenuItems.map((item) => (
                  <DropdownItem key={item.href} textValue={item.label}>
                    <LinkUniversal
                      className={clsx(
                        linkStyles({ color: "foreground" }),
                        "data-[active=true]:text-primary data-[active=true]:font-medium",
                      )}
                      color="foreground"
                      href={useHref(item.href)}
                    >
                      {item.label}
                    </LinkUniversal>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        </AuthenticationGuardWithPermission>
        <AuthenticationGuardWithPermission
          permission={import.meta.env.ADMIN_PERMISSION}
        >
          <NavbarItem key="administration-menu" className="hidden md:flex">
            <Dropdown>
              <DropdownTrigger>
                <Button
                  className={clsx(
                    linkStyles({ color: "foreground" }),
                    "data-[active=true]:text-primary data-[active=true]:font-medium",
                  )}
                  variant="light"
                >
                  {t("Administration")} <ChevronDownIcon />
                </Button>
              </DropdownTrigger>
              <DropdownMenu>
                {siteConfig().apiMenuItems.map((item) => (
                  <DropdownItem key={item.href} textValue={item.label}>
                    <AuthenticationGuardWithPermission
                      fallback={
                        <span className="line-through">{item.label}</span>
                      }
                      permission={item.permission}
                    >
                      <LinkUniversal
                        color="foreground"
                        href={useHref(item.href)}
                      >
                        {item.label}
                      </LinkUniversal>
                    </AuthenticationGuardWithPermission>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        </AuthenticationGuardWithPermission>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <NavbarItem key="social-media" className="hidden sm:flex gap-2">
          <LinkUniversal
            isExternal
            isInternet
            href={siteConfig().links.github}
            title={t("github")}
          >
            <GithubIcon className="text-default-500" />
          </LinkUniversal>
          <ThemeSwitch />
          <LanguageSwitch
            availableLanguages={availableLanguages}
            icon={I18nIcon}
          />
          <LoginLogoutButton />
        </NavbarItem>
        <NavbarItem className="hidden lg:flex">{searchInput}</NavbarItem>
      </NavbarContent>

      {/* Mobile Navbar */}
      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <LinkUniversal isExternal isInternet href={siteConfig().links.github}>
          <GithubIcon className="text-default-500" />
        </LinkUniversal>
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <div className="mx-4 mt-2 flex flex-col gap-2">
          {siteConfig().navMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item}-${index}`}>
              <LinkUniversal color="primary" href={item.href} size="lg">
                {item.label}
              </LinkUniversal>
            </NavbarMenuItem>
          ))}
          {siteConfig().utilitiesMenuItems.map((item, index) => (
            <AuthenticationGuardWithPermission
              key={`${item}-${index}`}
              fallback={null}
              permission={item.permission}
            >
              <NavbarMenuItem>
                <LinkUniversal color="foreground" href={item.href}>
                  {item.label}
                </LinkUniversal>
              </NavbarMenuItem>
            </AuthenticationGuardWithPermission>
          ))}
          {siteConfig().apiMenuItems.map((item, index) => (
            <AuthenticationGuardWithPermission
              key={`${item}-${index}`}
              fallback={null}
              permission={item.permission}
            >
              <NavbarMenuItem>
                <LinkUniversal color="foreground" href={item.href}>
                  {item.label}
                </LinkUniversal>
              </NavbarMenuItem>
            </AuthenticationGuardWithPermission>
          ))}
          <NavbarMenuItem key="login-logout">
            <LoginLogoutLink color="primary" />
          </NavbarMenuItem>
        </div>
        
        <div className="border-t border-divider mt-4 pt-4 mx-4">
          <p className="text-xs text-default-500 mb-3 font-semibold">{t("language")}</p>
          <div className="flex gap-2 flex-wrap">
            {availableLanguages.map((lang) => (
              <Button
                key={lang.code}
                size="sm"
                className={lang.code === localStorage.getItem("preferredLanguage") || lang.code === i18n.language ? "text-primary font-semibold" : "text-default-600"}
                variant={lang.code === localStorage.getItem("preferredLanguage") || lang.code === i18n.language ? "solid" : "light"}
                onPress={() => {
                  i18n.changeLanguage(lang.code);
                  localStorage.setItem("preferredLanguage", lang.code);
                  document.documentElement.lang = lang.code;
                  document.documentElement.dir = lang.isRTL ? "rtl" : "ltr";
                }}
              >
                {lang.code.split("-")[1]?.toUpperCase() || lang.code.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
});
