import type { ReactNode } from 'react'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Skeleton from '@/components/ui/Skeleton'
import { apiGetWarehouseById } from '@/services/InventoryService'
import { useNavigate, useParams } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import useSWR from 'swr'
import dayjs from 'dayjs'
import {
    TbArrowNarrowLeft,
    TbPencil,
    TbBuildingWarehouse,
    TbMapPin,
    TbAlertTriangle,
    TbPackage,
    TbInfoCircle,
} from 'react-icons/tb'
import type { WarehouseResponse, StockByItem } from '@/services/InventoryService'

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

const ItemStockRow = ({ row }: { row: StockByItem }) => {
    const isLow =
        row.min_stock !== null &&
        row.min_stock !== undefined &&
        row.stock_qty <= (row.min_stock ?? 0)

    return (
        <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {row.item_name || '—'}
                </p>
                <p className="text-xs text-gray-400 font-mono">{row.item_code}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {isLow && (
                    <TbAlertTriangle
                        className="text-amber-500 text-base"
                        title="Below minimum stock"
                    />
                )}
                <Tag
                    className={`font-mono text-xs border-0 ${
                        row.stock_qty > 0
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}
                >
                    {row.stock_qty.toFixed(3).replace(/\.?0+$/, '')}
                    {row.unit ? ` ${row.unit}` : ''}
                </Tag>
            </div>
        </div>
    )
}

const WarehouseDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER])

    const { data, isLoading } = useSWR(
        id ? ['/inventory/warehouses/detail', id] : null,
        () => apiGetWarehouseById<WarehouseResponse>(id!),
        { revalidateOnFocus: false },
    )

    const warehouse = data?.data?.warehouse
    const stockByItem = data?.data?.stock_by_item || []
    const lowStockCount = stockByItem.filter(
        (r) => r.min_stock !== null && r.min_stock !== undefined && r.stock_qty <= r.min_stock,
    ).length

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <Skeleton height={220} />
                </AdaptiveCard>
            </Container>
        )
    }

    if (!warehouse) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col items-center justify-center py-12">
                        <h3>Warehouse not found</h3>
                        <Button
                            className="mt-4"
                            onClick={() => navigate('/concepts/inventory/warehouses')}
                        >
                            Back to list
                        </Button>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    const fmt = (d: string | null | undefined) =>
        d ? dayjs(d).format('DD MMM YYYY') : '—'

    return (
        <Container>
            <div className="flex flex-col gap-4">
                {/* Page header */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="plain"
                        icon={<TbArrowNarrowLeft />}
                        onClick={() => navigate('/concepts/inventory/warehouses')}
                    >
                        Back to Warehouses
                    </Button>
                    {canEdit && (
                        <Button
                            variant="solid"
                            icon={<TbPencil />}
                            onClick={() =>
                                navigate(
                                    `/concepts/inventory/warehouses/warehouse-edit/${warehouse.id}`,
                                )
                            }
                        >
                            Edit
                        </Button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start">
                    {/* Left column */}
                    <div className="flex-auto flex flex-col gap-4 min-w-0">
                        {/* Identity */}
                        <AdaptiveCard>
                            <div className="flex items-start gap-5">
                                <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-3xl flex-shrink-0">
                                    <TbBuildingWarehouse />
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <h3 className="text-gray-900 dark:text-gray-100 mb-2 leading-tight">
                                        {warehouse.name}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs border-0">
                                            {warehouse.code}
                                        </Tag>
                                        <Tag className="bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs border-0">
                                            Warehouse
                                        </Tag>
                                    </div>
                                </div>
                            </div>
                        </AdaptiveCard>

                        {/* Details */}
                        <AdaptiveCard>
                            <SectionLabel
                                icon={<TbInfoCircle />}
                                title="Warehouse Details"
                                subtitle="Location and administrative information"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                                {warehouse.location && (
                                    <div className="sm:col-span-2">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                            Location
                                        </p>
                                        <div className="flex items-start gap-2">
                                            <TbMapPin className="text-gray-400 text-base mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                {warehouse.location}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <InfoRow label="Created" value={fmt(warehouse.created_at)} />
                                <InfoRow label="Last Updated" value={fmt(warehouse.updated_at)} />
                            </div>
                        </AdaptiveCard>
                    </div>

                    {/* Right sidebar — inventory */}
                    <div className="md:w-[340px] flex flex-col gap-4 flex-shrink-0">
                        <AdaptiveCard>
                            <SectionLabel
                                icon={<TbPackage />}
                                title="Items Stocked Here"
                                subtitle="Current inventory levels"
                            />

                            {/* Summary row */}
                            <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                    {stockByItem.length} item
                                    {stockByItem.length !== 1 ? 's' : ''}
                                </p>
                                {lowStockCount > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <TbAlertTriangle className="text-amber-500 text-sm" />
                                        <span className="text-xs font-medium text-amber-500">
                                            {lowStockCount} low stock
                                        </span>
                                    </div>
                                )}
                            </div>

                            {stockByItem.length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-4">
                                    No stock recorded in this warehouse yet.
                                </p>
                            ) : (
                                stockByItem.map((row) => (
                                    <ItemStockRow key={row.item_id} row={row} />
                                ))
                            )}
                        </AdaptiveCard>
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default WarehouseDetails
