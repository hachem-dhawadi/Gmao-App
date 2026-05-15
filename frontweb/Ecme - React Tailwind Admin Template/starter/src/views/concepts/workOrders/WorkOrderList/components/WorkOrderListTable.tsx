import { useMemo } from 'react'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import Tag from '@/components/ui/Tag'
import useWorkOrderList from '../hooks/useWorkOrderList'
import { useNavigate } from 'react-router-dom'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbEye } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER, TECHNICIAN } from '@/constants/roles.constant'
import type { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable'
import type { WorkOrder } from '../types'
import type { TableQueries } from '@/@types/common'

const statusConfig: Record<
    WorkOrder['status'],
    { label: string; className: string }
> = {
    open: {
        label: 'Open',
        className: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    },
    in_progress: {
        label: 'In Progress',
        className: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    },
    on_hold: {
        label: 'On Hold',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    },
    completed: {
        label: 'Completed',
        className: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    },
    cancelled: {
        label: 'Cancelled',
        className: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
    },
}

const priorityConfig: Record<
    WorkOrder['priority'],
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

const CodeBadge = ({ code }: { code: string }) => (
    <Tag className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-mono text-xs border-0">
        {code}
    </Tag>
)

const StatusBadge = ({ status }: { status: WorkOrder['status'] }) => {
    const cfg = statusConfig[status]
    return <Tag className={`text-xs ${cfg.className}`}>{cfg.label}</Tag>
}

const PriorityBadge = ({ priority }: { priority: WorkOrder['priority'] }) => {
    const cfg = priorityConfig[priority]
    return <Tag className={`text-xs ${cfg.className}`}>{cfg.label}</Tag>
}

const ActionColumn = ({ id, canEdit }: { id: number; canEdit: boolean }) => {
    const navigate = useNavigate()
    return (
        <div className="flex items-center justify-end gap-3">
            {canEdit && (
                <Tooltip title="Edit">
                    <div
                        className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                        role="button"
                        onClick={() =>
                            navigate(`/concepts/work-orders/work-order-edit/${id}`)
                        }
                    >
                        <TbPencil />
                    </div>
                </Tooltip>
            )}
            <Tooltip title="View details">
                <div
                    className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                    role="button"
                    onClick={() =>
                        navigate(`/concepts/work-orders/work-order-details/${id}`)
                    }
                >
                    <TbEye />
                </div>
            </Tooltip>
        </div>
    )
}

const WorkOrderListTable = () => {
    const navigate = useNavigate()

    const {
        workOrderList,
        workOrderListTotal,
        tableData,
        isLoading,
        setTableData,
        selectedWorkOrder,
        setSelectedWorkOrder,
        setSelectAllWorkOrder,
    } = useWorkOrderList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER, TECHNICIAN])

    const columns: ColumnDef<WorkOrder>[] = useMemo(
        () => [
            {
                header: 'Title',
                accessorKey: 'title',
                cell: (props) => (
                    <div
                        className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary"
                        onClick={() =>
                            navigate(
                                `/concepts/work-orders/work-order-details/${props.row.original.id}`,
                            )
                        }
                    >
                        {props.row.original.title}
                    </div>
                ),
            },
            {
                header: 'Code',
                accessorKey: 'code',
                cell: (props) => <CodeBadge code={props.row.original.code} />,
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: (props) => (
                    <StatusBadge status={props.row.original.status} />
                ),
            },
            {
                header: 'Priority',
                accessorKey: 'priority',
                cell: (props) => (
                    <PriorityBadge priority={props.row.original.priority} />
                ),
            },
            {
                header: 'Asset',
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
                header: 'Due',
                accessorKey: 'due_at',
                cell: (props) => {
                    const due = props.row.original.due_at
                    if (!due) return <span className="text-gray-400">—</span>
                    const date = new Date(due)
                    const isPast = date < new Date() && props.row.original.status !== 'completed'
                    return (
                        <span className={`text-sm ${isPast ? 'text-red-500 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                            {date.toLocaleDateString()}
                        </span>
                    )
                },
            },
            {
                header: 'Assigned',
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
                    />
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [canEdit],
    )

    const handleSetTableData = (data: TableQueries) => {
        setTableData(data)
        if (selectedWorkOrder.length > 0) {
            setSelectAllWorkOrder([])
        }
    }

    const handlePaginationChange = (page: number) => {
        const newTableData = cloneDeep(tableData)
        newTableData.pageIndex = page
        handleSetTableData(newTableData)
    }

    const handleSelectChange = (value: number) => {
        const newTableData = cloneDeep(tableData)
        newTableData.pageSize = Number(value)
        newTableData.pageIndex = 1
        handleSetTableData(newTableData)
    }

    const handleSort = (sort: OnSortParam) => {
        const newTableData = cloneDeep(tableData)
        newTableData.sort = sort
        handleSetTableData(newTableData)
    }

    const handleRowSelect = (checked: boolean, row: WorkOrder) => {
        setSelectedWorkOrder(checked, row)
    }

    const handleAllRowSelect = (checked: boolean, rows: Row<WorkOrder>[]) => {
        if (checked) {
            setSelectAllWorkOrder(rows.map((r) => r.original))
        } else {
            setSelectAllWorkOrder([])
        }
    }

    return (
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
            checkboxChecked={(row) =>
                selectedWorkOrder.some((w) => w.id === row.id)
            }
            onPaginationChange={handlePaginationChange}
            onSelectChange={handleSelectChange}
            onSort={handleSort}
            onCheckBoxChange={handleRowSelect}
            onIndeterminateCheckBoxChange={handleAllRowSelect}
        />
    )
}

export default WorkOrderListTable
