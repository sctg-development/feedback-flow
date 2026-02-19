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

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { addToast } from "@heroui/toast";
import { useAuth0 } from "@auth0/auth0-react";

import DefaultLayout from "@/layouts/default";
import { useSecuredApi } from "@/components/auth0";
import {
  Auth0ManagementTokenApiResponse,
  Auth0ManagementTokenResponse,
  Auth0User,
  Auth0Permission,
  Tester,
  GetTestersResponse,
} from "@/types/data";
import AssignTesterModal from "@/components/modals/assign-tester-modal";
import CreateTesterModal from "@/components/modals/create-tester-modal";
import ConfirmDeleteModal from "@/components/modals/confirm-delete-modal";

// import { Toast } from "@heroui/toast"; // Not using Toast API directly, using message state

export default function UsersAndPermissionsPage() {
  const { user } = useAuth0();
  const currentUserId = (user?.sub || "").toString().trim();
  const {
    getAuth0ManagementToken,
    listAuth0Users,
    getUserPermissions,
    addPermissionToUser,
    removePermissionFromUser,
    deleteAuth0User,
    postJson,
    deleteJson,
  } = useSecuredApi();
  const postJsonRef = useRef(postJson);

  useEffect(() => {
    postJsonRef.current = postJson;
  }, [postJson]);
  const [token, setToken] = useState<Auth0ManagementTokenResponse | null>(null);
  const { t } = useTranslation();
  // replaced message state and inline alert by HeroUI toasts
  const [users, setUsers] = useState<Auth0User[]>([]);
  const [usersWithTester, setUsersWithTester] = useState<
    Array<Auth0User & { testerName?: string }>
  >([]);
  const [testerMap, setTesterMap] = useState<
    Record<string, Tester | undefined>
  >({});
  // roles are not used yet because we work with direct permissions (not roles)
  const [editing, setEditing] = useState<
    Record<string, Record<string, boolean>>
  >({});
  // bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<
    Record<string, boolean>
  >({});
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalIds, setAssignModalIds] = useState<string[]>([]);
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);
  const [confirmUnassignIds, setConfirmUnassignIds] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Auth0User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<Auth0User | null>(
    null,
  );
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Auth0 Management API token for accessing Auth0 management endpoints
    getAuth0ManagementToken()
      .then(async (auth0TokenResponse: Auth0ManagementTokenApiResponse) => {
        setToken(auth0TokenResponse as Auth0ManagementTokenResponse); //TODO verify type correctness (it can be ErrorResponse)
        // After token is fetched, list roles and users
        if ((auth0TokenResponse as any)?.access_token) {
          const mgmtToken = (auth0TokenResponse as any).access_token;

          try {
            if (!mgmtToken) {
              console.error("No mgmtToken available to call listAuth0Users");
            }
            // Calling listAuth0Users
            const u = (await listAuth0Users(mgmtToken)) ?? [];

            setUsers(u);
            // listAuth0Users resolved
          } catch (err) {
            console.error("Failed to fetch Auth0 roles or users", err);
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching token data:", error);
      });
  }, []);

  // Ensure the tester map is updated whenever the list of Auth0 users changes
  useEffect(() => {
    // Reset map when no users
    if (!users || users.length === 0) {
      setTesterMap({});

      return;
    }

    let cancelled = false;

    (async () => {
      const ids = Array.from(
        new Set(
          users.map((u) => (u.user_id || "").toString().trim()).filter(Boolean),
        ),
      );

      // Users effect: found ids
      if (ids.length === 0) {
        setTesterMap({});

        return;
      }

      try {
        const postJsonIsFunction = typeof postJsonRef.current === "function";

        if (!postJsonIsFunction) {
        }
        const postJsonToUse =
          postJsonRef.current && typeof postJsonRef.current === "function"
            ? postJsonRef.current
            : postJson;

        if (typeof postJsonToUse !== "function") {
          // No postJson available - aborting
          setTesterMap({});

          return;
        }
        // Calling POST /testers for ids
        const resp = (await postJsonToUse(
          `${import.meta.env.API_BASE_URL}/testers`,
          { ids },
        )) as GetTestersResponse;

        // POST /testers response
        if (cancelled) return;
        if (resp && resp.success && Array.isArray(resp.data)) {
          const map: Record<string, Tester> = {};

          for (const tester of resp.data) {
            if (Array.isArray(tester.ids)) {
              for (const id of tester.ids) {
                const key = (id || "").toString().trim();

                if (!key) continue;
                map[key] = tester;
                // Also register the bare id (without provider prefix) to support matches
                const bare = key.includes("|") ? key.split("|").pop() : key;

                if (bare) map[bare] = tester;
              }
            }
          }
          setTesterMap(map);
          // Build derived users with testerName to ensure table updates
          const derived = users.map((u) => {
            const userId = (u.user_id || "").toString().trim();
            let testerName = "";

            if (userId) {
              testerName = map[userId]?.name ?? "";
            }
            if (!testerName) {
              const identities = (u as Auth0User).identities || [];

              for (const id of identities) {
                const providerKey = `${id.provider}|${id.user_id}`.trim();

                if (map[providerKey]) {
                  testerName = map[providerKey].name;
                  break;
                }
                const bare = `${id.user_id}`.trim();

                if (map[bare]) {
                  testerName = map[bare].name;
                  break;
                }
              }
            }

            return { ...u, testerName };
          });

          setUsersWithTester(derived);
          // Derived usersWithTester computed
          if (import.meta.env.DEV) {
            // Helpful debug info during development
            // testerMap built for users
          }
        } else {
          if (import.meta.env.DEV) {
            // POST /testers returned no results or success=false
            addToast({
              title: t("error"),
              description: t("error-fetching-data"),
              variant: "solid",
              timeout: 3000,
            });
          }
          // empty map if not success
          setTesterMap({});
        }
      } catch (err) {
        console.error("Failed to build tester map on users change:", err);
        setTesterMap({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [users]);

  const refreshTesterMap = async () => {
    // duplicate the logic to rebuild the tester map for the current users
    if (!users || users.length === 0) {
      setTesterMap({});
      setUsersWithTester([]);

      return;
    }
    try {
      const ids = Array.from(
        new Set(
          users.map((u) => (u.user_id || "").toString().trim()).filter(Boolean),
        ),
      );

      if (ids.length === 0) {
        setTesterMap({});
        setUsersWithTester(users);

        return;
      }
      const postJsonToUse =
        postJsonRef.current && typeof postJsonRef.current === "function"
          ? postJsonRef.current
          : postJson;

      if (typeof postJsonToUse !== "function") return;
      const resp = (await postJsonToUse(
        `${import.meta.env.API_BASE_URL}/testers`,
        { ids },
      )) as GetTestersResponse;

      if (resp && resp.success && Array.isArray(resp.data)) {
        const map: Record<string, Tester> = {};

        for (const tester of resp.data) {
          if (Array.isArray(tester.ids)) {
            for (const id of tester.ids) {
              const key = (id || "").toString().trim();

              if (!key) continue;
              map[key] = tester;
              const bare = key.includes("|") ? key.split("|").pop() : key;

              if (bare) map[bare] = tester;
            }
          }
        }
        setTesterMap(map);
        const derived = users.map((u) => {
          const userId = (u.user_id || "").toString().trim();
          let testerName = "";

          if (userId) {
            testerName = map[userId]?.name ?? "";
          }
          if (!testerName) {
            const identities = (u as Auth0User).identities || [];

            for (const id of identities) {
              const providerKey = `${id.provider}|${id.user_id}`.trim();

              if (map[providerKey]) {
                testerName = map[providerKey].name;
                break;
              }
              const bare = `${id.user_id}`.trim();

              if (map[bare]) {
                testerName = map[bare].name;
                break;
              }
            }
          }

          return { ...u, testerName };
        });

        setUsersWithTester(derived);
      }
    } catch (err) {
      console.error("Failed to refresh tester map:", err);
    }
  };
  const onTogglePermission = (userId: string, permissionName: string) => {
    const u = users.find((x) => x.user_id === userId);

    if (!u) return;
    setEditing((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [permissionName]: !(prev[userId]?.[permissionName] ?? false),
      },
    }));
  };

  const getAssignedTesterName = (u: Auth0User) => {
    // prefer precomputed value from usersWithTester
    const precomputed = (u as any).testerName;

    if (precomputed) return precomputed;
    const userId = (u.user_id || "").toString().trim();

    if (userId && testerMap[userId]) return testerMap[userId]?.name ?? "";
    const identities = (u as Auth0User).identities || [];

    for (const id of identities) {
      const providerKey = `${id.provider}|${id.user_id}`.trim();

      if (testerMap[providerKey]) return testerMap[providerKey]?.name ?? "";
      const bare = `${id.user_id}`.trim();

      if (testerMap[bare]) return testerMap[bare]?.name ?? "";
    }

    return "";
  };

  const findAssignedTesterAndStoredId = (
    u: Auth0User,
  ): { tester?: Tester; storedId?: string } => {
    const userId = (u.user_id || "").toString().trim();

    if (userId && testerMap[userId]) {
      // The exact userId exists in the map; but the tester.ids array may store the provider|id instead
      const t = testerMap[userId]!;
      // try to find precise stored id within tester.ids
      const stored = (t.ids || []).find(
        (i) => i === userId || i.endsWith(`|${userId}`),
      );

      if (stored) return { tester: t, storedId: stored };

      return { tester: t, storedId: userId };
    }
    // Try identities
    const identities = (u as Auth0User).identities || [];

    for (const id of identities) {
      const providerKey = `${id.provider}|${id.user_id}`.trim();

      if (testerMap[providerKey]) {
        const t = testerMap[providerKey]!;
        const stored = (t.ids || []).find(
          (i) =>
            i === providerKey ||
            i === `${id.user_id}` ||
            i.endsWith(`|${id.user_id}`),
        );

        if (stored) return { tester: t, storedId: stored };

        return { tester: t, storedId: providerKey };
      }
      const bare = `${id.user_id}`.trim();

      if (testerMap[bare]) {
        const t = testerMap[bare]!;
        const stored = (t.ids || []).find(
          (i) => i === bare || i.endsWith(`|${bare}`),
        );

        if (stored) return { tester: t, storedId: stored };

        return { tester: t, storedId: bare };
      }
    }

    return {};
  };

  const toggleSelectUser = (userId: string) => {
    // Prevent selecting the current logged-in user to avoid accidental self-unassign/delete
    if (userId === currentUserId) return;
    setSelectedUserIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const bulkSelectedIds = () =>
    Object.keys(selectedUserIds).filter((k) => selectedUserIds[k]);
  const bulkUnassignedIds = () =>
    bulkSelectedIds().filter((id) => !testerMap[id]);

  const openAssignModalForSelected = () => {
    // only consider ids that are not already assigned to a tester
    const ids = bulkSelectedIds().filter((id) => !testerMap[id]);

    if (ids.length === 0) return;
    setAssignModalIds(ids);
    setIsAssignModalOpen(true);
  };

  const openAssignModalForOne = (id: string) => {
    // only open modal if the user does not already have a mapped tester
    const user =
      users.find((u) => u.user_id === id) ||
      usersWithTester.find((u) => u.user_id === id);

    if (user) {
      const assigned = getAssignedTesterName(user);

      if (assigned) {
        addToast({
          title: t("info"),
          description: t("user-already-assigned"),
          variant: "solid",
        });

        return;
      }
    } else {
      // If we don't have the user data, still check map by id
      if (testerMap[id]) {
        addToast({
          title: t("info"),
          description: t("user-already-assigned"),
          variant: "solid",
        });

        return;
      }
    }
    setAssignModalIds([id]);
    setIsAssignModalOpen(true);
  };

  const unassignId = async (id: string) => {
    // Prevent self-unassign to avoid breaking the current user's session
    if (id === currentUserId) {
      addToast({
        title: t("error"),
        description: t("cannot-unassign-self"),
        variant: "solid",
      });

      return;
    }
    try {
      // find the tester object for id via map
      const userObj =
        users.find((u) => u.user_id === id) ??
        usersWithTester.find((u) => u.user_id === id);
      const { tester, storedId } = userObj
        ? findAssignedTesterAndStoredId(userObj as Auth0User)
        : { tester: testerMap[id], storedId: undefined };

      if (!tester) {
        addToast({
          title: t("error"),
          description: t("no-tester-found-for-id"),
          variant: "solid",
        });

        return;
      }
      // Determine stored id to delete
      const idToDelete =
        storedId ||
        ((tester.ids || []).find((i) => i === id || i.endsWith(`|${id}`)) ??
          id);
      // Call DELETE endpoint using secured deleteJson
      const parsed = await deleteJson(
        `${import.meta.env.API_BASE_URL}/tester/ids`,
        { uuid: tester.uuid, id: idToDelete },
      );

      if (parsed && parsed.success) {
        addToast({
          title: t("success"),
          description: t("oauth-id-removed-successfully"),
          variant: "solid",
        });
        await refreshTesterMap();
      } else {
        addToast({
          title: t("error"),
          description: t("error-removing-oauth-id"),
          variant: "solid",
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        title: t("error"),
        description: t("error-removing-oauth-id"),
        variant: "solid",
      });
    }
  };

  const unassignSelected = async () => {
    const ids = bulkSelectedIds();

    if (ids.length === 0) return;
    // show confirmation
    setConfirmUnassignIds(ids);
    setConfirmUnassignOpen(true);
  };

  const doUnassignSelected = async (ids: string[]) => {
    if (ids.length === 0) return;
    // Never unassign the current logged-in user
    ids = ids.filter((id) => id !== currentUserId);
    // for simplification, call delete for each id in parallel
    try {
      await Promise.all(
        ids.map(async (id) => {
          const userObj =
            users.find((u) => u.user_id === id) ??
            usersWithTester.find((u) => u.user_id === id);
          let tester: Tester | undefined;
          let storedId: string | undefined;

          if (userObj) {
            const found = findAssignedTesterAndStoredId(userObj as Auth0User);

            tester = found.tester;
            storedId = found.storedId;
          } else {
            tester = testerMap[id];
          }
          if (!tester) return;
          const idToDelete =
            storedId ||
            ((tester.ids || []).find((i) => i === id || i.endsWith(`|${id}`)) ??
              id);

          await deleteJson(`${import.meta.env.API_BASE_URL}/tester/ids`, {
            uuid: tester.uuid,
            id: idToDelete,
          });
        }),
      );
      addToast({
        title: t("success"),
        description: t("selected-unassigned"),
        variant: "solid",
      });
      setSelectedUserIds({});
      await refreshTesterMap();
    } catch (err) {
      console.error(err);
      addToast({
        title: t("error"),
        description: t("error-removing-oauth-id"),
        variant: "solid",
      });
    }
  };

  const saveUserPermissions = async (userId: string) => {
    try {
      if (!token) throw new Error("No management token");
      const mgmtToken = token.access_token;
      const edits = editing[userId] || {};
      // Apply permission changes for admin, backup, user, read, write and search
      const permissionMappings: Record<string, string> = {
        read: import.meta.env.READ_PERMISSION,
        write: import.meta.env.WRITE_PERMISSION,
        admin: import.meta.env.ADMIN_PERMISSION,
        backup: import.meta.env.BACKUP_PERMISSION,
        search: import.meta.env.SEARCH_PERMISSION,
        auth0admin: import.meta.env.ADMIN_AUTH0_PERMISSION,
      };

      // For each mapping, check change requested
      for (const key of Object.keys(permissionMappings)) {
        if (edits.hasOwnProperty(key)) {
          const permName = permissionMappings[key];
          const userPerms = await getUserPermissions(mgmtToken, userId);
          const hasIt = (userPerms || []).some(
            (p: Auth0Permission) => p.permission_name === permName,
          );

          if (edits[key] && !hasIt) {
            await addPermissionToUser(mgmtToken, userId, permName);
          } else if (!edits[key] && hasIt) {
            await removePermissionFromUser(mgmtToken, userId, permName);
          }
        }
      }

      addToast({
        title: t("success"),
        description: t("user-updated-successfully"),
        variant: "solid",
        timeout: 5000,
      });
      setEditing((prev) => ({ ...prev, [userId]: {} }));
    } catch (err) {
      console.error(err);
      addToast({
        title: t("error"),
        description: t("error-updating-user"),
        variant: "solid",
        timeout: 5000,
      });
    }
  };

  const deleteUser = async (userId: string) => {
    // Prevent deleting the current logged-in user from the UI
    if (userId === currentUserId) {
      addToast({
        title: t("error"),
        description: t("cannot-delete-self"),
        variant: "solid",
      });

      return;
    }
    try {
      if (!token) throw new Error("No management token");
      const mgmtToken = token.access_token;
      // If the user is assigned to a tester, remove that mapping first
      const user =
        users.find((u) => u.user_id === userId) ??
        usersWithTester.find((u) => u.user_id === userId);

      if (user) {
        const { tester, storedId } = findAssignedTesterAndStoredId(
          user as Auth0User,
        );

        if (tester && storedId) {
          try {
            // Remove mapping in backend
            const resp = await deleteJson(
              `${import.meta.env.API_BASE_URL}/tester/ids`,
              { uuid: tester.uuid, id: storedId },
            );

            if (!(resp && resp.success)) {
              addToast({
                title: t("error"),
                description: t("error-removing-oauth-id"),
                variant: "solid",
                timeout: 5000,
              });

              return;
            }
          } catch (err) {
            console.error(
              "Failed to remove OAuth ID from tester before deleting user:",
              err,
            );
            addToast({
              title: t("error"),
              description: t("error-removing-oauth-id"),
              variant: "solid",
              timeout: 5000,
            });

            return;
          }
        }
      }
      await deleteAuth0User(mgmtToken, userId);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      // Refresh tester map to update UI immediately
      await refreshTesterMap();
      addToast({
        title: t("success"),
        description: t("user-deleted"),
        variant: "solid",
        timeout: 5000,
      });
    } catch (err) {
      console.error(err);
      addToast({
        title: t("error"),
        description: t("error-deleting-user"),
        variant: "solid",
        timeout: 5000,
      });
    }
  };

  const openUserModal = async (user: Auth0User) => {
    // open modal and fetch permissions for the user only
    if (!token) {
      addToast({
        title: t("error"),
        description: t("no-management-token"),
        variant: "solid",
        timeout: 5000,
      });

      return;
    }
    setSelectedUser(user);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const mgmtToken = token.access_token;
      const userPerms = await getUserPermissions(mgmtToken, user.user_id);
      const audience = import.meta.env.AUTH0_AUDIENCE || "";
      let permNames = (userPerms || [])
        .filter((p: any) => {
          if (!audience) return true;
          const rs = (p.resource_server_identifier || "") as string;

          // Try exact match or partial match to support localhost vs absolute URL differences
          return (
            rs === audience ||
            rs.includes(audience) ||
            audience.includes(rs) ||
            rs.endsWith(audience) ||
            audience.endsWith(rs)
          );
        })
        .map((p: Auth0Permission) => p.permission_name);

      // fallback: if nothing matched, use the whole list of permission names
      if (!permNames || permNames.length === 0) {
        permNames = (userPerms || []).map(
          (p: Auth0Permission) => p.permission_name,
        );
      }
      // Debug info removed for production readiness
      setEditing((prev) => ({
        ...prev,
        [user.user_id]: {
          read: permNames.includes(import.meta.env.READ_PERMISSION),
          write: permNames.includes(import.meta.env.WRITE_PERMISSION),
          admin: permNames.includes(import.meta.env.ADMIN_PERMISSION),
          backup: permNames.includes(import.meta.env.BACKUP_PERMISSION),
          search: permNames.includes(import.meta.env.SEARCH_PERMISSION),
          auth0admin: permNames.includes(
            import.meta.env.ADMIN_AUTH0_PERMISSION,
          ),
        },
      }));
    } catch (err) {
      console.error(err);
      addToast({
        title: t("error"),
        description: t("failed-loading-user-permissions"),
        variant: "solid",
        timeout: 5000,
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteUser) return;
    setDeletingUserId(confirmDeleteUser.user_id);
    try {
      await deleteUser(confirmDeleteUser.user_id);
      // If modal was open for this user, close it
      if (selectedUser?.user_id === confirmDeleteUser.user_id) {
        setModalOpen(false);
        setSelectedUser(null);
      }
    } catch (err) {
      // deleteUser already shows a toast; console any error
      console.error(err);
    } finally {
      setDeletingUserId(null);
      setConfirmDeleteOpen(false);
      setConfirmDeleteUser(null);
    }
  };

  return (
    <DefaultLayout>
      <div className="flex items-center justify-between">
        <h2>{t("users-and-permissions")}</h2>
        <Button onPress={() => setIsCreateModalOpen(true)}>
          {t("create-tester")}
        </Button>
      </div>
      {Object.keys(selectedUserIds).some((k) => selectedUserIds[k]) && (
        <div className="mb-4 p-2 bg-default-100 rounded flex gap-2 items-center">
          <div>{t("selected-count", { count: bulkSelectedIds().length })}</div>
          {bulkUnassignedIds().length > 0 && (
            <Button onPress={openAssignModalForSelected}>
              {t("assign-selected")}
            </Button>
          )}
          <Button color="danger" onPress={unassignSelected}>
            {t("unassign-selected")}
          </Button>
        </div>
      )}
      <p>{t("manage-api-users-desc")}</p>
      {/* Notifications are shown via HeroUI Toasts */}
      <Table aria-label={t("users-and-permissions")} className="my-4">
        <TableHeader>
          <TableColumn>
            <Checkbox
              isSelected={
                Object.keys(selectedUserIds).length > 0 &&
                Object.keys(selectedUserIds).every((k) => selectedUserIds[k])
              }
              onValueChange={(v) => {
                // select/unselect all (skip the current user)
                if (v) {
                  const map: Record<string, boolean> = {};

                  (usersWithTester.length ? usersWithTester : users).forEach(
                    (u) => {
                      if (u.user_id && u.user_id !== currentUserId)
                        map[u.user_id] = true;
                    },
                  );
                  setSelectedUserIds(map);
                } else {
                  setSelectedUserIds({});
                }
              }}
            />
          </TableColumn>
          <TableColumn>{t("user")}</TableColumn>
          <TableColumn>{t("tester")}</TableColumn>
          <TableColumn>{t("email")}</TableColumn>
          <TableColumn>{t("actions")}</TableColumn>
        </TableHeader>
        <TableBody
          emptyContent={t("no-data-available")}
          items={usersWithTester.length ? usersWithTester : users}
        >
          {(u) => {
            const assignedName = getAssignedTesterName(u);

            return (
              <TableRow key={u.user_id}>
                <TableCell>
                  <Checkbox
                    isSelected={!!selectedUserIds[u.user_id]}
                    onValueChange={() => toggleSelectUser(u.user_id)}
                  />
                </TableCell>
                <TableCell
                  className="cursor-pointer"
                  onClick={() => openUserModal(u)}
                >
                  {u.name || u.nickname || u.user_id}
                </TableCell>
                <TableCell>{assignedName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  {!assignedName && u.user_id && (
                    <Button
                      color="secondary"
                      onPress={() =>
                        u.user_id && openAssignModalForOne(u.user_id)
                      }
                    >
                      {t("assign")}
                    </Button>
                  )}
                  {assignedName && u.user_id && u.user_id !== currentUserId && (
                    <Button
                      color="warning"
                      onPress={() => unassignId(u.user_id)}
                    >
                      {t("unassign")}
                    </Button>
                  )}
                  {u.user_id !== currentUserId && (
                    <Button
                      className="ml-2"
                      color="danger"
                      disabled={deletingUserId === u.user_id}
                      isLoading={deletingUserId === u.user_id}
                      onPress={() => {
                        setConfirmDeleteUser(u);
                        setConfirmDeleteOpen(true);
                      }}
                    >
                      {t("delete")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          }}
        </TableBody>
      </Table>

      <AssignTesterModal
        isOpen={isAssignModalOpen}
        userIds={assignModalIds}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={async () => {
          await refreshTesterMap();
        }}
      />
      <CreateTesterModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={async () => {
          await refreshTesterMap();
        }}
      />

      <ConfirmDeleteModal
        description={t("confirm-delete-warning", {
          name: confirmDeleteUser?.name || confirmDeleteUser?.user_id,
        })}
        isOpen={confirmDeleteOpen}
        isProcessing={deletingUserId !== null}
        title={t("delete")}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => handleConfirmDelete()}
      />

      <ConfirmDeleteModal
        description={t("confirm-unassign-selected")}
        isOpen={confirmUnassignOpen}
        isProcessing={false}
        title={t("unassign-selected")}
        onClose={() => setConfirmUnassignOpen(false)}
        onConfirm={async () => {
          await doUnassignSelected(confirmUnassignIds);
          setConfirmUnassignIds([]);
          setConfirmUnassignOpen(false);
        }}
      />

      {modalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded p-6 w-11/12 max-w-2xl">
            <h3 className="text-lg font-bold mb-2">
              {t("permissions-for", {
                name: selectedUser.name || selectedUser.user_id,
              })}
            </h3>
            {modalLoading ? (
              <div>{t("loading")}</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2">
                  <Checkbox
                    isSelected={!!editing[selectedUser.user_id]?.read}
                    onValueChange={() =>
                      onTogglePermission(selectedUser.user_id, "read")
                    }
                  />
                  {t("permission-read")}
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    isSelected={!!editing[selectedUser.user_id]?.write}
                    onValueChange={() =>
                      onTogglePermission(selectedUser.user_id, "write")
                    }
                  />
                  {t("permission-write")}
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    isSelected={!!editing[selectedUser.user_id]?.search}
                    onValueChange={() =>
                      onTogglePermission(selectedUser.user_id, "search")
                    }
                  />
                  {t("permission-search")}
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    isSelected={!!editing[selectedUser.user_id]?.backup}
                    onValueChange={() =>
                      onTogglePermission(selectedUser.user_id, "backup")
                    }
                  />
                  {t("permission-backup")}
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    isSelected={!!editing[selectedUser.user_id]?.admin}
                    onValueChange={() =>
                      onTogglePermission(selectedUser.user_id, "admin")
                    }
                  />
                  {t("permission-admin")}
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    isSelected={!!editing[selectedUser.user_id]?.auth0admin}
                    onValueChange={() =>
                      onTogglePermission(selectedUser.user_id, "auth0admin")
                    }
                  />
                  {t("permission-auth0admin")}
                </label>
              </div>
            )}
            {/* Debug output removed */}
            <div className="mt-4 flex gap-2 justify-end">
              <Button
                onPress={async () => {
                  try {
                    await saveUserPermissions(selectedUser.user_id);
                    addToast({
                      title: t("success"),
                      description: t("saved"),
                      variant: "solid",
                      timeout: 5000,
                    });
                  } catch (err) {
                    console.error(err);
                    addToast({
                      title: t("error"),
                      description: t("error-saving-permissions"),
                      variant: "solid",
                      timeout: 5000,
                    });
                  } finally {
                    setModalOpen(false);
                  }
                }}
              >
                {t("save")}
              </Button>
              <Button
                color="danger"
                disabled={deletingUserId === selectedUser?.user_id}
                isLoading={deletingUserId === selectedUser?.user_id}
                onPress={() => {
                  setConfirmDeleteUser(selectedUser);
                  setConfirmDeleteOpen(true);
                }}
              >
                {t("delete")}
              </Button>
              <Button onPress={() => setModalOpen(false)}>{t("close")}</Button>
            </div>
          </div>
        </div>
      )}
    </DefaultLayout>
  );
}
