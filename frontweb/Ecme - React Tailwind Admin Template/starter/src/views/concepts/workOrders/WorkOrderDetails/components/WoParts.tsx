import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { Form, FormItem } from '@/components/ui/Form'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { TbPlus, TbPackage, TbTool } from 'react-icons/tb'
import {
    apiGetItemsList,
    apiGetWarehousesList,
    apiGetItemById,
} from '@/services/InventoryService'
import {
    apiGetWoParts,
    apiRecordWoPart,
} from '@/services/WorkOrdersService'
import type {
    ItemsListResponse,
    WarehousesListResponse,
    ItemResponse,
} from '@/services/InventoryService'

type UsageType = 'used' | 'scrapped'

type PartFormSchema = {
    item_id: { value: number; label: string } | null
    warehouse_id: { value: number; label: string } | null
    usage_type: { value: UsageType; label: string }
    quantity: string
    notes: string
}

const USAGE_OPTIONS = [
    { value: 'used' as const, label: 'Used — consumed during work' },
    { value: 'scrapped' as const, label: 'Scrapped — broken / damaged' },
]

const usageTag: Record<UsageType, { label: string; className: string }> = {
    used:     { label: 'USED',     className: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0' },
    scrapped: { label: 'SCRAPPED', className: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0' },
}

type WoPartsProps = {
    workOrderId: number
    woCode: string
    canEdit: boolean
}

const WoParts = ({ workOrderId, woCode, canEdit }: WoPartsProps) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const { t } = useTranslation()

    const { data: partsData, mutate } = useSWR(
        [`/wo-parts/${workOrderId}`],
        () => apiGetWoParts(workOrderId),
        { revalidateOnFocus: false },
    )
    const parts = partsData?.data?.parts || []

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

    const itemOptions = itemsData?.data?.items
        ?.filter((i) => i.is_stocked)
        .map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` })) ?? []

    const allWarehouseOptions = warehousesData?.data?.warehouses
        ?.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` })) ?? []

    const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<PartFormSchema>({
        defaultValues: {
            item_id: null,
            warehouse_id: null,
            usage_type: USAGE_OPTIONS[0],
            quantity: '',
            notes: '',
        },
    })

    const watchedItemId      = useWatch({ control, name: 'item_id' })
    const watchedWarehouseId = useWatch({ control, name: 'warehouse_id' })
    const watchedQuantity    = useWatch({ control, name: 'quantity' })

    const { data: itemDetail } = useSWR(
        watchedItemId && dialogOpen ? [`/wo-parts-item/${watchedItemId.value}`] : null,
        () => apiGetItemById<ItemResponse>(watchedItemId!.value),
        { revalidateOnFocus: false },
    )

    const currentWarehouseStock = useMemo(() => {
        if (!watchedItemId || !watchedWarehouseId) return null
        const entry = itemDetail?.data?.stock_by_warehouse?.find(
            (s) => s.warehouse_id === watchedWarehouseId.value,
        )
        return entry ? Math.max(0, entry.stock_qty) : 0
    }, [watchedItemId, watchedWarehouseId, itemDetail])

    const warehouseOptions = useMemo(() => {
        if (!watchedItemId || !itemDetail) return allWarehouseOptions
        const withStock = itemDetail.data?.stock_by_warehouse
            ?.filter((s) => s.stock_qty > 0)
            .map((s) => s.warehouse_id) ?? []
        if (withStock.length === 0) return allWarehouseOptions
        return allWarehouseOptions.filter((o) => withStock.includes(o.value))
    }, [watchedItemId, itemDetail, allWarehouseOptions])

    const typed     = parseFloat(watchedQuantity)
    const unit      = itemDetail?.data?.item?.unit ?? 'units'
    const remaining = currentWarehouseStock !== null && !isNaN(typed) && typed > 0
        ? Math.max(0, currentWarehouseStock - typed)
        : null

    const openDialog = () => { reset(); setDialogOpen(true) }
    const closeDialog = () => { setDialogOpen(false); reset() }

    const onSubmit = async (values: PartFormSchema) => {
        if (!values.item_id || !values.warehouse_id) return
        const qty = parseFloat(values.quantity)
        if (!qty || qty <= 0) return

        try {
            setSubmitting(true)
            const isScrap = values.usage_type.value === 'scrapped'
            const autoNote = isScrap
                ? `Scrapped during ${woCode}${values.notes ? ` — ${values.notes}` : ''}`
                : values.notes || null

            await apiRecordWoPart(workOrderId, {
                item_id:      values.item_id.value,
                warehouse_id: values.warehouse_id.value,
                usage_type:   values.usage_type.value,
                quantity:     qty,
                notes:        values.notes || null,
            })

            await mutate()
            toast.push(<Notification type="success">{t('wo.toast.partRecorded')}</Notification>, { placement: 'top-center' })
            closeDialog()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? t('wo.toast.partFailed')
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                    <h5 className="flex items-center gap-2">
                        <TbPackage className="text-xl text-primary" />
                        Parts Used
                        {parts.length > 0 && (
                            <span className="text-sm font-normal text-gray-400">({parts.length})</span>
                        )}
                    </h5>
                    {canEdit && (
                        <Button size="sm" variant="twoTone" icon={<TbPlus />} onClick={openDialog}>
                            Add Part
                        </Button>
                    )}
                </div>

                {parts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <TbTool className="text-3xl opacity-40" />
                        <p className="text-sm font-semibold">No parts recorded yet</p>
                        {canEdit && (
                            <p className="text-xs text-center max-w-xs">
                                Click "Add Part" to record parts used or scrapped on this work order.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {parts.map((part) => {
                            const isScrap = part.move_type === 'adjustment' && part.quantity < 0
                            const type: UsageType = isScrap ? 'scrapped' : 'used'
                            const cfg = usageTag[type]
                            const absQty = Math.abs(part.quantity)

                            return (
                                <div key={part.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                                                {part.item?.name ?? '—'}
                                            </span>
                                            <span className="text-xs font-mono text-gray-400">{part.item?.code}</span>
                                            <Tag className={`text-xs ${cfg.className}`}>{cfg.label}</Tag>
                                        </div>
                                        {part.notes && (
                                            <p className="text-xs text-gray-400 mt-0.5">{part.notes}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                        <span className={`font-mono font-bold text-sm ${isScrap ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                            {absQty} {part.item?.unit ?? 'units'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {part.warehouse?.name} · {part.created_by?.name ?? '—'}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <Dialog isOpen={dialogOpen} onClose={closeDialog} onRequestClose={closeDialog}>
                <h5 className="mb-4">Record Part</h5>
                <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-1">

                        <Controller
                            name="item_id"
                            control={control}
                            rules={{ required: 'Item is required' }}
                            render={({ field }) => (
                                <FormItem label="Item" invalid={!!errors.item_id} errorMessage={errors.item_id?.message as string}>
                                    <Select
                                        placeholder="Select item…"
                                        options={itemOptions}
                                        value={field.value}
                                        onChange={(val) => {
                                            field.onChange(val)
                                            setValue('warehouse_id', null)
                                        }}
                                    />
                                </FormItem>
                            )}
                        />

                        <Controller
                            name="usage_type"
                            control={control}
                            render={({ field }) => (
                                <FormItem label="What happened to this part?">
                                    <Select options={USAGE_OPTIONS} value={field.value} onChange={field.onChange} />
                                </FormItem>
                            )}
                        />

                        <Controller
                            name="warehouse_id"
                            control={control}
                            rules={{ required: 'Warehouse is required' }}
                            render={({ field }) => (
                                <FormItem
                                    label="Warehouse"
                                    invalid={!!errors.warehouse_id}
                                    errorMessage={errors.warehouse_id?.message as string}
                                >
                                    <Select
                                        placeholder={watchedItemId ? 'Select warehouse…' : 'Select item first…'}
                                        options={warehouseOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        isDisabled={!watchedItemId}
                                    />
                                </FormItem>
                            )}
                        />

                        <Controller
                            name="quantity"
                            control={control}
                            rules={{
                                required: 'Quantity is required',
                                validate: (v) => {
                                    const n = parseFloat(v)
                                    if (isNaN(n) || n <= 0) return 'Must be a positive number'
                                    if (currentWarehouseStock !== null && n > currentWarehouseStock)
                                        return `Maximum available is ${currentWarehouseStock}`
                                    return true
                                },
                            }}
                            render={({ field }) => (
                                <div className="flex flex-col gap-2">
                                    <FormItem label="Quantity" invalid={!!errors.quantity} errorMessage={errors.quantity?.message}>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.001"
                                            min="0.001"
                                            placeholder="0.000"
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault() }}
                                        />
                                    </FormItem>

                                    {currentWarehouseStock !== null && (
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 px-4 py-3 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Current stock (this warehouse)</span>
                                                <span className={`text-sm font-bold ${currentWarehouseStock === 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {currentWarehouseStock} {unit}
                                                </span>
                                            </div>
                                            {remaining !== null && (
                                                <>
                                                    <div className="border-t border-gray-200 dark:border-gray-600" />
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">Remaining after this move</span>
                                                        <span className={`text-sm font-bold ${remaining === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                                            {remaining} {unit}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        />

                        <Controller
                            name="notes"
                            control={control}
                            render={({ field }) => (
                                <FormItem label="Notes (optional)">
                                    <Input {...field} textArea rows={2} placeholder="e.g. Bearing cracked during press-fit…" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
                        <Button type="button" onClick={closeDialog}>Cancel</Button>
                        <Button variant="solid" type="submit" loading={submitting}>Record</Button>
                    </div>
                </Form>
            </Dialog>
        </>
    )
}

export default WoParts
