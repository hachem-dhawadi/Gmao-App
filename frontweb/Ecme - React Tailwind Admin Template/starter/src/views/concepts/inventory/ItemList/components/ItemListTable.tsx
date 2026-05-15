import { useMemo, useState } from 'react'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import Tag from '@/components/ui/Tag'
import Avatar from '@/components/ui/Avatar'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useItemList from '../hooks/useItemList'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import { apiDeleteItem } from '@/services/InventoryService'
import { mutate as globalMutate } from 'swr'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbTrash, TbEye } from 'react-icons/tb'
import { FiPackage } from 'react-icons/fi'
import type { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable'
import type { Item } from '@/services/InventoryService'
import type { TableQueries } from '@/@types/common'

const StockBadge = ({ item }: { item: Item }) => {
    const isLow =
        item.min_stock !== null &&
        item.min_stock > 0 &&
        item.total_stock <= item.min_stock
    const className = isLow
        ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0'
        : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0'
    return (
        <Tag className={`text-xs font-mono ${className}`}>
            {item.total_stock.toFixed(3).replace(/\.?0+$/, '') || '0'}
            {item.unit ? ` ${item.unit}` : ''}
            {isLow && ' ⚠'}
        </Tag>
    )
}

const ItemListTable = () => {
    const navigate = useNavigate()

    const {
        itemList,
        itemListTotal,
        tableData,
        isLoading,
        setTableData,
        selectedItems,
        setSelectedItems,
        setSelectAllItems,
        mutate,
    } = useItemList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER])
    const canDelete = useAuthority(userAuthority, [ADMIN])

    const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            await apiDeleteItem(deleteTarget.id)
            await mutate()
            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/inventory/items',
            )
            toast.push(
                <Notification type="success">Item deleted.</Notification>,
                { placement: 'top-center' },
            )
        } catch {
            toast.push(
                <Notification type="danger">
                    Failed to delete item.
                </Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleteTarget(null)
        }
    }

    const columns: ColumnDef<Item>[] = useMemo(
        () => [
            {
                header: 'Item',
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
                                    : { icon: <FiPackage /> })}
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
                header: 'Unit',
                accessorKey: 'unit',
                cell: (props) => (
                    <span className="font-semibold heading-text">
                        {props.row.original.unit || '—'}
                    </span>
                ),
            },
            {
                header: 'Unit Cost',
                accessorKey: 'unit_cost',
                cell: (props) => {
                    const cost = props.row.original.unit_cost
                    return (
                        <span className="font-bold heading-text">
                            {cost !== null ? cost.toFixed(2) : '—'}
                        </span>
                    )
                },
            },
            {
                header: 'Stock',
                accessorKey: 'total_stock',
                cell: (props) => <StockBadge item={props.row.original} />,
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
                                        `/concepts/inventory/items/item-details/${props.row.original.id}`,
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
                                            `/concepts/inventory/items/item-edit/${props.row.original.id}`,
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
        if (selectedItems.length > 0) setSelectAllItems([])
    }

    return (
        <>
            <DataTable
                selectable
                columns={columns}
                data={itemList}
                noData={!isLoading && itemList.length === 0}
                loading={isLoading}
                pagingData={{
                    total: itemListTotal,
                    pageIndex: tableData.pageIndex as number,
                    pageSize: tableData.pageSize as number,
                }}
                checkboxChecked={(row) =>
                    selectedItems.some((i) => i.id === row.id)
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
                onCheckBoxChange={(checked, row) =>
                    setSelectedItems(checked, row)
                }
                onIndeterminateCheckBoxChange={(checked, rows: Row<Item>[]) => {
                    if (checked) {
                        setSelectAllItems(rows.map((r) => r.original))
                    } else {
                        setSelectAllItems([])
                    }
                }}
            />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Delete item"
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p>
                    Delete <strong>{deleteTarget?.name}</strong>? This cannot be
                    undone.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default ItemListTable
