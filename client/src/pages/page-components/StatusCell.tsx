import { Tooltip } from "@heroui/tooltip";
import { CopyButton } from "@/components/copy-button";
import { Transparent1x1WebpPixel } from "@/components/icons";
import { useTranslation } from "react-i18next";

interface StatusCellProps {
  text: string;
  screenshot?: string;
  screenshotSummary?: string;
  copyTooltipKey: "copy-screenshot" | "copy-screenshots";
  onScreenshotClick: (screenshot: string | string[]) => void;
}

/**
 * Component for rendering table cells that show status text with optional screenshot copy button
 * Includes tooltip for screenshot viewing and copy button with tooltip
 */
export const StatusCell = ({
  text,
  screenshot,
  screenshotSummary,
  copyTooltipKey,
  onScreenshotClick,
}: StatusCellProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <Tooltip content={t("click-to-see-the-screenshot")}>
        <span
          className="flex-1 cursor-pointer"
          onClick={() => {
            if (screenshotSummary && screenshot) {
              onScreenshotClick([screenshot, screenshotSummary]);
            } else if (screenshot) {
              onScreenshotClick(screenshot);
            }
          }}
        >
          {text}
        </span>
      </Tooltip>
      {screenshot && (
        <Tooltip content={t(copyTooltipKey)}>
          <CopyButton
            value={screenshotSummary && screenshot
              ? [screenshot, screenshotSummary || Transparent1x1WebpPixel]
              : screenshot
            }
            isImage={true}
            showToast={true}
            toastText={t("copied-to-clipboard")}
            className="ml-2"
          />
        </Tooltip>
      )}
    </div>
  );
};