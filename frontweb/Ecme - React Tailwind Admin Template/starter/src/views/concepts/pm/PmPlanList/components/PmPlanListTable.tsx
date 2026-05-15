import { useMemo } from 'react'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import Tag from '@/components/ui/Tag'
import usePmPlanList from '../hooks/usePmPlanList'
import { useNavigate } from 'react-router-dom'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import type { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable'
import type { PmPlan } from '@/services/PmService'
import type { TableQueries } from '@/@types/common'

const statusConfig: Record<
    PmPlan['status'],
    { label: string; className: string }
> = {
    active: {
        label: 'Active',
        className: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    },
    inactive: {
        label: 'Inactive',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    },
    draft: {
        label: 'Draft',
        className: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    },
}

const priorityConfig: Record<
    PmPlan['priority'],
    { label: string; className: string }
> = {
    low: {
        label: 'Low',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    },
    medium: {
        label: 'Medium',
        className: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    },
    high: {
        label: 'High',
        className: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    },
    critical: {
        label: 'Critical',
        className: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
    },
}

const formatFrequency = (trigger: PmPlan['trigger']) => {
    if (!trigger) return '—'
    return `Every ${trigger.interval_value} ${trigger.interval_unit}`
}

const ActionColumn = ({ id, canEdit }: { id: number; canEdit: boolean }) => {
    const navigate = useNavigate()
    if (!canEdit) return null
    return (
        <div className="flex items-center justify-end gap-3">
            <Tooltip title="Edit">
                <div
                    className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                    role="button"
                    onClick={() => navigate(`/concepts/pm/pm-edit/${id}`)}
                >
                    <TbPencil />
                </div>
            </Tooltip>
        </div>
    )
}

const PmPlanListTable = () => {
    const {
        pmPlanList,
        pmPlanListTotal,
        tableData,
        isLoading,
        setTableData,
        selectedPmPlans,
        setSelectedPmPlan,
        setSelectAllPmPlan,
    } = usePmPlanList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER])

    const columns: ColumnDef<PmPlan>[] = useMemo(
        () => [
            {
                header: 'Name',
                accessorKey: 'name',
                cell: (props) => (
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                        <div>{props.row.original.name}</div>
                        <div className="text-xs font-mono text-purple-500">
                            {props.row.original.code}
                        </div>
                    </div>
                ),
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: (props) => {
                    const cfg = statusConfig[props.row.original.status]
                    return <Tag className={`text-xs ${cfg.className}`}>{cfg.label}</Tag>
                },
            },
            {
                header: 'Priority',
                accessorKey: 'priority',
                cell: (props) => {
                    const cfg = priorityConfig[props.row.original.priority]
                    return <Tag className={`text-xs ${cfg.className}`}>{cfg.label}</Tag>
                },
            },
            {
                header: 'Asset',
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
                header: 'Frequency',
                accessorKey: 'trigger',
                cell: (props) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatFrequency(props.row.original.trigger)}
                    </span>
                ),
            },
            {
                header: 'Next Run',
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
                header: 'Assigned To',
                accessorKey: 'assigned_to',
                cell: (props) =>
                    props.row.original.assigned_to?.name ? (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {props.row.original.assigned_to.name}
                        </span>
                    ) : (
                        <span className="text-gray-400">—</span>
                    ),
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn id={props.row.original.id} canEdit={canEdit} />
                ),
            },
        ],
        [canEdit],
    )

    const handleSetTableData = (data: TableQueries) => {
        setTableData(data)
        if (selectedPmPlans.length > 0) {
            setSelectAllPmPlan([])
        }
    }

    return (
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
            checkboxChecked={(row) =>
                selectedPmPlans.some((p) => p.id === row.id)
            }
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
    )
}

export default PmPlanListTable
