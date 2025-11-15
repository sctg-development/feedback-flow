import { useState, useEffect } from "react";
import { useSecuredApi } from "@/components/auth0";

/**
 * Hook to manage purchase-related permissions
 *
 * @returns Object containing permission states and loading status
 */
export const usePurchasePermissions = () => {
  const { hasPermission } = useSecuredApi();
  const [hasWritePermission, setHasWritePermission] = useState<boolean | null>(null);

  // Get write permissions on component mount
  useEffect(() => {
    const checkPermissions = async () => {
      const canWrite = await hasPermission(import.meta.env.WRITE_PERMISSION);
      setHasWritePermission(canWrite);
    };

    checkPermissions();
  }, [hasPermission]);

  return {
    hasWritePermission,
    isLoadingPermissions: hasWritePermission === null,
  };
};