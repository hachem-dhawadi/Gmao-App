import { useMemo } from 'react'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import Tag from '@/components/ui/Tag'
import useDepartmentList from '../hooks/useDepartmentList'
import { useNavigate } from 'react-router-dom'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbEye } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, HR } from '@/constants/roles.constant'
import type { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable'
import type { Department } from '../types'
import type { TableQueries } from '@/@types/common'

const CodeBadge = ({ code }: { code: string }) => (
    <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs border-0">
        {code}
    </Tag>
)

const ActionColumn = ({
    id,
    canEdit,
}: {
    id: number
    canEdit: boolean
}) => {
    const navigate = useNavigate()
    return (
        <div className="flex items-center justify-end gap-3">
            {canEdit && (
                <Tooltip title="Edit">
                    <div
                        className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                        role="button"
                        onClick={() =>
                            navigate(
                                `/concepts/departments/department-edit/${id}`,
                            )
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
                        navigate(
                            `/concepts/departments/department-details/${id}`,
                        )
                    }
                >
                    <TbEye />
                </div>
            </Tooltip>
        </div>
    )
}

const DepartmentListTable = () => {
    const navigate = useNavigate()

    const {
        departmentList,
        departmentListTotal,
        tableData,
        isLoading,
        setTableData,
        selectedDepartment,
        setSelectedDepartment,
        setSelectAllDepartment,
    } = useDepartmentList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, HR])

    const columns: ColumnDef<Department>[] = useMemo(
        () => [
            {
                header: 'Name',
                accessorKey: 'name',
                cell: (props) => (
                    <div
                        className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary"
                        onClick={() =>
                            navigate(
                                `/concepts/departments/department-details/${props.row.original.id}`,
                            )
                        }
                    >
                        {props.row.original.name}
                    </div>
                ),
            },
            {
                header: 'Code',
                accessorKey: 'code',
                cell: (props) => <CodeBadge code={props.row.original.code} />,
            },
            {
                header: 'Parent',
                accessorKey: 'parent',
                cell: (props) =>
                    props.row.original.parent ? (
                        <span className="text-gray-600 dark:text-gray-400">
                            {props.row.original.parent.name}
                        </span>
                    ) : (
                        <Tag className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs border-0">
                            Top-level
                        </Tag>
                    ),
            },
            {
                header: 'Members',
                accessorKey: 'members_count',
                cell: (props) => (
                    <span className="font-medium">
                        {props.row.original.members_count}
                    </span>
                ),
            },
            {
                header: 'Sub-depts',
                accessorKey: 'children_count',
                cell: (props) => (
                    <span className="font-medium">
                        {props.row.original.children_count}
                    </span>
                ),
            },
            {
                header: 'Description',
                accessorKey: 'description',
                cell: (props) => (
                    <span className="text-gray-500 dark:text-gray-400 truncate max-w-xs block">
                        {props.row.original.description || '—'}
                    </span>
                ),
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
        if (selectedDepartment.length > 0) {
            setSelectAllDepartment([])
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

    const handleRowSelect = (checked: boolean, row: Department) => {
        setSelectedDepartment(checked, row)
    }

    const handleAllRowSelect = (checked: boolean, rows: Row<Department>[]) => {
        if (checked) {
            setSelectAllDepartment(rows.map((r) => r.original))
        } else {
            setSelectAllDepartment([])
        }
    }

    return (
        <DataTable
            selectable
            columns={columns}
            data={departmentList}
            noData={!isLoading && departmentList.length === 0}
            loading={isLoading}
            pagingData={{
                total: departmentListTotal,
                pageIndex: tableData.pageIndex as number,
                pageSize: tableData.pageSize as number,
            }}
            checkboxChecked={(row) =>
                selectedDepartment.some((d) => d.id === row.id)
            }
            onPaginationChange={handlePaginationChange}
            onSelectChange={handleSelectChange}
            onSort={handleSort}
            onCheckBoxChange={handleRowSelect}
            onIndeterminateCheckBoxChange={handleAllRowSelect}
        />
    )
}

export default DepartmentListTable
