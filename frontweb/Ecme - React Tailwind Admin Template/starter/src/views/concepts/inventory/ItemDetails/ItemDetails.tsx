import { useState } from 'react'
import type { ReactNode } from 'react'
import Loading from '@/components/shared/Loading'
import PrintLabelDialog from '@/components/shared/PrintLabelDialog'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { apiGetItemById } from '@/services/InventoryService'
import { useNavigate, useParams } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import useSWR from 'swr'
import dayjs from 'dayjs'
import {
    TbArrowNarrowLeft,
    TbPencil,
    TbQrcode,
    TbPackage,
    TbBuildingWarehouse,
    TbAlertTriangle,
} from 'react-icons/tb'
import { HiEye } from 'react-icons/hi'
import type { ItemResponse, StockByWarehouse } from '@/services/InventoryService'

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="flex items-center justify-between">
        <span className="text-gray-500 font-semibold">{label}</span>
        <span className="font-semibold">{value}</span>
    </div>
)

const StockRow = ({ row }: { row: StockByWarehouse }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <div className="min-w-0">
            <p className="text-sm font-semibold heading-text truncate">
                {row.warehouse_name || '—'}
            </p>
            <p className="text-xs text-gray-400 font-mono">{row.warehouse_code}</p>
        </div>
        <Tag
            className={`font-mono text-xs border-0 flex-shrink-0 ml-3 ${
                row.stock_qty > 0
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
            }`}
        >
            {row.stock_qty.toFixed(3).replace(/\.?0+$/, '') || '0'}
        </Tag>
    </div>
)

const ItemDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, ['inventory.write', 'admin', 'manager'])
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
    const [printOpen, setPrintOpen] = useState(false)

    const { data, isLoading } = useSWR(
        id ? ['/inventory/items/detail', id] : null,
        () => apiGetItemById<ItemResponse>(id!),
        { revalidateOnFocus: false },
    )

    const item = data?.data?.item
    const stockByWarehouse = data?.data?.stock_by_warehouse ?? []
    const totalStock = stockByWarehouse.reduce((s, r) => s + r.stock_qty, 0)
    const isLowStock =
        item?.min_stock !== null &&
        item?.min_stock !== undefined &&
        totalStock <= item.min_stock

    const images = item?.images ?? []

    return (
        <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <Button
                    variant="plain"
                    icon={<TbArrowNarrowLeft />}
                    onClick={() => navigate('/concepts/inventory/items')}
                >
                    Back to Items
                </Button>
                {item && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="default"
                            icon={<TbQrcode />}
                            onClick={() => setPrintOpen(true)}
                        >
                            Print Label
                        </Button>
                        {canEdit && (
                            <Button
                                variant="solid"
                                icon={<TbPencil />}
                                onClick={() =>
                                    navigate(
                                        `/concepts/inventory/items/item-edit/${item.id}`,
                                    )
                                }
                            >
                                Edit
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <Loading loading={isLoading}>
                {!item && !isLoading ? (
                    <Card>
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl text-gray-300">
                                <TbPackage />
                            </div>
                            <h3 className="text-gray-500">Item not found</h3>
                            <Button
                                onClick={() =>
                                    navigate('/concepts/inventory/items')
                                }
                            >
                                Back to list
                            </Button>
                        </div>
                    </Card>
                ) : (
                    item && (
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* ── Left column ── */}
                            <div className="gap-4 flex flex-col flex-auto">
                                {/* Identity */}
                                <Card>
                                    <div className="flex items-center gap-4">
                                        {images.length > 0 ? (
                                            <img
                                                src={images[0]}
                                                alt={item.name}
                                                className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 cursor-pointer ring-2 ring-gray-100 dark:ring-gray-700 hover:opacity-90 transition-opacity"
                                                onClick={() =>
                                                    setLightboxSrc(images[0])
                                                }
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 text-3xl flex-shrink-0">
                                                <TbPackage />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs border-0">
                                                    {item.code}
                                                </Tag>
                                                {item.unit && (
                                                    <Tag className="bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs border-0">
                                                        {item.unit}
                                                    </Tag>
                                                )}
                                                {!item.is_stocked && (
                                                    <Tag className="bg-gray-100 dark:bg-gray-700 text-gray-400 text-xs border-0">
                                                        Not stocked
                                                    </Tag>
                                                )}
                                                {isLowStock && (
                                                    <Tag className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs border-0 flex items-center gap-1">
                                                        <TbAlertTriangle className="text-xs" />
                                                        Low stock
                                                    </Tag>
                                                )}
                                            </div>
                                            <h4 className="leading-tight">
                                                {item.name}
                                            </h4>
                                        </div>
                                    </div>
                                </Card>

                                {/* Item Specifications */}
                                <Card>
                                    <h4 className="mb-4">Specifications</h4>
                                    <div className="flex flex-col gap-4 text-sm">
                                        <InfoRow
                                            label="Barcode / SKU"
                                            value={
                                                item.barcode ? (
                                                    <span className="font-mono">
                                                        {item.barcode}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )
                                            }
                                        />
                                        <InfoRow
                                            label="Unit of Measure"
                                            value={item.unit || '—'}
                                        />
                                        <InfoRow
                                            label="Unit Cost"
                                            value={
                                                item.unit_cost !== null
                                                    ? `$${item.unit_cost.toFixed(2)}`
                                                    : '—'
                                            }
                                        />
                                        <InfoRow
                                            label="Min Stock (alert)"
                                            value={
                                                item.min_stock !== null
                                                    ? `${item.min_stock}${item.unit ? ' ' + item.unit : ''}`
                                                    : '—'
                                            }
                                        />
                                        <hr />
                                        <InfoRow
                                            label="Created"
                                            value={
                                                item.created_at
                                                    ? dayjs(
                                                          item.created_at,
                                                      ).format('DD MMM YYYY')
                                                    : '—'
                                            }
                                        />
                                    </div>
                                </Card>

                                {/* Description */}
                                {item.description && (
                                    <Card>
                                        <h4 className="mb-4">Description</h4>
                                        <div className="rounded-xl p-4 bg-gray-50 dark:bg-gray-700 text-sm leading-relaxed">
                                            {item.description}
                                        </div>
                                    </Card>
                                )}

                                {/* Photo gallery */}
                                {images.length > 0 && (
                                    <Card>
                                        <h4 className="mb-4">
                                            Photos{' '}
                                            <span className="text-sm font-normal text-gray-400">
                                                ({images.length})
                                            </span>
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {images.map((src, i) => (
                                                <div
                                                    key={i}
                                                    className="group relative cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 aspect-square"
                                                    onClick={() =>
                                                        setLightboxSrc(src)
                                                    }
                                                >
                                                    <img
                                                        src={src}
                                                        alt={`${item.name} ${i + 1}`}
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-2xl">
                                                        <HiEye />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </div>

                            {/* ── Right column ── */}
                            <div className="lg:w-[300px] xl:w-[360px] gap-4 flex flex-col">
                                {/* Stock Levels */}
                                <Card>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4>Stock Levels</h4>
                                        <TbBuildingWarehouse className="text-xl text-gray-400" />
                                    </div>

                                    {/* Total */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700 mb-4">
                                        <span className="text-sm text-gray-500 font-semibold">
                                            Total
                                        </span>
                                        <Tag
                                            className={`font-mono text-sm border-0 ${
                                                isLowStock
                                                    ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                                                    : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                            }`}
                                        >
                                            {isLowStock && '⚠ '}
                                            {totalStock
                                                .toFixed(3)
                                                .replace(/\.?0+$/, '') || '0'}
                                            {item.unit
                                                ? ` ${item.unit}`
                                                : ''}
                                        </Tag>
                                    </div>

                                    {stockByWarehouse.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic text-center py-4">
                                            No stock recorded yet.
                                        </p>
                                    ) : (
                                        stockByWarehouse.map((row) => (
                                            <StockRow
                                                key={row.warehouse_id}
                                                row={row}
                                            />
                                        ))
                                    )}
                                </Card>

                                {/* Low stock warning */}
                                {isLowStock && (
                                    <Card>
                                        <div className="flex items-start gap-3 text-amber-600 dark:text-amber-400">
                                            <TbAlertTriangle className="text-xl mt-0.5 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-sm">
                                                    Low stock alert
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Total stock ({totalStock}{' '}
                                                    {item.unit}) is at or below
                                                    the minimum threshold (
                                                    {item.min_stock}{' '}
                                                    {item.unit}).
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )
                )}
            </Loading>

            {item && (
                <PrintLabelDialog
                    isOpen={printOpen}
                    onClose={() => setPrintOpen(false)}
                    type="item"
                    name={item.name}
                    code={item.code}
                    url={window.location.href}
                />
            )}

            <Dialog
                isOpen={!!lightboxSrc}
                onClose={() => setLightboxSrc(null)}
                onRequestClose={() => setLightboxSrc(null)}
                width={800}
            >
                <img
                    src={lightboxSrc ?? ''}
                    alt="Preview"
                    className="w-full rounded-lg"
                />
            </Dialog>
        </>
    )
}

export default ItemDetails
