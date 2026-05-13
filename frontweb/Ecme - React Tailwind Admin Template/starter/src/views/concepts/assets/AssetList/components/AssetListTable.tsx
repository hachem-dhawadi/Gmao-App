import { useMemo } from 'react'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import Tag from '@/components/ui/Tag'
import useAssetList from '../hooks/useAssetList'
import { useNavigate } from 'react-router-dom'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbEye } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import type { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable'
import type { Asset } from '../types'
import type { TableQueries } from '@/@types/common'

const statusConfig: Record<
    Asset['status'],
    { label: string; className: string }
> = {
    active: {
        label: 'Active',
        className:
            'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    },
    inactive: {
        label: 'Inactive',
        className:
            'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    },
    under_maintenance: {
        label: 'Maintenance',
        className:
            'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    },
    decommissioned: {
        label: 'Decommissioned',
        className:
            'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
    },
}

const CodeBadge = ({ code }: { code: string }) => (
    <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs border-0">
        {code}
    </Tag>
)

const StatusBadge = ({ status }: { status: Asset['status'] }) => {
    const cfg = statusConfig[status]
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
                            navigate(`/concepts/assets/asset-edit/${id}`)
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
                        navigate(`/concepts/assets/asset-details/${id}`)
                    }
                >
                    <TbEye />
                </div>
            </Tooltip>
        </div>
    )
}

const AssetListTable = () => {
    const navigate = useNavigate()

    const {
        assetList,
        assetListTotal,
        tableData,
        isLoading,
        setTableData,
        selectedAsset,
        setSelectedAsset,
        setSelectAllAsset,
    } = useAssetList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER])

    const columns: ColumnDef<Asset>[] = useMemo(
        () => [
            {
                header: 'Name',
                accessorKey: 'name',
                cell: (props) => (
                    <div
                        className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary"
                        onClick={() =>
                            navigate(
                                `/concepts/assets/asset-details/${props.row.original.id}`,
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
                header: 'Type',
                accessorKey: 'asset_type',
                cell: (props) =>
                    props.row.original.asset_type ? (
                        <span className="text-gray-600 dark:text-gray-400 text-sm">
                            {props.row.original.asset_type.name}
                        </span>
                    ) : (
                        <span className="text-gray-400">—</span>
                    ),
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: (props) => (
                    <StatusBadge status={props.row.original.status} />
                ),
            },
            {
                header: 'Manufacturer / Model',
                accessorKey: 'manufacturer',
                cell: (props) => {
                    const { manufacturer, model } = props.row.original
                    if (!manufacturer && !model)
                        return <span className="text-gray-400">—</span>
                    return (
                        <span className="text-gray-600 dark:text-gray-400 text-sm">
                            {[manufacturer, model].filter(Boolean).join(' · ')}
                        </span>
                    )
                },
            },
            {
                header: 'Location',
                accessorKey: 'location',
                cell: (props) => (
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                        {props.row.original.location || '—'}
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
        if (selectedAsset.length > 0) {
            setSelectAllAsset([])
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

    const handleRowSelect = (checked: boolean, row: Asset) => {
        setSelectedAsset(checked, row)
    }

    const handleAllRowSelect = (checked: boolean, rows: Row<Asset>[]) => {
        if (checked) {
            setSelectAllAsset(rows.map((r) => r.original))
        } else {
            setSelectAllAsset([])
        }
    }

    return (
        <DataTable
            selectable
            columns={columns}
            data={assetList}
            noData={!isLoading && assetList.length === 0}
            loading={isLoading}
            pagingData={{
                total: assetListTotal,
                pageIndex: tableData.pageIndex as number,
                pageSize: tableData.pageSize as number,
            }}
            checkboxChecked={(row) =>
                selectedAsset.some((a) => a.id === row.id)
            }
            onPaginationChange={handlePaginationChange}
            onSelectChange={handleSelectChange}
            onSort={handleSort}
            onCheckBoxChange={handleRowSelect}
            onIndeterminateCheckBoxChange={handleAllRowSelect}
        />
    )
}

export default AssetListTable
