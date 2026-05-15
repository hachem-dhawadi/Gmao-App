import { useState, useEffect, useMemo } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import DataTable from '@/components/shared/DataTable'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { Form, FormItem } from '@/components/ui/Form'
import { useForm, Controller, useWatch } from 'react-hook-form'
import useSWR from 'swr'
import cloneDeep from 'lodash/cloneDeep'
import { TbPlus, TbTrash } from 'react-icons/tb'
import useStockMoveList from './hooks/useStockMoveList'
import {
    apiCreateStockMove,
    apiDeleteStockMove,
    apiGetItemById,
    apiGetItemsList,
    apiGetWarehousesList,
} from '@/services/InventoryService'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import dayjs from 'dayjs'
import type { ColumnDef, OnSortParam } from '@/components/shared/DataTable'
import type {
    StockMove,
    ItemsListResponse,
    WarehousesListResponse,
    ItemResponse,
} from '@/services/InventoryService'

type MoveFormSchema = {
    item_id: { value: number; label: string } | null
    warehouse_id: { value: number; label: string } | null
    move_type: { value: 'in' | 'out' | 'adjustment'; label: string }
    quantity: string
    reference: string
    notes: string
}

const moveTypeConfig: Record<
    'in' | 'out' | 'adjustment',
    { label: string; className: string }
> = {
    in: {
        label: 'IN',
        className:
            'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    },
    out: {
        label: 'OUT',
        className:
            'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
    },
    adjustment: {
        label: 'ADJ',
        className:
            'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    },
}

const MOVE_TYPE_OPTIONS = [
    { value: 'in' as const, label: 'IN — Stock received' },
    { value: 'out' as const, label: 'OUT — Stock consumed / used' },
    { value: 'adjustment' as const, label: 'ADJUSTMENT — Manual correction' },
]

const StockMoveList = () => {
    const {
        moveList,
        moveListTotal,
        tableData,
        filterData,
        isLoading,
        mutate,
        setTableData,
        setFilterData,
    } = useStockMoveList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, [ADMIN, MANAGER])
    const isAdmin = useAuthority(userAuthority, [ADMIN])

    const [dialogOpen, setDialogOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<StockMove | null>(null)

    // ── Load all items and warehouses for selects ──────────────────────────
    const { data: itemsData } = useSWR(
        '/inventory/items-all',
        () => apiGetItemsList<ItemsListResponse>({ per_page: 200 }),
        { revalidateOnFocus: false },
    )

    const { data: warehousesData } = useSWR(
        '/inventory/warehouses-all',
        () => apiGetWarehousesList<WarehousesListResponse>({ per_page: 100 }),
        { revalidateOnFocus: false },
    )

    // Only stocked items can have stock moves recorded
    const itemOptions =
        itemsData?.data?.items
            ?.filter((i) => i.is_stocked)
            .map((i) => ({
                value: i.id,
                label: `${i.code} — ${i.name}`,
            })) || []

    const allWarehouseOptions =
        warehousesData?.data?.warehouses?.map((w) => ({
            value: w.id,
            label: `${w.code} — ${w.name}`,
        })) || []

    // ── Filter selects (list page) ─────────────────────────────────────────
    const filterItemOptions = [
        { value: '', label: 'All items' },
        ...itemOptions,
    ]

    const filterWarehouseOptions = [
        { value: '', label: 'All warehouses' },
        ...allWarehouseOptions,
    ]

    const filterMoveTypeOptions = [
        { value: '', label: 'All types' },
        { value: 'in', label: 'IN' },
        { value: 'out', label: 'OUT' },
        { value: 'adjustment', label: 'Adjustment' },
    ]

    // ── Dialog form ────────────────────────────────────────────────────────
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<MoveFormSchema>({
        defaultValues: {
            item_id: null,
            warehouse_id: null,
            move_type: MOVE_TYPE_OPTIONS[0],
            quantity: '',
            reference: '',
            notes: '',
        },
    })

    const watchedItemId = useWatch({ control, name: 'item_id' })
    const watchedMoveType = useWatch({ control, name: 'move_type' })

    // When item changes, clear the warehouse selection
    useEffect(() => {
        setValue('warehouse_id', null)
    }, [watchedItemId, setValue])

    // Fetch item detail when item is selected → gives us per-warehouse stock
    const { data: itemDetailData } = useSWR(
        watchedItemId && dialogOpen
            ? [`/inventory/items/${watchedItemId.value}/detail`]
            : null,
        () => apiGetItemById<ItemResponse>(watchedItemId!.value),
        { revalidateOnFocus: false },
    )

    // Compute which warehouses to show in the dialog based on item + move type
    const dialogWarehouseOptions = useMemo(() => {
        // No item selected → show all
        if (!watchedItemId) return allWarehouseOptions

        const moveType = watchedMoveType?.value

        // IN move: you can receive to any warehouse (even new for this item)
        if (moveType === 'in') return allWarehouseOptions

        // OUT / ADJUSTMENT: only show warehouses where this item has positive stock
        const stockByWarehouse =
            itemDetailData?.data?.stock_by_warehouse || []
        const warehouseIdsWithStock = stockByWarehouse
            .filter((s) => s.stock_qty > 0)
            .map((s) => s.warehouse_id)

        if (warehouseIdsWithStock.length === 0) {
            // Item has no stock anywhere — show all with a hint
            return allWarehouseOptions
        }

        return allWarehouseOptions.filter((opt) =>
            warehouseIdsWithStock.includes(opt.value),
        )
    }, [watchedItemId, watchedMoveType, allWarehouseOptions, itemDetailData])

    const handleRecordMove = async (values: MoveFormSchema) => {
        if (!values.item_id || !values.warehouse_id) return
        const qty = parseFloat(values.quantity)
        if (!qty || qty === 0) return

        try {
            setSubmitting(true)
            await apiCreateStockMove({
                item_id: values.item_id.value,
                warehouse_id: values.warehouse_id.value,
                move_type: values.move_type.value,
                quantity: qty,
                reference: values.reference || null,
                notes: values.notes || null,
            })

            await mutate()
            toast.push(
                <Notification type="success">
                    Stock move recorded.
                </Notification>,
                { placement: 'top-center' },
            )
            setDialogOpen(false)
            reset()
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to record move.'
            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteMove = async () => {
        if (!deleteTarget) return
        try {
            await apiDeleteStockMove(deleteTarget.id)
            await mutate()
            toast.push(
                <Notification type="success">Stock move deleted.</Notification>,
                { placement: 'top-center' },
            )
        } catch {
            toast.push(
                <Notification type="danger">
                    Failed to delete stock move.
                </Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleteTarget(null)
        }
    }

    const columns: ColumnDef<StockMove>[] = [
        {
            header: 'Date',
            accessorKey: 'moved_at',
            cell: (props) => (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                    {props.row.original.moved_at
                        ? dayjs(props.row.original.moved_at).format(
                              'DD MMM YYYY HH:mm',
                          )
                        : '—'}
                </span>
            ),
        },
        {
            header: 'Type',
            accessorKey: 'move_type',
            cell: (props) => {
                const cfg = moveTypeConfig[props.row.original.move_type]
                return (
                    <Tag className={`text-xs font-semibold ${cfg.className}`}>
                        {cfg.label}
                    </Tag>
                )
            },
        },
        {
            header: 'Item',
            accessorKey: 'item',
            cell: (props) => {
                const item = props.row.original.item
                return item ? (
                    <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {item.name}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                            {item.code}
                        </div>
                    </div>
                ) : (
                    <span className="text-gray-400">—</span>
                )
            },
        },
        {
            header: 'Warehouse',
            accessorKey: 'warehouse',
            cell: (props) => {
                const wh = props.row.original.warehouse
                return wh ? (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {wh.name}
                    </span>
                ) : (
                    <span className="text-gray-400">—</span>
                )
            },
        },
        {
            header: 'Qty',
            accessorKey: 'quantity',
            cell: (props) => {
                const qty = props.row.original.quantity
                const type = props.row.original.move_type
                const color =
                    type === 'in'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : type === 'out'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                return (
                    <span
                        className={`font-mono font-semibold text-sm ${color}`}
                    >
                        {type === 'in' ? '+' : ''}
                        {qty.toFixed(3).replace(/\.?0+$/, '')}
                        {props.row.original.item?.unit
                            ? ` ${props.row.original.item.unit}`
                            : ''}
                    </span>
                )
            },
        },
        {
            header: 'Reference',
            accessorKey: 'reference',
            cell: (props) => (
                <span className="text-sm text-gray-500">
                    {props.row.original.reference || '—'}
                </span>
            ),
        },
        {
            header: 'By',
            accessorKey: 'created_by',
            cell: (props) => (
                <span className="text-sm text-gray-500">
                    {props.row.original.created_by?.name || '—'}
                </span>
            ),
        },
        ...(isAdmin
            ? ([
                  {
                      header: '',
                      id: 'action',
                      cell: (props) => (
                          <div className="flex items-center justify-end">
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
                          </div>
                      ),
                  },
              ] as ColumnDef<StockMove>[])
            : []),
    ]

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <h3>Stock Moves</h3>
                        {canCreate && (
                            <Button
                                variant="solid"
                                icon={<TbPlus className="text-xl" />}
                                onClick={() => {
                                    reset()
                                    setDialogOpen(true)
                                }}
                            >
                                Record Move
                            </Button>
                        )}
                    </div>

                    {/* List-page filters */}
                    <div className="flex flex-wrap gap-3">
                        <div className="w-52">
                            <Select
                                size="sm"
                                placeholder="All items"
                                options={filterItemOptions}
                                value={
                                    filterItemOptions.find(
                                        (o) =>
                                            String(o.value) ===
                                            filterData.item_id,
                                    ) || null
                                }
                                onChange={(opt) => {
                                    setFilterData({
                                        item_id: opt?.value
                                            ? String(opt.value)
                                            : '',
                                    })
                                    const next = cloneDeep(tableData)
                                    next.pageIndex = 1
                                    setTableData(next)
                                }}
                            />
                        </div>
                        <div className="w-52">
                            <Select
                                size="sm"
                                placeholder="All warehouses"
                                options={filterWarehouseOptions}
                                value={
                                    filterWarehouseOptions.find(
                                        (o) =>
                                            String(o.value) ===
                                            filterData.warehouse_id,
                                    ) || null
                                }
                                onChange={(opt) => {
                                    setFilterData({
                                        warehouse_id: opt?.value
                                            ? String(opt.value)
                                            : '',
                                    })
                                    const next = cloneDeep(tableData)
                                    next.pageIndex = 1
                                    setTableData(next)
                                }}
                            />
                        </div>
                        <div className="w-40">
                            <Select
                                size="sm"
                                placeholder="All types"
                                options={filterMoveTypeOptions}
                                value={
                                    filterMoveTypeOptions.find(
                                        (o) => o.value === filterData.move_type,
                                    ) || null
                                }
                                onChange={(opt) => {
                                    setFilterData({
                                        move_type: opt?.value || '',
                                    })
                                    const next = cloneDeep(tableData)
                                    next.pageIndex = 1
                                    setTableData(next)
                                }}
                            />
                        </div>
                    </div>

                    <DataTable
                        columns={columns}
                        data={moveList}
                        noData={!isLoading && moveList.length === 0}
                        loading={isLoading}
                        pagingData={{
                            total: moveListTotal,
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
                </div>
            </AdaptiveCard>

            {/* Record Move Dialog */}
            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onRequestClose={() => setDialogOpen(false)}
            >
                <h5 className="mb-4">Record Stock Move</h5>
                <Form onSubmit={handleSubmit(handleRecordMove)}>
                    <div className="flex flex-col gap-3">
                        {/* Item */}
                        <Controller
                            name="item_id"
                            control={control}
                            rules={{ required: 'Item is required' }}
                            render={({ field }) => (
                                <FormItem
                                    label="Item"
                                    invalid={!!errors.item_id}
                                    errorMessage={
                                        errors.item_id?.message as string
                                    }
                                >
                                    <Select
                                        placeholder="Select item…"
                                        options={itemOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                </FormItem>
                            )}
                        />

                        {/* Move type — pick this before warehouse so filter works */}
                        <Controller
                            name="move_type"
                            control={control}
                            render={({ field }) => (
                                <FormItem label="Move type">
                                    <Select
                                        options={MOVE_TYPE_OPTIONS}
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                </FormItem>
                            )}
                        />

                        {/* Warehouse — filtered based on item + move type */}
                        <Controller
                            name="warehouse_id"
                            control={control}
                            rules={{ required: 'Warehouse is required' }}
                            render={({ field }) => (
                                <FormItem
                                    label="Warehouse"
                                    invalid={!!errors.warehouse_id}
                                    errorMessage={
                                        errors.warehouse_id
                                            ?.message as string
                                    }
                                    extra={
                                        watchedItemId &&
                                        watchedMoveType?.value !== 'in' &&
                                        dialogWarehouseOptions.length <
                                            allWarehouseOptions.length ? (
                                            <span className="text-xs text-gray-400">
                                                Showing only warehouses with
                                                stock of this item
                                            </span>
                                        ) : null
                                    }
                                >
                                    <Select
                                        placeholder={
                                            watchedItemId
                                                ? 'Select warehouse…'
                                                : 'Select item first…'
                                        }
                                        options={dialogWarehouseOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        isDisabled={!watchedItemId}
                                    />
                                </FormItem>
                            )}
                        />

                        {/* Quantity */}
                        <Controller
                            name="quantity"
                            control={control}
                            rules={{
                                required: 'Quantity is required',
                                validate: (v) =>
                                    parseFloat(v) !== 0 || 'Cannot be zero',
                            }}
                            render={({ field }) => (
                                <FormItem
                                    label="Quantity"
                                    invalid={!!errors.quantity}
                                    errorMessage={errors.quantity?.message}
                                >
                                    <Input
                                        {...field}
                                        type="number"
                                        step="0.001"
                                        placeholder="0.000"
                                    />
                                </FormItem>
                            )}
                        />

                        {/* Reference */}
                        <Controller
                            name="reference"
                            control={control}
                            render={({ field }) => (
                                <FormItem label="Reference">
                                    <Input
                                        {...field}
                                        placeholder="PO number, WO code…"
                                    />
                                </FormItem>
                            )}
                        />

                        {/* Notes */}
                        <Controller
                            name="notes"
                            control={control}
                            render={({ field }) => (
                                <FormItem label="Notes">
                                    <Input
                                        {...field}
                                        textArea
                                        rows={2}
                                        placeholder="Optional notes"
                                    />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            type="button"
                            onClick={() => {
                                setDialogOpen(false)
                                reset()
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            type="submit"
                            loading={submitting}
                        >
                            Record
                        </Button>
                    </div>
                </Form>
            </Dialog>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Delete stock move"
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDeleteMove}
            >
                <p>
                    Delete this{' '}
                    <strong>{deleteTarget?.move_type?.toUpperCase()}</strong>{' '}
                    move? This cannot be undone and will affect stock levels.
                </p>
            </ConfirmDialog>
        </Container>
    )
}

export default StockMoveList
