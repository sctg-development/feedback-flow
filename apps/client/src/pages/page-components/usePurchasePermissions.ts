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

import { useState, useEffect } from "react";

import { useSecuredApi } from "@/components/auth0";

/**
 * Custom React Hook: usePurchasePermissions
 *
 * This hook manages user permissions related to purchase operations.
 * It checks if the current user has write permissions for purchases and provides
 * loading states to handle asynchronous permission checking.
 *
 * Purpose:
 * - Centralize permission logic for purchase-related operations
 * - Provide a clean interface for components to check user capabilities
 * - Handle loading states during permission verification
 *
 * The hook uses the useSecuredApi hook to access permission checking functions
 * and maintains local state for permission status and loading state.
 *
 * @returns Object containing:
 *   - hasWritePermission: boolean | null - True if user can write, false if not, null while loading
 *   - isLoadingPermissions: boolean - True while permissions are being checked
 */
export const usePurchasePermissions = () => {
  // Access the secured API functions for permission checking
  const { hasPermission } = useSecuredApi();

  // State to track whether the user has write permissions
  // null = loading, true = has permission, false = no permission
  const [hasWritePermission, setHasWritePermission] = useState<boolean | null>(
    null,
  );

  // Effect hook to check permissions when the component mounts
  // This runs once when the hook is first used
  useEffect(() => {
    /**
     * Asynchronous function to check user permissions
     * Calls the API to verify if the current user has write permissions
     */
    const checkPermissions = async () => {
      // Check if user has the required write permission
      // import.meta.env.WRITE_PERMISSION contains the permission string
      const canWrite = await hasPermission(import.meta.env.WRITE_PERMISSION);

      // Update the state with the permission result
      setHasWritePermission(canWrite);
    };

    // Execute the permission check
    checkPermissions();
  }, [hasPermission]); // Re-run if hasPermission function changes

  // Return the permission state and loading status
  return {
    hasWritePermission, // Current permission status
    isLoadingPermissions: hasWritePermission === null, // True while loading
  };
};
