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
import React, { useState } from "react";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Spinner } from "@heroui/spinner"; // Assuming you have a spinner component

import { useSecuredApi } from "./auth0";
import { AuthenticationGuardWithPermission } from "./auth0";
import { DownloadIcon } from "./icons";

interface FetchToDownloadProps {
  /**
   * URL of the secured API endpoint to fetch data from
   */
  url: string;

  /**
   * Button text shown before fetching
   */
  buttonText: string;

  /**
   * Text for the download link after data is fetched
   */
  downloadLinkText: string;

  /**
   * Filename for the downloaded file
   */
  filename: string;

  /**
   * Optional CSS class for the button
   */
  className?: string;

  /**
   * Optional put date in filename
   */
  putDateInFilename?: boolean;
}

const createFilenameWithDate = (filename: string, date: string) => {
  return `${filename}-${date}.json`;
};

/**
 * A component that starts as a button, fetches JSON data when clicked,
 * and transforms into a download link for the retrieved data.
 *
 * @example
 * ```tsx
 * <FetchToDownload
 *   url="https://api.example.com/data"
 *   buttonText="Export Database"
 *   downloadLinkText="Download Backup"
 *   filename="database-backup.json"
 * />
 * ```
 */
export const FetchToDownload: React.FC<FetchToDownloadProps> = ({
  url,
  buttonText,
  downloadLinkText,
  filename,
  putDateInFilename = false,

  className = "text-sm font-normal text-default-600 bg-default-100",
}) => {
  const { getJson } = useSecuredApi();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [downloadDate, setDownloadDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to handle the fetch operation
  const handleFetch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const responseData = await getJson(url);

      setData(responseData);
      setDownloadDate(new Date().toISOString());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error fetching data:", err);
      setError(typeof err === "string" ? err : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  // Create a download URL from the fetched data
  const getDownloadUrl = () => {
    if (!data) return "";

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    return URL.createObjectURL(blob);
  };

  // If we're in an error state
  if (error) {
    return (
      <Button
        className={`${className} bg-danger text-white`}
        onPress={handleFetch} // Allow retry
      >
        Error: {error} (Click to retry)
      </Button>
    );
  }

  // If we're loading
  if (isLoading) {
    return (
      <Button disabled className={className}>
        <Spinner size="sm" /> Loading...
      </Button>
    );
  }

  // If we have data, show download link
  if (data) {
    return (
      <Link
        className={`${className} flex items-center gap-2 p-2 rounded`}
        download={
          putDateInFilename
            ? createFilenameWithDate(
                filename,
                downloadDate || new Date().toISOString(),
              )
            : filename
        }
        href={getDownloadUrl()}
      >
        <DownloadIcon />
        {downloadLinkText}
      </Link>
    );
  }

  // Otherwise, show the initial button
  return (
    <Button className={className} onPress={handleFetch}>
      {buttonText}
    </Button>
  );
};

/**
 * A version of FetchToDownload that is protected by permission check.
 * This component will only render if the user has the required permission.
 *
 * @example
 * ```tsx
 * <ProtectedFetchToDownload
 *   url="https://api.example.com/admin/backup"
 *   buttonText="Export Database"
 *   downloadLinkText="Download Backup"
 *   filename="database-backup.json"
 *   permission="backup:database"
 * />
 * ```
 */
export const ProtectedFetchToDownload: React.FC<
  FetchToDownloadProps & { permission: string }
> = (props) => {
  return (
    <AuthenticationGuardWithPermission permission={props.permission}>
      <FetchToDownload {...props} />
    </AuthenticationGuardWithPermission>
  );
};
