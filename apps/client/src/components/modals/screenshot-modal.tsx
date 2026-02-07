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
/*
 * @description Modal component for showing a screenshot coming from the api as a data url
 * @param {string} screenshot - The screenshot data URL to display
 */
import { Modal, ModalBody, ModalContent, ModalProps } from "@heroui/modal";
import { Image } from "@heroui/image";

export const ScreenshotModal = ({
  screenshot,
  ...props
}: {
  screenshot: string | string[];
} & ModalProps) => {
  const screenshotArray = Array.isArray(screenshot) ? screenshot : [screenshot];

  return (
    <Modal {...props}>
      <ModalContent>
        <ModalBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
            {screenshotArray.map((screenshot, index) => (
              <Image
                key={index}
                alt={`Screenshot ${index + 1}`}
                className="w-full"
                src={screenshot}
              />
            ))}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
