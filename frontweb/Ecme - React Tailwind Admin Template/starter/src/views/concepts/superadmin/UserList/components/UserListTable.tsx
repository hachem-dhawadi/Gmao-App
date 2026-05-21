import { useMemo, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import useUserList from '../hooks/useUserList'
import cloneDeep from 'lodash/cloneDeep'
import {
    apiDeleteSuperadminUser,
    apiUpdateSuperadminUser,
} from '@/services/CompaniesService'
import { TbPencil, TbTrash, TbUser, TbShield, TbMail, TbPhone, TbLock } from 'react-icons/tb'
import type { OnSortParam, ColumnDef } from '@/components/shared/DataTable'
import type { Customer } from '../types'
import type { TableQueries } from '@/@types/common'

const statusColor: Record<string, string> = {
    active:   'bg-emerald-200 dark:bg-emerald-200 text-gray-900 dark:text-gray-900',
    inactive: 'bg-red-200 dark:bg-red-200 text-gray-900 dark:text-gray-900',
}

const NameColumn = ({ row }: { row: Customer }) => (
    <div className="flex items-center">
        <Avatar size={40} shape="circle" src={row.img || undefined} icon={!row.img ? <TbUser /> : undefined} />
        <div className="ml-2 rtl:mr-2">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{row.name}</span>
            {row.personalInfo.phoneNumber && (
                <p className="text-xs text-gray-400">{row.personalInfo.phoneNumber}</p>
            )}
        </div>
    </div>
)

// ── Section title helper ──────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{children}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
    </div>
)

// ── Inline edit dialog ────────────────────────────────────────────────

type EditDialogProps = {
    user: Customer | null
    onClose: () => void
    onSaved: () => void
}

const EditDialog = ({ user, onClose, onSaved }: EditDialogProps) => {
    const [name, setName]                       = useState(user?.name ?? '')
    const [email, setEmail]                     = useState(user?.email ?? '')
    const [phone, setPhone]                     = useState(user?.personalInfo.phoneNumber ?? '')
    const [password, setPassword]               = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [isActive, setIsActive]               = useState(user?.status === 'active')
    const [isSuperadmin, setIsSuperadmin]       = useState(user?.isSuperadmin ?? false)
    const [loading, setLoading]                 = useState(false)

    const handleSave = async () => {
        if (!user) return
        if (password && password !== passwordConfirm) {
            toast.push(
                <Notification type="warning">Passwords do not match.</Notification>,
                { placement: 'top-center' },
            )
            return
        }
        setLoading(true)
        try {
            const payload: Parameters<typeof apiUpdateSuperadminUser>[1] = {
                name,
                email,
                phone: phone || null,
                is_active: isActive,
                is_superadmin: isSuperadmin,
            }
            if (password) {
                payload.password = password
                payload.password_confirmation = passwordConfirm
            }
            await apiUpdateSuperadminUser(user.id, payload)
            toast.push(
                <Notification type="success">User updated successfully.</Notification>,
                { placement: 'top-center' },
            )
            onSaved()
            onClose()
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update user.'
            toast.push(
                <Notification type="danger">{msg}</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog isOpen={!!user} onClose={onClose} onRequestClose={onClose} width={560}>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl">
                    <TbUser />
                </div>
                <div>
                    <h5 className="font-bold">Edit User</h5>
                    <p className="text-sm text-gray-400">{user?.email}</p>
                </div>
            </div>

            <div className="flex flex-col gap-5">
                {/* Basic Info */}
                <div>
                    <SectionTitle>Account Info</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <Input
                                prefix={<TbUser className="text-gray-400" />}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <Input
                                prefix={<TbMail className="text-gray-400" />}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">
                                Phone <span className="text-gray-400 text-xs font-normal">(optional)</span>
                            </label>
                            <Input
                                prefix={<TbPhone className="text-gray-400" />}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 234 567 8900"
                            />
                        </div>
                    </div>
                </div>

                {/* Password */}
                <div>
                    <SectionTitle>Change Password</SectionTitle>
                    <p className="text-xs text-gray-400 mb-3">Leave empty to keep the current password.</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">New Password</label>
                            <Input
                                type="password"
                                prefix={<TbLock className="text-gray-400" />}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 8 chars"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Confirm</label>
                            <Input
                                type="password"
                                prefix={<TbLock className="text-gray-400" />}
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                placeholder="Repeat password"
                            />
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div>
                    <SectionTitle>Permissions</SectionTitle>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                        <div className="flex items-center justify-between px-4 py-3">
                            <div>
                                <p className="text-sm font-medium">Active account</p>
                                <p className="text-xs text-gray-400">User can log in to the platform</p>
                            </div>
                            <Switcher checked={isActive} onChange={(val) => setIsActive(val)} />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                                <TbShield className="text-purple-500" />
                                <div>
                                    <p className="text-sm font-medium">Superadmin</p>
                                    <p className="text-xs text-gray-400">Full platform access</p>
                                </div>
                            </div>
                            <Switcher checked={isSuperadmin} onChange={(val) => setIsSuperadmin(val)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" variant="solid" loading={loading} onClick={handleSave}>
                    Save Changes
                </Button>
            </div>
        </Dialog>
    )
}

// ── Action column ─────────────────────────────────────────────────────

const ActionColumn = ({
    onEdit,
    onDelete,
}: { onEdit: () => void; onDelete: () => void }) => (
    <div className="flex items-center gap-3">
        <Tooltip title="Edit">
            <div className="text-xl cursor-pointer select-none font-semibold" role="button" onClick={onEdit}>
                <TbPencil />
            </div>
        </Tooltip>
        <Tooltip title="Delete">
            <div className="text-xl cursor-pointer select-none font-semibold text-red-500 hover:text-red-600" role="button" onClick={onDelete}>
                <TbTrash />
            </div>
        </Tooltip>
    </div>
)

// ── Table ──────────────────────────────────────────────────────────────

const UserListTable = () => {
    const {
        customerList,
        customerListTotal,
        tableData,
        isLoading,
        setTableData,
        setSelectAllCustomer,
        setSelectedCustomer,
        selectedCustomer,
        mutate,
    } = useUserList()

    const [editUser, setEditUser]             = useState<Customer | null>(null)
    const [deleteTarget, setDeleteTarget]     = useState<Customer | null>(null)
    const [deleteLoading, setDeleteLoading]   = useState(false)

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setDeleteLoading(true)
        try {
            await apiDeleteSuperadminUser(deleteTarget.id)
            toast.push(
                <Notification type="success" title="User deleted" />,
                { placement: 'top-center' },
            )
            setDeleteTarget(null)
            await mutate()
        } catch {
            toast.push(
                <Notification type="danger" title="Failed to delete user" />,
                { placement: 'top-center' },
            )
        } finally {
            setDeleteLoading(false)
        }
    }

    const columns: ColumnDef<Customer>[] = useMemo(
        () => [
            {
                header: 'Name',
                accessorKey: 'name',
                cell: (props) => <NameColumn row={props.row.original} />,
            },
            {
                header: 'Email',
                accessorKey: 'email',
            },
            {
                header: 'Role',
                accessorKey: 'role',
                cell: (props) => {
                    const row = props.row.original
                    return row.isSuperadmin ? (
                        <Tag className="bg-purple-200 dark:bg-purple-200 text-gray-900 dark:text-gray-900">
                            <span className="flex items-center gap-1"><TbShield /><span>Superadmin</span></span>
                        </Tag>
                    ) : (
                        <Tag className="bg-sky-200 dark:bg-sky-200 text-gray-900 dark:text-gray-900">
                            <span className="flex items-center gap-1"><TbUser /><span>User</span></span>
                        </Tag>
                    )
                },
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: (props) => (
                    <Tag className={statusColor[props.row.original.status] ?? statusColor.inactive}>
                        <span className="capitalize">{props.row.original.status}</span>
                    </Tag>
                ),
            },
            {
                header: 'Phone',
                accessorKey: 'personalInfo.phoneNumber',
                cell: (props) => <span>{props.row.original.personalInfo.phoneNumber || '—'}</span>,
            },
            {
                header: 'Companies',
                accessorKey: 'membersCount',
                cell: (props) => <span>{props.row.original.membersCount}</span>,
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn
                        onEdit={() => setEditUser(props.row.original)}
                        onDelete={() => setDeleteTarget(props.row.original)}
                    />
                ),
            },
        ],
        [],
    )

    const handleSetTableData = (data: TableQueries) => {
        setTableData(data)
        if (selectedCustomer.length > 0) setSelectAllCustomer([])
    }

    const handlePaginationChange = (page: number) => {
        const d = cloneDeep(tableData)
        d.pageIndex = page
        handleSetTableData(d)
    }

    const handleSelectChange = (value: number) => {
        const d = cloneDeep(tableData)
        d.pageSize = Number(value)
        d.pageIndex = 1
        handleSetTableData(d)
    }

    const handleSort = (sort: OnSortParam) => {
        const d = cloneDeep(tableData)
        d.sort = sort
        handleSetTableData(d)
    }

    return (
        <>
            <DataTable
                selectable
                columns={columns}
                data={customerList}
                noData={!isLoading && customerList.length === 0}
                skeletonAvatarColumns={[0]}
                skeletonAvatarProps={{ width: 28, height: 28 }}
                loading={isLoading}
                pagingData={{
                    total: customerListTotal,
                    pageIndex: tableData.pageIndex as number,
                    pageSize: tableData.pageSize as number,
                }}
                checkboxChecked={(row) =>
                    selectedCustomer.some((s) => s.id === row.id)
                }
                onPaginationChange={handlePaginationChange}
                onSelectChange={handleSelectChange}
                onSort={handleSort}
                onCheckBoxChange={(checked, row) => setSelectedCustomer(checked, row)}
                onIndeterminateCheckBoxChange={(checked, rows) => {
                    if (checked) setSelectAllCustomer(rows.map((r) => r.original))
                    else setSelectAllCustomer([])
                }}
            />

            <EditDialog
                key={editUser?.id ?? 'none'}
                user={editUser}
                onClose={() => setEditUser(null)}
                onSaved={() => mutate()}
            />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Delete user"
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
                confirmButtonProps={{ loading: deleteLoading }}
            >
                <p>
                    Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
                    This action cannot be undone.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default UserListTable
