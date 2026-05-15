import { useMemo, useState } from 'react'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useWarehouseList from '../hooks/useWarehouseList'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import { apiDeleteWarehouse } from '@/services/InventoryService'
import { mutate as globalMutate } from 'swr'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbTrash, TbEye } from 'react-icons/tb'
import type { ColumnDef, OnSortParam } from '@/components/shared/DataTable'
import type { Warehouse } from '@/services/InventoryService'

const WarehouseListTable = () => {
    const {
        warehouseList,
        warehouseListTotal,
        tableData,
        isLoading,
        setTableData,
        mutate,
    } = useWarehouseList()

    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER])
    const canDelete = useAuthority(userAuthority, [ADMIN])

    const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null)

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            await apiDeleteWarehouse(deleteTarget.id)
            await mutate()
            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/inventory/warehouses',
            )
            toast.push(
                <Notification type="success">Warehouse deleted.</Notification>,
                { placement: 'top-center' },
            )
        } catch {
            toast.push(
                <Notification type="danger">
                    Failed to delete warehouse.
                </Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleteTarget(null)
        }
    }

    const columns: ColumnDef<Warehouse>[] = useMemo(
        () => [
            {
                header: 'Name',
                accessorKey: 'name',
                cell: (props) => (
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {props.row.original.name}
                    </span>
                ),
            },
            {
                header: 'Code',
                accessorKey: 'code',
                cell: (props) => (
                    <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                        {props.row.original.code}
                    </span>
                ),
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
                    <div className="flex items-center justify-end gap-3">
                        <Tooltip title="View details">
                            <div
                                className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                                role="button"
                                onClick={() =>
                                    navigate(
                                        `/concepts/inventory/warehouses/warehouse-details/${props.row.original.id}`,
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
                                            `/concepts/inventory/warehouses/warehouse-edit/${props.row.original.id}`,
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
        [canEdit, navigate],
    )

    return (
        <>
            <DataTable
                columns={columns}
                data={warehouseList}
                noData={!isLoading && warehouseList.length === 0}
                loading={isLoading}
                pagingData={{
                    total: warehouseListTotal,
                    pageIndex: tableData.pageIndex as number,
                    pageSize: tableData.pageSize as number,
                }}
                onPaginationChange={(page) => {
                    const next = cloneDeep(tableData)
                    next.pageIndex = page
                    setTableData(next)
                }}
                onSelectChange={(value) => {
                    const next = cloneDeep(tableData)
                    next.pageSize = Number(value)
                    next.pageIndex = 1
                    setTableData(next)
                }}
                onSort={(sort: OnSortParam) => {
                    const next = cloneDeep(tableData)
                    next.sort = sort
                    setTableData(next)
                }}
            />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Delete warehouse"
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

export default WarehouseListTable
