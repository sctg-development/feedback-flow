/**
 * @copyright Copyright (c) 2024-2025 Ronan LE MEILLAT
 * @license AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
import type React from "react";

import { LinkUniversal } from "@/components/link-universal";
import { Trans, useTranslation } from "react-i18next";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState } from "react";
import { Snippet } from "@heroui/snippet";
import { JWTPayload, jwtVerify } from "jose";
import { getLocalJwkSet } from "@/components/jwks";

import { Navbar } from "@/components/navbar";
import { siteConfig } from "@/config/site";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [decodedToken, setDecodedToken] = useState<JWTPayload | null>(null);

  const decodedTokenCacheRef = useRef<Map<string, JWTPayload>>(new Map());

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    const loadToken = async () => {
      try {
        const token = await getAccessTokenSilently();
        if (!isMounted) return;

        setAccessToken(token);

        if (decodedTokenCacheRef.current.has(token)) {
          setDecodedToken(decodedTokenCacheRef.current.get(token) || null);
          return;
        }

        const JWKS = await getLocalJwkSet(import.meta.env.AUTH0_DOMAIN);

        const verified = await jwtVerify(token, JWKS, {
          issuer: `https://${import.meta.env.AUTH0_DOMAIN}/`,
          audience: import.meta.env.AUTH0_AUDIENCE,
        });

        const payload = verified.payload as JWTPayload;
        decodedTokenCacheRef.current.set(token, payload);

        if (isMounted) setDecodedToken(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to decode access token:", err);
      }
    };

    loadToken();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, getAccessTokenSilently]);

  return (
    <div className="relative flex flex-col h-screen">
      <Navbar />
      <main className="container mx-auto max-w-7xl px-6 flex-grow pt-16">
        {children}
      </main>
      <footer className="w-full flex items-center justify-center py-3">
        <LinkUniversal
          isInternet
          isExternal
          className="flex items-center gap-1 text-current"
          href={siteConfig().links.sctg}
          title={t("site-homepage")}
        >
          <span className="text-default-600">
            <Trans ns="base">powered-by</Trans>
          </span>
          <p className="text-primary">{t("brand")}&nbsp;</p>
        </LinkUniversal>
        <Dropdown>
          <DropdownTrigger>
            {isAuthenticated ? (
              <span>
                {t("user")}: &nbsp;{user?.name}
              </span>
            ) : (
              <></>
            )}
          </DropdownTrigger>
          <DropdownMenu className="max-w-5xl">
            <DropdownItem key="user-logged" textValue="user-logged">
              <span className="text-default-600">{t("token")}:</span>
              <br />
              <Snippet className="max-w-4xl" symbol="" title="api-response">
                <div className="max-w-2xs sm:max-w-sm md:max-w-md lg:max-w-3xl  whitespace-break-spaces  text-wrap break-words">
                  {accessToken}
                </div>
              </Snippet>
              <br />
              <span className="text-default-600">
                {t("expiration")}:{" "}
                {new Date((decodedToken?.exp || 0) * 1000).toLocaleString()}
              </span>
              <br />
              <span className="text-default-600">
                {t("permissions")}:{" "}
                {((decodedToken?.permissions as string[]) || []).join(", ") ||
                  t("no-permissions")}
              </span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <LinkUniversal className="flex items-center mx-1" color="secondary" href="/docs">
          API
        </LinkUniversal>
      </footer>
    </div>
  );
}
