import React, { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent } from "@heroui/drawer";

const NoticeContent = lazy(() => import("./notice-content"));

export interface NoticeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NoticeDrawer({ isOpen, onClose }: NoticeDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer {...{ isOpen }} placement="right" onClose={onClose}>
      <DrawerContent className="flex flex-col h-full">
        {/* header area */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{t("notice.title")}</h2>
        </div>
        {/* body - scroll inside drawer */}
        <div className="px-6 py-4 overflow-auto grow">
          {isOpen && (
            <Suspense fallback={<p>{t("loading")}…</p>}>
              <NoticeContent />
            </Suspense>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
