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

import { Trans, useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState } from "react";
import { JWTPayload, jwtVerify } from "jose";

import { LinkUniversal } from "@/components/link-universal";
import { getLocalJwkSet } from "@/components/jwks";
import { Navbar } from "@/components/navbar";
import { siteConfig } from "@/config/site";
import { UserTechnicalInfoModal } from "@/components/modals/user-technical-info";
import { NoticeDrawer } from "@/components/drawers/notice";
import { QuestionIcon } from "@/components/icons";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [decodedToken, setDecodedToken] = useState<JWTPayload | null>(null);

  // state for the lazy-loaded notice drawer
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);

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
      <main className="container mx-auto max-w-7xl px-6 grow pt-16">
        {children}
      </main>
      <footer className="relative w-full flex items-center justify-center py-3">
        <LinkUniversal
          isExternal
          isInternet
          className="flex items-center gap-1 text-current"
          href={siteConfig().links.sctg}
          title={t("site-homepage")}
        >
          <span className="text-default-600">
            <Trans ns="base">powered-by</Trans>
          </span>
          <p className="text-primary">{t("brand")}&nbsp;</p>
        </LinkUniversal>
        <LinkUniversal
          className="flex items-center mx-1"
          color="secondary"
          href={"/docs"}
        >
          API
        </LinkUniversal>
        &nbsp;
        <span className="text-default-600" onClick={() => setIsModalOpen(true)}>
          {user?.name}
        </span>
        {/* notice drawer toggle icon positioned right */}
        <button
          aria-label={t("help-and-feedback")}
          className="absolute right-4 text-xl text-current"
          title={t("help-and-feedback")}
          type="button"
          onClick={() => setIsNoticeOpen(true)}
        >
          <QuestionIcon size={24} />
        </button>
      </footer>
      {user ? (
        <UserTechnicalInfoModal
          accessToken={accessToken}
          isOpen={isModalOpen}
          tokenPayload={decodedToken}
          user={user}
          onClose={() => setIsModalOpen(false)}
        />
      ) : (
        <></>
      )}

      {/* global notice drawer */}
      <NoticeDrawer
        isOpen={isNoticeOpen}
        onClose={() => setIsNoticeOpen(false)}
      />
    </div>
  );
}
