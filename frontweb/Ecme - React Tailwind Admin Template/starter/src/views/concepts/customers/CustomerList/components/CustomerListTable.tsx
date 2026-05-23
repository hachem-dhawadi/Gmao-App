import { useMemo, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useCustomerList from '../hooks/useCustomerList'
import { useNavigate } from 'react-router-dom'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbEye, TbTrash } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import useSWR from 'swr'
import {
    apiDeleteSuperadminUserById,
    apiDeleteCompanyMemberById,
    apiGetCompanyMemberById,
    apiGetSuperadminUserById,
    type CompanyMemberResponse,
    type SuperadminUserResponse,
} from '@/services/CustomersService'
import type { OnSortParam, ColumnDef, Row } from '@/components/shared/DataTable'
import type { Customer } from '../types'
import type { TableQueries } from '@/@types/common'

type MemberDetailModalProps = {
    id: string
    isSuperadmin: boolean
    onClose: () => void
    onEdit: () => void
}

const MemberDetailModal = ({ id, isSuperadmin, onClose, onEdit }: MemberDetailModalProps) => {
    const { data, isLoading } = useSWR(
        id ? ['/customers/modal', id, isSuperadmin] : null,
        async () => {
            if (isSuperadmin) {
                const res = await apiGetSuperadminUserById<SuperadminUserResponse>(id)
                return { mode: 'superadmin' as const, user: res.data.user }
            }
            const res = await apiGetCompanyMemberById<CompanyMemberResponse>(id)
            return { mode: 'member' as const, member: res.data.member }
        },
        { revalidateOnFocus: false },
    )

    const info = useMemo(() => {
        if (!data) return null
        if (data.mode === 'superadmin') {
            const u = data.user
            return {
                name: u.name || '-',
                avatar: u.avatar_url || u.avatar_path || '',
                email: u.email || '-',
                phone: u.phone || '-',
                role: u.is_superadmin ? 'Superadmin' : 'User',
                status: u.is_active ? 'Active' : 'Inactive',
                statusClass: u.is_active
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-gray-100 text-gray-500',
                rows: [
                    { label: 'Locale', value: u.locale || '-' },
                    { label: 'Last Login', value: u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '-' },
                ],
            }
        }
        const m = data.member
        const isActive = (m.status || '').toLowerCase() === 'active'
        return {
            name: m.user?.name || '-',
            avatar: m.user?.avatar_url || m.user?.avatar_path || '',
            email: m.user?.email || '-',
            phone: m.user?.phone || '-',
            role: m.roles?.[0]?.label || m.job_title || 'Member',
            status: isActive ? 'Active' : 'Inactive',
            statusClass: isActive
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-gray-100 text-gray-500',
            rows: [
                { label: 'Employee Code', value: m.employee_code || '-' },
                { label: 'Job Title', value: m.job_title || '-' },
                { label: 'Roles', value: m.roles?.map((r) => r.label).join(', ') || '-' },
            ],
        }
    }, [data])

    return (
        <div>
            {isLoading && (
                <div className="flex justify-center items-center py-10">
                    <span className="text-gray-400">Loading…</span>
                </div>
            )}
            {!isLoading && info && (
                <div className="flex flex-col items-center gap-4">
                    <Avatar size={80} shape="circle" src={info.avatar} />
                    <div className="text-center">
                        <h5 className="font-semibold">{info.name}</h5>
                        <p className="text-sm text-gray-500">{info.role}</p>
                    </div>
                    <Tag className={`text-xs border-0 ${info.statusClass}`}>{info.status}</Tag>
                    <div className="w-full grid grid-cols-2 gap-3 mt-2">
                        <div>
                            <p className="text-xs text-gray-400 uppercase">Email</p>
                            <p className="text-sm font-medium break-all">{info.email}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase">Phone</p>
                            <p className="text-sm font-medium">{info.phone}</p>
                        </div>
                        {info.rows.map((r) => (
                            <div key={r.label}>
                                <p className="text-xs text-gray-400 uppercase">{r.label}</p>
                                <p className="text-sm font-medium">{r.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-2 w-full justify-end">
                        <Button size="sm" onClick={onClose}>Close</Button>
                        <Button size="sm" variant="solid" onClick={onEdit}>Edit</Button>
                    </div>
                </div>
            )}
        </div>
    )
}

const statusConfig: Record<string, { label: string; className: string }> = {
    active: {
        label: 'Active',
        className: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    },
    blocked: {
        label: 'Inactive',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    },
}

const NameColumn = ({ row }: { row: Customer }) => (
    <div className="flex items-center">
        <Avatar size={40} shape="circle" src={row.img} />
        <span className="ml-2 rtl:mr-2 font-semibold text-gray-900 dark:text-gray-100">
            {row.name}
        </span>
    </div>
)

type ActionColumnProps = {
    onEdit: () => void
    onViewDetail: () => void
    onDelete: () => void
    canEdit: boolean
    canDelete: boolean
}

const ActionColumn = ({ onEdit, onViewDetail, onDelete, canEdit, canDelete }: ActionColumnProps) => (
    <div className="flex items-center justify-end gap-3">
        {canEdit && (
            <Tooltip title="Edit">
                <div className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary" role="button" onClick={onEdit}>
                    <TbPencil />
                </div>
            </Tooltip>
        )}
        <Tooltip title="View">
            <div className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary" role="button" onClick={onViewDetail}>
                <TbEye />
            </div>
        </Tooltip>
        {canDelete && (
            <Tooltip title="Delete">
                <div className="text-xl cursor-pointer select-none text-gray-500 hover:text-red-500" role="button" onClick={onDelete}>
                    <TbTrash />
                </div>
            </Tooltip>
        )}
    </div>
)

const CustomerListTable = () => {
    const navigate = useNavigate()
    const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [detailId, setDetailId] = useState<string | null>(null)

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
    } = useCustomerList()

    const isSuperadmin = useSessionUser((s) => s.user.isSuperadmin)
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, ['members.update', 'admin', 'hr'])
    const canDelete = useAuthority(userAuthority, ['members.delete', 'admin'])

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            if (isSuperadmin) {
                await apiDeleteSuperadminUserById(deleteTarget.id)
            } else {
                await apiDeleteCompanyMemberById(deleteTarget.id)
            }
            toast.push(
                <Notification type="success">Member deleted.</Notification>,
                { placement: 'top-center' },
            )
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">Failed to delete member.</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleting(false)
            setDeleteTarget(null)
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
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: (props) => {
                    const cfg = statusConfig[props.row.original.status] || statusConfig.blocked
                    return (
                        <Tag className={`text-xs border-0 ${cfg.className}`}>
                            {cfg.label}
                        </Tag>
                    )
                },
            },
            {
                header: 'Phone',
                accessorKey: 'personalInfo.phoneNumber',
                cell: (props) => (
                    <span>{props.row.original.personalInfo.phoneNumber || '-'}</span>
                ),
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn
                        onEdit={() => navigate(`/concepts/customers/customer-edit/${props.row.original.id}`)}
                        onViewDetail={() => setDetailId(props.row.original.id)}
                        onDelete={() => setDeleteTarget(props.row.original)}
                        canEdit={canEdit}
                        canDelete={canDelete}
                    />
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [canEdit, canDelete],
    )

    const handleSetTableData = (data: TableQueries) => {
        setTableData(data)
        if (selectedCustomer.length > 0) setSelectAllCustomer([])
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
                onPaginationChange={(page) => {
                    const d = cloneDeep(tableData); d.pageIndex = page; handleSetTableData(d)
                }}
                onSelectChange={(value) => {
                    const d = cloneDeep(tableData); d.pageSize = Number(value); d.pageIndex = 1; handleSetTableData(d)
                }}
                onSort={(sort: OnSortParam) => {
                    const d = cloneDeep(tableData); d.sort = sort; handleSetTableData(d)
                }}
                onCheckBoxChange={(checked, row) => setSelectedCustomer(checked, row)}
                onIndeterminateCheckBoxChange={(checked, rows: Row<Customer>[]) => {
                    if (checked) setSelectAllCustomer(rows.map((r) => r.original))
                    else setSelectAllCustomer([])
                }}
            />

            <ConfirmDialog
                isOpen={deleteTarget !== null}
                type="danger"
                title="Delete Member"
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
            </ConfirmDialog>

            <Dialog
                isOpen={detailId !== null}
                onClose={() => setDetailId(null)}
                onRequestClose={() => setDetailId(null)}
                width={480}
            >
                <h5 className="mb-4">Member Details</h5>
                {detailId && (
                    <MemberDetailModal
                        id={detailId}
                        isSuperadmin={Boolean(isSuperadmin)}
                        onClose={() => setDetailId(null)}
                        onEdit={() => {
                            setDetailId(null)
                            navigate(`/concepts/customers/customer-edit/${detailId}`)
                        }}
                    />
                )}
            </Dialog>
        </>
    )
}

export default CustomerListTable
