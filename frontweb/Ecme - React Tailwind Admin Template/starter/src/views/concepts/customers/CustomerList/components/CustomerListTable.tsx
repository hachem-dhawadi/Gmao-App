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
import { TbPencil, TbEye, TbTrash, TbBuilding, TbBuildingOff, TbBuildingPlus } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import useSWR from 'swr'
import { useTranslation } from 'react-i18next'
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
    const { t } = useTranslation()
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
                role: u.is_superadmin ? t('members.modal.superadmin') : 'User',
                status: u.is_active ? t('members.status.active') : t('members.status.inactive'),
                statusClass: u.is_active
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-gray-100 text-gray-500',
                rows: [
                    { label: t('members.modal.locale'), value: u.locale || '-' },
                    { label: t('members.modal.lastLogin'), value: u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '-' },
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
            status: isActive ? t('members.status.active') : t('members.status.inactive'),
            statusClass: isActive
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-gray-100 text-gray-500',
            rows: [
                { label: t('members.modal.employeeCode'), value: m.employee_code || '-' },
                { label: t('members.modal.jobTitle'), value: m.job_title || '-' },
                { label: t('members.modal.roles'), value: m.roles?.map((r) => r.label).join(', ') || '-' },
                {
                    label: 'Sites',
                    value: m.sites && m.sites.length > 0
                        ? m.sites.map((s) => `${s.name} (${s.code})`).join(', ')
                        : m.site ? `${m.site.name} (${m.site.code})` : '-',
                },
            ],
        }
    }, [data, t])

    return (
        <div>
            {isLoading && (
                <div className="flex justify-center items-center py-10">
                    <span className="text-gray-400">{t('common.loading')}</span>
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
                            <p className="text-xs text-gray-400 uppercase">{t('members.modal.email')}</p>
                            <p className="text-sm font-medium break-all">{info.email}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase">{t('members.modal.phone')}</p>
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
                        <Button size="sm" onClick={onClose}>{t('members.modal.close')}</Button>
                        <Button size="sm" variant="solid" onClick={onEdit}>{t('members.modal.edit')}</Button>
                    </div>
                </div>
            )}
        </div>
    )
}

const statusColor: Record<string, string> = {
    active:  'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    blocked: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
}

const StatusBadge = ({ status }: { status: string }) => {
    const { t } = useTranslation()
    const cls = statusColor[status] || statusColor.blocked
    return <Tag className={`text-xs border-0 ${cls}`}>{t(`members.status.${status}`)}</Tag>
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

const ActionColumn = ({ onEdit, onViewDetail, onDelete, canEdit, canDelete }: ActionColumnProps) => {
    const { t } = useTranslation()
    return (
        <div className="flex items-center justify-end gap-3">
            {canEdit && (
                <Tooltip title={t('common.edit')}>
                    <div className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary" role="button" onClick={onEdit}>
                        <TbPencil />
                    </div>
                </Tooltip>
            )}
            <Tooltip title={t('common.view')}>
                <div className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary" role="button" onClick={onViewDetail}>
                    <TbEye />
                </div>
            </Tooltip>
            {canDelete && (
                <Tooltip title={t('common.delete')}>
                    <div className="text-xl cursor-pointer select-none text-gray-500 hover:text-red-500" role="button" onClick={onDelete}>
                        <TbTrash />
                    </div>
                </Tooltip>
            )}
        </div>
    )
}

const CustomerListTable = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
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
                <Notification type="success">{t('members.toast.deleted')}</Notification>,
                { placement: 'top-center' },
            )
            mutate()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? t('members.toast.deleteFailed')
            toast.push(
                <Notification type="danger">{msg}</Notification>,
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
                header: t('members.columns.name'),
                accessorKey: 'name',
                cell: (props) => <NameColumn row={props.row.original} />,
            },
            {
                header: t('members.columns.email'),
                accessorKey: 'email',
            },
            {
                header: t('members.columns.role'),
                accessorKey: 'role',
            },
            {
                header: t('members.columns.status'),
                accessorKey: 'status',
                cell: (props) => <StatusBadge status={props.row.original.status} />,
            },
            {
                header: t('members.columns.phone'),
                accessorKey: 'personalInfo.phoneNumber',
                cell: (props) => (
                    <span>{props.row.original.personalInfo.phoneNumber || '-'}</span>
                ),
            },
            ...(!isSuperadmin ? [{
                header: 'Sites',
                id: 'sites',
                cell: (props: any) => {
                    const sites: { id: number; name: string; code: string }[] = props.row.original.sites ?? []
                    if (sites.length === 0) {
                        return (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                <TbBuildingOff className="text-sm shrink-0" />
                                No site
                            </span>
                        )
                    }
                    if (sites.length === 1) {
                        return (
                            <div className="inline-flex items-center gap-1.5">
                                <TbBuilding className="text-indigo-400 text-sm shrink-0" />
                                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                                    {sites[0].name}
                                </span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 font-mono">
                                    {sites[0].code}
                                </span>
                            </div>
                        )
                    }
                    return (
                        <div className="inline-flex items-center gap-1.5">
                            <TbBuildingPlus className="text-indigo-400 text-sm shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                                {sites[0].name}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400">
                                +{sites.length - 1} more
                            </span>
                        </div>
                    )
                },
            }] : []),
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
        [canEdit, canDelete, isSuperadmin, t],
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
                title={t('members.delete.title')}
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>{t('members.delete.confirm', { name: deleteTarget?.name })}</p>
            </ConfirmDialog>

            <Dialog
                isOpen={detailId !== null}
                onClose={() => setDetailId(null)}
                onRequestClose={() => setDetailId(null)}
                width={480}
            >
                <h5 className="mb-4">{t('members.pageTitle')}</h5>
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
