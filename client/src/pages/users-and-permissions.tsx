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
// import { Toast } from "@heroui/toast"; // Not using Toast API directly, using message state

export default function UsersAndPermissionsPage() {
    const { getAuth0ManagementToken, listAuth0Users, getUserPermissions, addPermissionToUser, removePermissionFromUser, deleteAuth0User } = useSecuredApi();
    const [token, setToken] = useState<Auth0ManagementTokenResponse | null>(null);
    const { t } = useTranslation();
    const [message, setMessage] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    // roles are not used yet because we work with direct permissions (not roles)
    const [editing, setEditing] = useState<Record<string, any>>({});
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
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

            setMessage('User updated successfully');
            setEditing((prev) => ({ ...prev, [userId]: {} }));
        } catch (err) {
            console.error(err);
            setMessage('Failed to update user');
        }
    };

    const deleteUser = async (userId: string) => {
        try {
            if (!token) throw new Error('No management token');
            const mgmtToken = token.access_token;
            await deleteAuth0User(mgmtToken, userId);
            setUsers((prev) => prev.filter((u) => u.user_id !== userId));
            setMessage('User deleted');
        } catch (err) {
            console.error(err);
            setMessage('Failed to delete user');
        }
    };

    const openUserModal = async (user: any) => {
        // open modal and fetch permissions for the user only
        if (!token) {
            setMessage('No management token');
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
            setMessage('Failed to load user permissions');
        } finally {
            setModalLoading(false);
        }
    };

    return (
        <DefaultLayout>
            <h2>{t("users-and-permissions") || 'Users and Permissions'}</h2>
            <p>Manage API users and map permissions to roles via Auth0 Management API.</p>
            {message && <div className="mb-3 text-sm text-default-600">{message}</div>}
            <Table aria-label="Users and Permissions" className="my-4">
                <TableHeader>
                    <TableColumn>User</TableColumn>
                    <TableColumn>Email</TableColumn>
                    <TableColumn>Action</TableColumn>
                </TableHeader>
                <TableBody items={users} emptyContent={t('no-data-available')}>
                    {(u) => (
                        <TableRow key={u.user_id}>
                            <TableCell className="cursor-pointer" onClick={() => openUserModal(u)}>{u.name || u.nickname || u.user_id}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                                <Button color="danger" onPress={() => deleteUser(u.user_id)}>Delete</Button>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {modalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded p-6 w-11/12 max-w-2xl">
                        <h3 className="text-lg font-bold mb-2">Permissions for {selectedUser.name || selectedUser.user_id}</h3>
                        {modalLoading ? (
                            <div>Loading...</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.read)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'read')} />
                                    Read
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.write)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'write')} />
                                    Write
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.search)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'search')} />
                                    Search
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.backup)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'backup')} />
                                    Backup
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.admin)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'admin')} />
                                    Admin
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox isSelected={!!(editing[selectedUser.user_id]?.auth0admin)} onValueChange={() => onTogglePermission(selectedUser.user_id, 'auth0admin')} />
                                    Auth0 Admin
                                </label>
                            </div>
                        )}
                        {/* Debug output removed */}
                        <div className="mt-4 flex gap-2 justify-end">
                            <Button onPress={async () => {
                                try {
                                    await saveUserPermissions(selectedUser.user_id);
                                    setMessage('Saved');
                                } catch (err) {
                                    console.error(err);
                                    setMessage('Error saving permissions');
                                } finally {
                                    setModalOpen(false);
                                }
                            }}>Save</Button>
                            <Button color="danger" onPress={async () => {
                                try {
                                    await deleteUser(selectedUser.user_id);
                                    setMessage('Deleted');
                                } catch (err) {
                                    console.error(err);
                                    setMessage('Error deleting user');
                                } finally {
                                    setModalOpen(false);
                                }
                            }}>Delete</Button>
                            <Button onPress={() => setModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </DefaultLayout>
    );
}