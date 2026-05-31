import { useMemo, useState } from 'react'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import Tag from '@/components/ui/Tag'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useWorkOrderList from '../hooks/useWorkOrderList'
import { useNavigate } from 'react-router-dom'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbEye, TbTrash, TbArchive, TbArchiveOff } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { apiDeleteWorkOrder, apiArchiveWorkOrder, apiUnarchiveWorkOrder } from '@/services/WorkOrdersService'
import { useTranslation } from 'react-i18next'
import type { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable'
import type { WorkOrder } from '../types'
import type { TableQueries } from '@/@types/common'

const statusColor: Record<WorkOrder['status'], string> = {
    open:        'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    in_progress: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    on_hold:     'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    completed:   'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    cancelled:   'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
}

const priorityColor: Record<WorkOrder['priority'], string> = {
    low:      'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    medium:   'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    high:     'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    critical: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
}

const CodeBadge = ({ code }: { code: string }) => (
    <Tag className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-mono text-xs border-0">
        {code}
    </Tag>
)

const StatusBadge = ({ status }: { status: WorkOrder['status'] }) => {
    const { t } = useTranslation()
    return <Tag className={`text-xs ${statusColor[status]}`}>{t(`wo.status.${status}`)}</Tag>
}

const PriorityBadge = ({ priority }: { priority: WorkOrder['priority'] }) => {
    const { t } = useTranslation()
    return <Tag className={`text-xs ${priorityColor[priority]}`}>{t(`wo.priority.${priority}`)}</Tag>
}

type ActionColumnProps = {
    id: number
    canEdit: boolean
    canDelete: boolean
    canArchive: boolean
    isArchived: boolean
    onDelete: (id: number) => void
    onArchive: (id: number, isArchived: boolean) => void
}

const ActionColumn = ({ id, canEdit, canDelete, canArchive, isArchived, onDelete, onArchive }: ActionColumnProps) => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    return (
        <div className="flex items-center justify-end gap-3">
            {canEdit && !isArchived && (
                <Tooltip title={t('common.edit')}>
                    <div
                        className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                        role="button"
                        onClick={() => navigate(`/concepts/work-orders/work-order-edit/${id}`)}
                    >
                        <TbPencil />
                    </div>
                </Tooltip>
            )}
            <Tooltip title={t('common.view')}>
                <div
                    className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                    role="button"
                    onClick={() => navigate(`/concepts/work-orders/work-order-details/${id}`)}
                >
                    <TbEye />
                </div>
            </Tooltip>
            {canArchive && (
                <Tooltip title={isArchived ? t('wo.details.unarchive') : t('wo.details.archive')}>
                    <div
                        className={`text-xl cursor-pointer select-none ${isArchived ? 'text-amber-500 hover:text-amber-600' : 'text-gray-500 hover:text-amber-500'}`}
                        role="button"
                        onClick={() => onArchive(id, isArchived)}
                    >
                        {isArchived ? <TbArchiveOff /> : <TbArchive />}
                    </div>
                </Tooltip>
            )}
            {canDelete && (
                <Tooltip title={t('common.delete')}>
                    <div
                        className="text-xl cursor-pointer select-none text-gray-500 hover:text-red-500"
                        role="button"
                        onClick={() => onDelete(id)}
                    >
                        <TbTrash />
                    </div>
                </Tooltip>
            )}
        </div>
    )
}

const WorkOrderListTable = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
    const [deleting, setDeleting] = useState(false)

    const {
        workOrderList,
        workOrderListTotal,
        tableData,
        isLoading,
        setTableData,
        selectedWorkOrder,
        setSelectedWorkOrder,
        setSelectAllWorkOrder,
        mutate,
    } = useWorkOrderList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit    = useAuthority(userAuthority, ['work_orders.write', 'admin', 'manager'])
    const canDelete  = useAuthority(userAuthority, ['work_orders.delete', 'admin'])
    const canArchive = useAuthority(userAuthority, ['admin', 'manager'])

    const handleArchive = async (id: number, isArchived: boolean) => {
        try {
            if (isArchived) {
                await apiUnarchiveWorkOrder(id)
                toast.push(
                    <Notification type="success">{t('wo.toast.unarchived')}</Notification>,
                    { placement: 'top-center' },
                )
            } else {
                await apiArchiveWorkOrder(id)
                toast.push(
                    <Notification type="success">{t('wo.toast.archived')}</Notification>,
                    { placement: 'top-center' },
                )
            }
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">{t('wo.toast.archiveFailed')}</Notification>,
                { placement: 'top-center' },
            )
        }
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return
        setDeleting(true)
        try {
            await apiDeleteWorkOrder(deleteTargetId)
            toast.push(
                <Notification type="success">{t('wo.toast.deleted')}</Notification>,
                { placement: 'top-center' },
            )
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">{t('wo.toast.deleteFailed')}</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleting(false)
            setDeleteTargetId(null)
        }
    }

    const columns: ColumnDef<WorkOrder>[] = useMemo(
        () => [
            {
                header: t('wo.columns.title'),
                accessorKey: 'title',
                cell: (props) => {
                    const wo = props.row.original
                    return (
                        <div className="flex items-center gap-2">
                            <span
                                className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary"
                                onClick={() => navigate(`/concepts/work-orders/work-order-details/${wo.id}`)}
                            >
                                {wo.title}
                            </span>
                            {wo.archived_at && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                    <TbArchive className="text-xs" />
                                    {t('wo.archived')}
                                </span>
                            )}
                        </div>
                    )
                },
            },
            {
                header: t('wo.columns.code'),
                accessorKey: 'code',
                cell: (props) => <CodeBadge code={props.row.original.code} />,
            },
            {
                header: t('wo.columns.status'),
                accessorKey: 'status',
                cell: (props) => <StatusBadge status={props.row.original.status} />,
            },
            {
                header: t('wo.columns.priority'),
                accessorKey: 'priority',
                cell: (props) => <PriorityBadge priority={props.row.original.priority} />,
            },
            {
                header: t('wo.columns.asset'),
                accessorKey: 'asset',
                cell: (props) =>
                    props.row.original.asset ? (
                        <span className="text-gray-600 dark:text-gray-400 text-sm">
                            {props.row.original.asset.name}
                        </span>
                    ) : (
                        <span className="text-gray-400">—</span>
                    ),
            },
            {
                header: t('wo.columns.due'),
                accessorKey: 'due_at',
                cell: (props) => {
                    const due    = props.row.original.due_at
                    const status = props.row.original.status
                    if (!due) return <span className="text-gray-400">—</span>
                    const date      = new Date(due)
                    const now       = new Date()
                    const msLeft    = date.getTime() - now.getTime()
                    const hoursLeft = msLeft / (1000 * 60 * 60)
                    const isActive  = status !== 'completed' && status !== 'cancelled'
                    const isOverdue = isActive && date < now
                    const isDueSoon = isActive && !isOverdue && hoursLeft <= 48
                    return (
                        <div className="flex flex-col gap-1">
                            <span className={`text-sm ${isOverdue ? 'text-red-500 font-semibold' : isDueSoon ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                                {date.toLocaleDateString()}
                            </span>
                            {isDueSoon && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 w-fit">
                                    ⏰ {t('wo.dueSoon', { hours: Math.ceil(hoursLeft) })}
                                </span>
                            )}
                            {isOverdue && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 w-fit">
                                    {t('wo.overdue')}
                                </span>
                            )}
                        </div>
                    )
                },
            },
            {
                header: t('wo.columns.assigned'),
                accessorKey: 'assigned_members',
                cell: (props) => {
                    const members = props.row.original.assigned_members
                    if (!members || members.length === 0)
                        return <span className="text-gray-400">—</span>
                    return (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {members.map((m) => m.name).join(', ')}
                        </span>
                    )
                },
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn
                        id={props.row.original.id}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        canArchive={canArchive}
                        isArchived={Boolean(props.row.original.archived_at)}
                        onDelete={setDeleteTargetId}
                        onArchive={handleArchive}
                    />
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [canEdit, canDelete, canArchive, t],
    )

    const handleSetTableData = (data: TableQueries) => {
        setTableData(data)
        if (selectedWorkOrder.length > 0) setSelectAllWorkOrder([])
    }

    return (
        <>
            <DataTable
                selectable
                columns={columns}
                data={workOrderList}
                noData={!isLoading && workOrderList.length === 0}
                loading={isLoading}
                pagingData={{
                    total: workOrderListTotal,
                    pageIndex: tableData.pageIndex as number,
                    pageSize: tableData.pageSize as number,
                }}
                checkboxChecked={(row) => selectedWorkOrder.some((w) => w.id === row.id)}
                onPaginationChange={(page) => {
                    const next = cloneDeep(tableData)
                    next.pageIndex = page
                    handleSetTableData(next)
                }}
                onSelectChange={(value) => {
                    const next = cloneDeep(tableData)
                    next.pageSize = Number(value)
                    next.pageIndex = 1
                    handleSetTableData(next)
                }}
                onSort={(sort: OnSortParam) => {
                    const next = cloneDeep(tableData)
                    next.sort = sort
                    handleSetTableData(next)
                }}
                onCheckBoxChange={handleRowSelect}
                onIndeterminateCheckBoxChange={handleAllRowSelect}
            />

            <ConfirmDialog
                isOpen={deleteTargetId !== null}
                type="danger"
                title={t('wo.delete.title')}
                onClose={() => setDeleteTargetId(null)}
                onRequestClose={() => setDeleteTargetId(null)}
                onCancel={() => setDeleteTargetId(null)}
                onConfirm={handleDeleteConfirm}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>{t('wo.delete.confirm')}</p>
            </ConfirmDialog>
        </>
    )

    function handleRowSelect(checked: boolean, row: WorkOrder) {
        setSelectedWorkOrder(checked, row)
    }

    function handleAllRowSelect(checked: boolean, rows: Row<WorkOrder>[]) {
        if (checked) {
            setSelectAllWorkOrder(rows.map((r) => r.original))
        } else {
            setSelectAllWorkOrder([])
        }
    }
}

export default WorkOrderListTable
