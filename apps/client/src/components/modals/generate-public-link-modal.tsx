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
import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/modal';
import { Button } from '@heroui/button';
import { addToast } from '@heroui/toast';
import { useSecuredApi } from '@/components/auth0';
import { CopyButton } from '../copy-button';

interface GeneratePublicLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string;
}

interface Duration {
  key: string;
  label: string;
  seconds: number;
}

const DURATION_OPTIONS: Duration[] = [
  { key: '1h', label: 'link-duration-1h', seconds: 3600 },
  { key: '3h', label: 'link-duration-3h', seconds: 10800 },
  { key: '6h', label: 'link-duration-6h', seconds: 21600 },
  { key: '12h', label: 'link-duration-12h', seconds: 43200 },
  { key: '1d', label: 'link-duration-1d', seconds: 86400 },
  { key: '3d', label: 'link-duration-3d', seconds: 259200 },
  { key: '7d', label: 'link-duration-7d', seconds: 604800 },
];

export const GeneratePublicLinkModal = memo<GeneratePublicLinkModalProps>(
  ({ isOpen, onClose, purchaseId }) => {
    const { t } = useTranslation();
    const { postJson } = useSecuredApi();
    const [selectedDuration, setSelectedDuration] = useState<string>('1d');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateLink = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const duration = DURATION_OPTIONS.find((d) => d.key === selectedDuration);
        if (!duration) {
          throw new Error('Invalid duration selected');
        }

        const response = await postJson(
          `${import.meta.env.API_BASE_URL}/link/public?duration=${duration.seconds}&purchase=${purchaseId}`,
          {}
        );

        if (!response.success) {
          throw new Error(response.message || 'Failed to generate link');
        }

        const link = `${window.location.origin}${import.meta.env.BASE_URL}/link?code=${response.code}`.replaceAll('//', '/').replace(':/', '://');
        setGeneratedLink(link);

        addToast({
          title: t('public-link-generated'),
          variant: 'solid',
          timeout: 3000,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);

        addToast({
          title: t('error-generating-link'),
          variant: 'solid',
          timeout: 3000,
        });
      } finally {
        setIsLoading(false);
      }
    }, [selectedDuration, purchaseId, postJson, t]);

    const handleClose = useCallback(() => {
      setSelectedDuration('1d');
      setGeneratedLink(null);
      setError(null);
      onClose();
    }, [onClose]);

    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {t('generate-public-link')}
          </ModalHeader>
          <ModalBody>
            {!generatedLink ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    {t('select-link-duration')}
                  </label>
                  <select
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    disabled={isLoading}
                    className="flex bg-default-100 dark:bg-default-800 text-foreground rounded-lg px-3 py-2 text-sm border border-default-300 dark:border-default-600 hover:border-default-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {DURATION_OPTIONS.map((duration) => (
                      <option key={duration.key} value={duration.key}>
                        {t(duration.label)}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-800 dark:text-red-200 text-sm">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-foreground-600">
                  {t('copy-link')}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-default-100 dark:bg-default-800 rounded p-3 text-sm overflow-auto break-all">
                    {generatedLink}
                  </code>
                  <CopyButton
                    value={generatedLink}
                    showToast={true}
                    toastText={t('copied-to-clipboard')}
                    size="sm"
                  />
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onPress={handleClose}
              disabled={isLoading}
            >
              {generatedLink ? t('close') : t('cancel')}
            </Button>
            {!generatedLink && (
              <Button
                color="primary"
                onPress={handleGenerateLink}
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? t('generating-link') : t('generate-link')}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }
);

GeneratePublicLinkModal.displayName = 'GeneratePublicLinkModal';
