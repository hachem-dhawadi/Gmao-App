import { useMemo, useState } from 'react'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import Tag from '@/components/ui/Tag'
import Avatar from '@/components/ui/Avatar'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import usePmPlanList from '../hooks/usePmPlanList'
import { useNavigate } from 'react-router-dom'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbTrash, TbUserCircle, TbUsers } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { apiDeletePmPlan } from '@/services/PmService'
import { useTranslation } from 'react-i18next'
import type { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable'
import type { PmPlan } from '@/services/PmService'
import type { TableQueries } from '@/@types/common'

const statusColor: Record<PmPlan['status'], string> = {
    active:   'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    draft:    'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
}

const priorityColor: Record<PmPlan['priority'], string> = {
    low:      'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    medium:   'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    high:     'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    critical: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
}

const StatusBadge = ({ status }: { status: PmPlan['status'] }) => {
    const { t } = useTranslation()
    return <Tag className={`text-xs ${statusColor[status]}`}>{t(`pm.status.${status}`)}</Tag>
}

const PriorityBadge = ({ priority }: { priority: PmPlan['priority'] }) => {
    const { t } = useTranslation()
    return <Tag className={`text-xs ${priorityColor[priority]}`}>{t(`pm.priority.${priority}`)}</Tag>
}

const NameCell = ({ plan }: { plan: PmPlan }) => {
    const navigate = useNavigate()
    return (
        <div
            className="cursor-pointer hover:text-primary"
            onClick={() => navigate(`/concepts/pm/pm-details/${plan.id}`)}
        >
            <div className="font-semibold">{plan.name}</div>
            <div className="text-xs font-mono text-purple-500">{plan.code}</div>
        </div>
    )
}

type ActionColumnProps = {
    id: number
    canEdit: boolean
    canDelete: boolean
    onDelete: (id: number) => void
}

const ActionColumn = ({ id, canEdit, canDelete, onDelete }: ActionColumnProps) => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    return (
        <div className="flex items-center justify-end gap-3">
            {canEdit && (
                <Tooltip title={t('common.edit')}>
                    <div
                        className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                        role="button"
                        onClick={() => navigate(`/concepts/pm/pm-edit/${id}`)}
                    >
                        <TbPencil />
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

const PmPlanListTable = () => {
    const { t } = useTranslation()
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
    const [deleting, setDeleting] = useState(false)

    const {
        pmPlanList,
        pmPlanListTotal,
        tableData,
        isLoading,
        setTableData,
        selectedPmPlans,
        setSelectedPmPlan,
        setSelectAllPmPlan,
        mutate,
    } = usePmPlanList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, ['pm_plans.write', 'admin', 'manager'])
    const canDelete = useAuthority(userAuthority, ['pm_plans.delete', 'admin'])

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return
        setDeleting(true)
        try {
            await apiDeletePmPlan(deleteTargetId)
            toast.push(
                <Notification type="success">{t('pm.toast.deleted')}</Notification>,
                { placement: 'top-center' },
            )
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">{t('pm.toast.deleteFailed')}</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleting(false)
            setDeleteTargetId(null)
        }
    }

    const columns: ColumnDef<PmPlan>[] = useMemo(
        () => [
            {
                header: t('pm.columns.name'),
                accessorKey: 'name',
                cell: (props) => <NameCell plan={props.row.original} />,
            },
            {
                header: t('pm.columns.status'),
                accessorKey: 'status',
                cell: (props) => <StatusBadge status={props.row.original.status} />,
            },
            {
                header: t('pm.columns.priority'),
                accessorKey: 'priority',
                cell: (props) => <PriorityBadge priority={props.row.original.priority} />,
            },
            {
                header: t('pm.columns.asset'),
                accessorKey: 'asset',
                cell: (props) =>
                    props.row.original.asset ? (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {props.row.original.asset.name}
                        </span>
                    ) : (
                        <span className="text-gray-400">—</span>
                    ),
            },
            {
                header: t('pm.columns.frequency'),
                accessorKey: 'trigger',
                cell: (props) => {
                    const trigger = props.row.original.trigger
                    if (!trigger) return <span className="text-gray-400">—</span>
                    return (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('pm.frequency', { value: trigger.interval_value, unit: trigger.interval_unit })}
                        </span>
                    )
                },
            },
            {
                header: t('pm.columns.nextRun'),
                accessorKey: 'next_run_at',
                cell: (props) => {
                    const next = props.row.original.trigger?.next_run_at
                    if (!next) return <span className="text-gray-400">—</span>
                    return (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(next).toLocaleDateString()}
                        </span>
                    )
                },
            },
            {
                header: 'Team',
                accessorKey: 'team',
                cell: (props) => {
                    const team = props.row.original.team
                    if (!team) return <span className="text-gray-400">—</span>
                    return (
                        <div className="flex items-center gap-1.5">
                            <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: team.color }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                {team.name}
                            </span>
                        </div>
                    )
                },
            },
            {
                header: t('pm.columns.assignedTo'),
                accessorKey: 'assigned_to',
                cell: (props) => {
                    const member = props.row.original.assigned_to
                    if (!member?.name) return <span className="text-gray-400">—</span>
                    return (
                        <div className="flex items-center gap-2">
                            <Avatar
                                size={24}
                                shape="circle"
                                icon={<TbUserCircle />}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                {member.name}
                            </span>
                        </div>
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
                        onDelete={setDeleteTargetId}
                    />
                ),
            },
        ],
        [canEdit, canDelete, t],
    )

    const handleSetTableData = (data: TableQueries) => {
        setTableData(data)
        if (selectedPmPlans.length > 0) setSelectAllPmPlan([])
    }

    return (
        <>
            <DataTable
                selectable
                columns={columns}
                data={pmPlanList}
                noData={!isLoading && pmPlanList.length === 0}
                loading={isLoading}
                pagingData={{
                    total: pmPlanListTotal,
                    pageIndex: tableData.pageIndex as number,
                    pageSize: tableData.pageSize as number,
                }}
                checkboxChecked={(row) => selectedPmPlans.some((p) => p.id === row.id)}
                onPaginationChange={(page) => {
                    const d = cloneDeep(tableData)
                    d.pageIndex = page
                    handleSetTableData(d)
                }}
                onSelectChange={(value) => {
                    const d = cloneDeep(tableData)
                    d.pageSize = Number(value)
                    d.pageIndex = 1
                    handleSetTableData(d)
                }}
                onSort={(sort: OnSortParam) => {
                    const d = cloneDeep(tableData)
                    d.sort = sort
                    handleSetTableData(d)
                }}
                onCheckBoxChange={(checked, row) => setSelectedPmPlan(checked, row)}
                onIndeterminateCheckBoxChange={(checked, rows: Row<PmPlan>[]) => {
                    if (checked) {
                        setSelectAllPmPlan(rows.map((r) => r.original))
                    } else {
                        setSelectAllPmPlan([])
                    }
                }}
            />

            <ConfirmDialog
                isOpen={deleteTargetId !== null}
                type="danger"
                title={t('pm.delete.title')}
                onClose={() => setDeleteTargetId(null)}
                onRequestClose={() => setDeleteTargetId(null)}
                onCancel={() => setDeleteTargetId(null)}
                onConfirm={handleDeleteConfirm}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>{t('pm.delete.confirm')}</p>
            </ConfirmDialog>
        </>
    )
}

export default PmPlanListTable
