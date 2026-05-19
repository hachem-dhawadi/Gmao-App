import type { ReactNode } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
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
    TbCalendar,
    TbRefresh,
    TbHash,
} from 'react-icons/tb'
import type { WarehouseResponse, StockByItem } from '@/services/InventoryService'

const InfoField = ({
    icon,
    title,
    children,
}: {
    icon: ReactNode
    title: string
    children: ReactNode
}) => (
    <div className="flex items-center mb-2 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 min-w-[160px]">
            <span className="text-lg text-gray-400">{icon}</span>
            <span className="text-sm">{title}</span>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-300">
            {children}
        </span>
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
                <p className="text-sm font-semibold heading-text truncate">
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
                    {row.stock_qty.toFixed(3).replace(/\.?0+$/, '') || '0'}
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
    const stockByItem = data?.data?.stock_by_item ?? []
    const lowStockCount = stockByItem.filter(
        (r) =>
            r.min_stock !== null &&
            r.min_stock !== undefined &&
            r.stock_qty <= r.min_stock,
    ).length

    const fmt = (d: string | null | undefined) =>
        d ? dayjs(d).format('DD MMM YYYY') : '—'

    return (
        <AdaptiveCard>
            <Loading loading={isLoading}>
                {!warehouse && !isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl text-gray-300">
                            <TbBuildingWarehouse />
                        </div>
                        <h3 className="text-gray-500">Warehouse not found</h3>
                        <Button
                            onClick={() =>
                                navigate('/concepts/inventory/warehouses')
                            }
                        >
                            Back to list
                        </Button>
                    </div>
                ) : (
                    warehouse && (
                        <>
                            {/* Toolbar */}
                            <div className="flex items-center justify-between mb-6">
                                <Button
                                    variant="plain"
                                    icon={<TbArrowNarrowLeft />}
                                    onClick={() =>
                                        navigate(
                                            '/concepts/inventory/warehouses',
                                        )
                                    }
                                >
                                    Back to Warehouses
                                </Button>
                                {canEdit && (
                                    <Button
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

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                {/* ── Left — identity + info ── */}
                                <div className="xl:col-span-2 px-2">
                                    {/* Identity */}
                                    <div className="flex items-start gap-4 mb-8">
                                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-2xl flex-shrink-0">
                                            <TbBuildingWarehouse />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Tag className="bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-mono text-sm border-0">
                                                    {warehouse.code}
                                                </Tag>
                                                <Tag className="bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs border-0">
                                                    Warehouse
                                                </Tag>
                                            </div>
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                                {warehouse.name}
                                            </h2>
                                        </div>
                                    </div>

                                    {/* Info fields */}
                                    <div className="flex flex-col">
                                        <InfoField
                                            icon={<TbHash />}
                                            title="Code"
                                        >
                                            <span className="font-mono font-bold">
                                                {warehouse.code || '—'}
                                            </span>
                                        </InfoField>
                                        <InfoField
                                            icon={<TbMapPin />}
                                            title="Location"
                                        >
                                            {warehouse.location || '—'}
                                        </InfoField>
                                        <InfoField
                                            icon={<TbCalendar />}
                                            title="Created"
                                        >
                                            {fmt(warehouse.created_at)}
                                        </InfoField>
                                        <InfoField
                                            icon={<TbRefresh />}
                                            title="Last Updated"
                                        >
                                            {fmt(warehouse.updated_at)}
                                        </InfoField>
                                    </div>
                                </div>

                                {/* ── Right — stock ── */}
                                <div className="xl:col-span-1">
                                    {/* Summary */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700 mb-4">
                                        <span className="text-sm text-gray-500 font-semibold">
                                            {stockByItem.length} item
                                            {stockByItem.length !== 1
                                                ? 's'
                                                : ''}{' '}
                                            stocked
                                        </span>
                                        {lowStockCount > 0 && (
                                            <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                                                <TbAlertTriangle />
                                                {lowStockCount} low stock
                                            </span>
                                        )}
                                    </div>

                                    {/* Items */}
                                    {stockByItem.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic text-center py-6">
                                            No stock recorded yet.
                                        </p>
                                    ) : (
                                        stockByItem.map((row) => (
                                            <ItemStockRow
                                                key={row.item_id}
                                                row={row}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )
                )}
            </Loading>
        </AdaptiveCard>
    )
}

export default WarehouseDetails
