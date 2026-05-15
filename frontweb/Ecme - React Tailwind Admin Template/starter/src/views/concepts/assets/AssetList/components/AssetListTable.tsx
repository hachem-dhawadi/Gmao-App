import { useMemo, useState } from 'react'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import Tag from '@/components/ui/Tag'
import Avatar from '@/components/ui/Avatar'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useAssetList from '../hooks/useAssetList'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import { apiDeleteAsset } from '@/services/AssetsService'
import { mutate as globalMutate } from 'swr'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbTrash, TbEye } from 'react-icons/tb'
import { TbEngine } from 'react-icons/tb'
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

const StatusBadge = ({ status }: { status: Asset['status'] }) => {
    const cfg = statusConfig[status]
    return <Tag className={`text-xs ${cfg.className}`}>{cfg.label}</Tag>
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
        mutate,
    } = useAssetList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER])
    const canDelete = useAuthority(userAuthority, [ADMIN])

    const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            await apiDeleteAsset(deleteTarget.id)
            await mutate()
            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/assets',
            )
            toast.push(
                <Notification type="success">Asset deleted.</Notification>,
                { placement: 'top-center' },
            )
        } catch {
            toast.push(
                <Notification type="danger">
                    Failed to delete asset.
                </Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleteTarget(null)
        }
    }

    const columns: ColumnDef<Asset>[] = useMemo(
        () => [
            {
                header: 'Asset',
                accessorKey: 'name',
                cell: (props) => {
                    const row = props.row.original
                    const firstImage = row.images?.[0]
                    return (
                        <div className="flex items-center gap-3">
                            <Avatar
                                shape="round"
                                size={50}
                                {...(firstImage
                                    ? { src: firstImage }
                                    : { icon: <TbEngine /> })}
                            />
                            <div>
                                <div className="font-bold heading-text mb-0.5">
                                    {row.name}
                                </div>
                                <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs border-0">
                                    {row.code}
                                </Tag>
                            </div>
                        </div>
                    )
                },
            },
            {
                header: 'Type',
                accessorKey: 'asset_type',
                cell: (props) =>
                    props.row.original.asset_type ? (
                        <Tag className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs border-0">
                            {props.row.original.asset_type.name}
                        </Tag>
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
                        <span className="text-sm heading-text">
                            {[manufacturer, model].filter(Boolean).join(' · ')}
                        </span>
                    )
                },
            },
            {
                header: 'Location',
                accessorKey: 'location',
                cell: (props) => (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {props.row.original.location || '—'}
                    </span>
                ),
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <div className="flex items-center justify-end gap-3">
                        <Tooltip title="View details">
                            <div
                                className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                                role="button"
                                onClick={() =>
                                    navigate(
                                        `/concepts/assets/asset-details/${props.row.original.id}`,
                                    )
                                }
                            >
                                <TbEye />
                            </div>
                        </Tooltip>
                        {canEdit && (
                            <Tooltip title="Edit">
                                <div
                                    className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                                    role="button"
                                    onClick={() =>
                                        navigate(
                                            `/concepts/assets/asset-edit/${props.row.original.id}`,
                                        )
                                    }
                                >
                                    <TbPencil />
                                </div>
                            </Tooltip>
                        )}
                        {canDelete && (
                            <Tooltip title="Delete">
                                <div
                                    className="text-xl cursor-pointer select-none text-gray-500 hover:text-red-500"
                                    role="button"
                                    onClick={() =>
                                        setDeleteTarget(props.row.original)
                                    }
                                >
                                    <TbTrash />
                                </div>
                            </Tooltip>
                        )}
                    </div>
                ),
            },
        ],
        [canEdit, canDelete, navigate],
    )

    const handleSetTableData = (data: TableQueries) => {
        setTableData(data)
        if (selectedAsset.length > 0) {
            setSelectAllAsset([])
        }
    }

    return (
        <>
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
                onCheckBoxChange={(checked, row) => setSelectedAsset(checked, row)}
                onIndeterminateCheckBoxChange={(checked, rows: Row<Asset>[]) => {
                    if (checked) {
                        setSelectAllAsset(rows.map((r) => r.original))
                    } else {
                        setSelectAllAsset([])
                    }
                }}
            />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Delete asset"
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p>
                    Delete <strong>{deleteTarget?.name}</strong>? This cannot
                    be undone.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default AssetListTable
