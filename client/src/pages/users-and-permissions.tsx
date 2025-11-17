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

import { useEffect, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { useSecuredApi } from "@/components/auth0";
import { Auth0ManagementTokenApiResponse, Auth0ManagementTokenResponse } from "@/types/data";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { addToast } from "@heroui/toast";
import ConfirmDeleteModal from "@/components/modals/confirm-delete-modal";
// import { Toast } from "@heroui/toast"; // Not using Toast API directly, using message state

export default function UsersAndPermissionsPage() {
    const { getAuth0ManagementToken, listAuth0Users, getUserPermissions, addPermissionToUser, removePermissionFromUser, deleteAuth0User } = useSecuredApi();
    const [token, setToken] = useState<Auth0ManagementTokenResponse | null>(null);
    const { t } = useTranslation();
    // replaced message state and inline alert by HeroUI toasts
    const [users, setUsers] = useState<any[]>([]);
    // roles are not used yet because we work with direct permissions (not roles)
    const [editing, setEditing] = useState<Record<string, any>>({});
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [confirmDeleteUser, setConfirmDeleteUser] = useState<any | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    useEffect(() => {
        // Fetch Auth0 Management API token for accessing Auth0 management endpoints
        getAuth0ManagementToken().then(async (auth0TokenResponse: Auth0ManagementTokenApiResponse) => {
            console.log("Token data:", auth0TokenResponse);
            setToken(auth0TokenResponse as Auth0ManagementTokenResponse); //TODO verify type correctness (it can be ErrorResponse)
            // After token is fetched, list roles and users
            if ((auth0TokenResponse as any)?.access_token) {
                const mgmtToken = (auth0TokenResponse as any).access_token;
                try {
                    const u = (await listAuth0Users(mgmtToken)) ?? [];
                    setUsers(u);
                } catch (err) {
                    console.error('Failed to fetch Auth0 roles or users', err);
                }
            }
        }).catch((error) => {
            console.error("Error fetching token data:", error);
        });

    }, []);
    const onTogglePermission = (userId: string, permissionName: string) => {
        const u = users.find((x) => x.user_id === userId);
        if (!u) return;
        setEditing((prev) => ({ ...prev, [userId]: { ...(prev[userId] || {}), [permissionName]: !(prev[userId]?.[permissionName] ?? false) } }));
    };

    const saveUserPermissions = async (userId: string) => {
        try {
            if (!token) throw new Error('No management token');
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
                    const hasIt = (userPerms || []).some((p: any) => p.permission_name === permName);
                    if (edits[key] && !hasIt) {
                        await addPermissionToUser(mgmtToken, userId, permName);
                    } else if (!edits[key] && hasIt) {
                        await removePermissionFromUser(mgmtToken, userId, permName);
                    }
                }
            }

            addToast({ title: t('success'), description: t('user-updated-successfully'), variant: 'solid', timeout: 5000 });
            setEditing((prev) => ({ ...prev, [userId]: {} }));
        } catch (err) {
            console.error(err);
            addToast({ title: t('error'), description: t('error-updating-user'), variant: 'solid', timeout: 5000 });
        }
    };

    const deleteUser = async (userId: string) => {
        try {
            if (!token) throw new Error('No management token');
            const mgmtToken = token.access_token;
            await deleteAuth0User(mgmtToken, userId);
            setUsers((prev) => prev.filter((u) => u.user_id !== userId));
            addToast({ title: t('success'), description: t('user-deleted'), variant: 'solid', timeout: 5000 });
        } catch (err) {
            console.error(err);
            addToast({ title: t('error'), description: t('error-deleting-user'), variant: 'solid', timeout: 5000 });
        }
    };

    const openUserModal = async (user: any) => {
        // open modal and fetch permissions for the user only
        if (!token) {
            addToast({ title: t('error'), description: t('no-management-token'), variant: 'solid', timeout: 5000 });
            return;
        }
        setSelectedUser(user);
        setModalOpen(true);
        setModalLoading(true);
        try {
            const mgmtToken = token.access_token;
            const userPerms = await getUserPermissions(mgmtToken, user.user_id);
            const audience = import.meta.env.AUTH0_AUDIENCE || '';
            let permNames = (userPerms || [])
                .filter((p: any) => {
                    if (!audience) return true;
                    const rs = (p.resource_server_identifier || '') as string;
                    // Try exact match or partial match to support localhost vs absolute URL differences
                    return rs === audience || rs.includes(audience) || audience.includes(rs) || rs.endsWith(audience) || audience.endsWith(rs);
                })
                .map((p: any) => p.permission_name);
            // fallback: if nothing matched, use the whole list of permission names
            if (!permNames || permNames.length === 0) {
                permNames = (userPerms || []).map((p: any) => p.permission_name);
            }
            // Debug info removed for production readiness
            setEditing((prev) => ({
                ...prev, [user.user_id]: {
                    read: permNames.includes(import.meta.env.READ_PERMISSION),
                    write: permNames.includes(import.meta.env.WRITE_PERMISSION),
                    admin: permNames.includes(import.meta.env.ADMIN_PERMISSION),
                    backup: permNames.includes(import.meta.env.BACKUP_PERMISSION),
                    search: permNames.includes(import.meta.env.SEARCH_PERMISSION),
                    auth0admin: permNames.includes(import.meta.env.ADMIN_AUTH0_PERMISSION),
                }
            }));
        } catch (err) {
            console.error(err);
            addToast({ title: t('error'), description: t('failed-loading-user-permissions'), variant: 'solid', timeout: 5000 });
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
            <h2>{t("users-and-permissions")}</h2>
            <p>{t('manage-api-users-desc')}</p>
            {/* Notifications are shown via HeroUI Toasts */}
            <Table aria-label={t('users-and-permissions')} className="my-4">
                <TableHeader>
                    <TableColumn>{t('user')}</TableColumn>
                    <TableColumn>{t('email')}</TableColumn>
                    <TableColumn>{t('actions')}</TableColumn>
                </TableHeader>
                <TableBody items={users} emptyContent={t('no-data-available')}>
                    {(u) => (
                        <TableRow key={u.user_id}>
                            <TableCell className="cursor-pointer" onClick={() => openUserModal(u)}>{u.name || u.nickname || u.user_id}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                                <Button color="danger" onPress={() => { setConfirmDeleteUser(u); setConfirmDeleteOpen(true); }} disabled={deletingUserId === u.user_id} isLoading={deletingUserId === u.user_id}>{t('delete')}</Button>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <ConfirmDeleteModal
                isOpen={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                title={t('delete')}
                description={t('confirm-delete-warning', { name: confirmDeleteUser?.name || confirmDeleteUser?.user_id })}
                onConfirm={() => handleConfirmDelete()}
                isProcessing={deletingUserId !== null}
            />

            {modalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded p-6 w-11/12 max-w-2xl">
                        <h3 className="text-lg font-bold mb-2">{t('permissions-for', { name: selectedUser.name || selectedUser.user_id })}</h3>
                        {modalLoading ? (
                            <div>{t('loading')}</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.read)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'read')} />
                                    {t('permission-read')}
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.write)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'write')} />
                                    {t('permission-write')}
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.search)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'search')} />
                                    {t('permission-search')}
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.backup)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'backup')} />
                                    {t('permission-backup')}
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.admin)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'admin')} />
                                    {t('permission-admin')}
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.auth0admin)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'auth0admin')} />
                                    {t('permission-auth0admin')}
                                </label>
                            </div>
                        )}
                        {/* Debug output removed */}
                        <div className="mt-4 flex gap-2 justify-end">
                            <Button onPress={async () => {
                                try {
                                    await saveUserPermissions(selectedUser.user_id);
                                    addToast({ title: t('success'), description: t('saved'), variant: 'solid', timeout: 5000 });
                                } catch (err) {
                                    console.error(err);
                                    addToast({ title: t('error'), description: t('error-saving-permissions'), variant: 'solid', timeout: 5000 });
                                } finally {
                                    setModalOpen(false);
                                }
                            }}>{t('save')}</Button>
                            <Button color="danger" onPress={() => { setConfirmDeleteUser(selectedUser); setConfirmDeleteOpen(true); }} disabled={deletingUserId === selectedUser?.user_id} isLoading={deletingUserId === selectedUser?.user_id}>{t('delete')}</Button>
                            <Button onPress={() => setModalOpen(false)}>{t('close')}</Button>
                        </div>
                    </div>
                </div>
            )}
        </DefaultLayout>
    );
}