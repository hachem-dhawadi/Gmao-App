import { useState } from 'react'
import type { ReactNode } from 'react'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import PrintLabelDialog from '@/components/shared/PrintLabelDialog'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Skeleton from '@/components/ui/Skeleton'
import Dialog from '@/components/ui/Dialog'
import { apiGetItemById } from '@/services/InventoryService'
import { useNavigate, useParams } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import useSWR from 'swr'
import dayjs from 'dayjs'
import {
    TbArrowNarrowLeft,
    TbPencil,
    TbPackage,
    TbQrcode,
    TbInfoCircle,
    TbFileDescription,
    TbPhoto,
    TbBuildingWarehouse,
} from 'react-icons/tb'
import { HiEye } from 'react-icons/hi'
import type { ItemResponse, StockByWarehouse } from '@/services/InventoryService'

const SectionLabel = ({
    icon,
    title,
    subtitle,
}: {
    icon: ReactNode
    title: string
    subtitle?: string
}) => (
    <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary text-lg flex-shrink-0">
            {icon}
        </div>
        <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{title}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
    </div>
)

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">{value || '—'}</p>
    </div>
)

const StockRow = ({ row }: { row: StockByWarehouse }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
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
            {row.stock_qty.toFixed(3).replace(/\.?0+$/, '')}
        </Tag>
    </div>
)

const ItemDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER])
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
    const [printOpen, setPrintOpen] = useState(false)

    const { data, isLoading } = useSWR(
        id ? ['/inventory/items/detail', id] : null,
        () => apiGetItemById<ItemResponse>(id!),
        { revalidateOnFocus: false },
    )

    const item = data?.data?.item
    const stockByWarehouse = data?.data?.stock_by_warehouse || []
    const totalStock = stockByWarehouse.reduce((s, r) => s + r.stock_qty, 0)
    const isLowStock =
        item?.min_stock !== null &&
        item?.min_stock !== undefined &&
        totalStock <= item.min_stock

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <Skeleton height={220} />
                </AdaptiveCard>
            </Container>
        )
    }

    if (!item) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col items-center justify-center py-12">
                        <h3>Item not found</h3>
                        <Button
                            className="mt-4"
                            onClick={() => navigate('/concepts/inventory/items')}
                        >
                            Back to list
                        </Button>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    const images = item.images ?? []

    return (
        <Container>
            <div className="flex flex-col gap-4">
                {/* Page header */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="plain"
                        icon={<TbArrowNarrowLeft />}
                        onClick={() => navigate('/concepts/inventory/items')}
                    >
                        Back to Items
                    </Button>
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
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start">
                    {/* Left column */}
                    <div className="flex-auto flex flex-col gap-4 min-w-0">
                        {/* Identity */}
                        <AdaptiveCard>
                            <div className="flex items-start gap-5">
                                {images.length > 0 ? (
                                    <img
                                        src={images[0]}
                                        alt={item.name}
                                        className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 cursor-pointer ring-2 ring-gray-100 dark:ring-gray-700 hover:opacity-90 transition-opacity"
                                        onClick={() => setLightboxSrc(images[0])}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-3xl flex-shrink-0">
                                        <TbPackage />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 pt-1">
                                    <h3 className="text-gray-900 dark:text-gray-100 mb-2 leading-tight">
                                        {item.name}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
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
                                    </div>
                                </div>
                            </div>
                        </AdaptiveCard>

                        {/* Item details */}
                        <AdaptiveCard>
                            <SectionLabel
                                icon={<TbInfoCircle />}
                                title="Item Details"
                                subtitle="Specifications and inventory thresholds"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                                <InfoRow label="Barcode / SKU" value={item.barcode ?? ''} />
                                <InfoRow
                                    label="Unit Cost"
                                    value={
                                        item.unit_cost !== null
                                            ? `${item.unit_cost.toFixed(2)}`
                                            : ''
                                    }
                                />
                                <InfoRow
                                    label="Min Stock (alert)"
                                    value={
                                        item.min_stock !== null
                                            ? `${item.min_stock}${item.unit ? ' ' + item.unit : ''}`
                                            : ''
                                    }
                                />
                                <InfoRow
                                    label="Created"
                                    value={
                                        item.created_at
                                            ? dayjs(item.created_at).format('DD MMM YYYY')
                                            : ''
                                    }
                                />
                            </div>
                        </AdaptiveCard>

                        {/* Description */}
                        {item.description && (
                            <AdaptiveCard>
                                <SectionLabel
                                    icon={<TbFileDescription />}
                                    title="Description"
                                    subtitle="Item notes and usage details"
                                />
                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                                    {item.description}
                                </p>
                            </AdaptiveCard>
                        )}

                        {/* Photo gallery */}
                        {images.length > 0 && (
                            <AdaptiveCard>
                                <SectionLabel
                                    icon={<TbPhoto />}
                                    title="Photos"
                                    subtitle={`${images.length} photo${images.length !== 1 ? 's' : ''} attached`}
                                />
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                    {images.map((src, i) => (
                                        <div
                                            key={i}
                                            className="group relative cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600"
                                            onClick={() => setLightboxSrc(src)}
                                        >
                                            <img
                                                src={src}
                                                alt={`${item.name} photo ${i + 1}`}
                                                className="w-full h-28 object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-2xl">
                                                <HiEye />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AdaptiveCard>
                        )}
                    </div>

                    {/* Right sidebar — stock levels */}
                    <div className="md:w-[300px] flex flex-col gap-4 flex-shrink-0">
                        <AdaptiveCard>
                            <SectionLabel
                                icon={<TbBuildingWarehouse />}
                                title="Stock Levels"
                                subtitle="Quantity by warehouse"
                            />

                            {/* Total summary */}
                            <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                    Total Stock
                                </p>
                                <Tag
                                    className={`font-mono text-sm border-0 ${
                                        isLowStock
                                            ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                                            : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    }`}
                                >
                                    {isLowStock && '⚠ '}
                                    {totalStock.toFixed(3).replace(/\.?0+$/, '') || '0'}
                                    {item.unit ? ` ${item.unit}` : ''}
                                </Tag>
                            </div>

                            {stockByWarehouse.length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-4">
                                    No stock recorded yet.
                                </p>
                            ) : (
                                stockByWarehouse.map((row) => (
                                    <StockRow key={row.warehouse_id} row={row} />
                                ))
                            )}
                        </AdaptiveCard>
                    </div>
                </div>
            </div>

            {/* Print label */}
            <PrintLabelDialog
                isOpen={printOpen}
                onClose={() => setPrintOpen(false)}
                type="item"
                name={item.name}
                code={item.code}
                url={window.location.href}
            />

            {/* Lightbox */}
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
        </Container>
    )
}

export default ItemDetails
