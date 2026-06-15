import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useWarehouseList from '../hooks/useWarehouseList'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { apiDeleteWarehouse } from '@/services/InventoryService'
import { mutate as globalMutate } from 'swr'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbTrash, TbEye } from 'react-icons/tb'
import type { ColumnDef, OnSortParam } from '@/components/shared/DataTable'
import type { Warehouse } from '@/services/InventoryService'

const WarehouseListTable = () => {
    const { t } = useTranslation()
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
    const canEdit = useAuthority(userAuthority, ['inventory.write', 'admin', 'manager'])
    const canDelete = useAuthority(userAuthority, ['inventory.delete', 'admin'])

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
                <Notification type="success">{t('warehouse.toast.deleted')}</Notification>,
                { placement: 'top-center' },
            )
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? t('warehouse.toast.deleteFailed')
            toast.push(
                <Notification type="danger">{msg}</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleteTarget(null)
        }
    }

    const columns: ColumnDef<Warehouse>[] = useMemo(
        () => [
            {
                header: t('warehouse.col.name'),
                accessorKey: 'name',
                cell: (props) => (
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {props.row.original.name}
                    </span>
                ),
            },
            {
                header: t('warehouse.col.code'),
                accessorKey: 'code',
                cell: (props) => (
                    <span className="font-mono text-sm font-bold">
                        {props.row.original.code}
                    </span>
                ),
            },
            {
                header: 'Site',
                id: 'site',
                cell: (props) => (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {props.row.original.site
                            ? `${props.row.original.site.name} (${props.row.original.site.code})`
                            : '—'}
                    </span>
                ),
            },
            {
                header: t('warehouse.col.location'),
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
                    <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title={t('warehouse.tooltip.view')}>
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
                            <Tooltip title={t('warehouse.tooltip.edit')}>
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
                            <Tooltip title={t('warehouse.tooltip.delete')}>
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
        [canEdit, canDelete, navigate, t],
    )

    return (
        <>
            <DataTable
                columns={columns}
                data={warehouseList}
                noData={!isLoading && warehouseList.length === 0}
                loading={isLoading}
                onRowClick={(row) => navigate(`/concepts/inventory/warehouses/warehouse-details/${row.id}`)}
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
                title={t('warehouse.confirmDelete.title')}
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p>{t('warehouse.confirmDelete.body', { name: deleteTarget?.name })}</p>
            </ConfirmDialog>
        </>
    )
}

export default WarehouseListTable
