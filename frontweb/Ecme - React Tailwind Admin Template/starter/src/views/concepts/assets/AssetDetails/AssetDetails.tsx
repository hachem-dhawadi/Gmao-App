import { useState } from 'react'
import type { ReactNode } from 'react'
import Loading from '@/components/shared/Loading'
import PrintLabelDialog from '@/components/shared/PrintLabelDialog'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { apiGetAssetById } from '@/services/AssetsService'
import { useNavigate, useParams } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import useSWR from 'swr'
import dayjs from 'dayjs'
import {
    TbArrowNarrowLeft,
    TbPencil,
    TbQrcode,
    TbEngine,
    TbShieldCheck,
    TbShieldOff,
    TbAlertTriangle,
    TbMapPin,
} from 'react-icons/tb'
import { HiEye } from 'react-icons/hi'
import type { AssetResponse } from '@/services/AssetsService'
import type { Asset } from '../AssetList/types'

const statusConfig: Record<
    Asset['status'],
    { label: string; bgClass: string; textClass: string; dot: string }
> = {
    active: {
        label: 'Active',
        bgClass: 'bg-emerald-100 dark:bg-emerald-500/20',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    inactive: {
        label: 'Inactive',
        bgClass: 'bg-gray-100 dark:bg-gray-700',
        textClass: 'text-gray-500 dark:text-gray-400',
        dot: 'bg-gray-400',
    },
    under_maintenance: {
        label: 'Under Maintenance',
        bgClass: 'bg-amber-100 dark:bg-amber-500/20',
        textClass: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
    decommissioned: {
        label: 'Decommissioned',
        bgClass: 'bg-red-100 dark:bg-red-500/20',
        textClass: 'text-red-600 dark:text-red-400',
        dot: 'bg-red-500',
    },
}

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="flex items-center justify-between">
        <span className="text-gray-500 font-semibold">{label}</span>
        <span className="font-semibold">{value}</span>
    </div>
)

const WarrantyStatus = ({ date }: { date: string | null }) => {
    if (!date) {
        return (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <TbShieldOff className="text-gray-400 text-xl shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-gray-500">No warranty info</p>
                    <p className="text-xs text-gray-400">Not recorded</p>
                </div>
            </div>
        )
    }

    const end = dayjs(date)
    const daysLeft = end.diff(dayjs(), 'day')
    const progress = Math.max(0, Math.min(100, (daysLeft / 365) * 100))

    if (daysLeft < 0) {
        return (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                <TbShieldOff className="text-xl mt-0.5 shrink-0" />
                <div className="flex-1">
                    <p className="text-sm font-semibold">Expired</p>
                    <p className="text-xs text-gray-400">
                        Expired {end.format('DD MMM YYYY')}
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-red-200 dark:bg-red-500/20">
                        <div className="h-full w-0 rounded-full bg-red-500" />
                    </div>
                </div>
            </div>
        )
    }

    if (daysLeft <= 30) {
        return (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <TbAlertTriangle className="text-xl mt-0.5 shrink-0" />
                <div className="flex-1">
                    <p className="text-sm font-semibold">
                        Expiring in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                        Expires {end.format('DD MMM YYYY')}
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-amber-200 dark:bg-amber-500/20">
                        <div
                            className="h-full rounded-full bg-amber-500 transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TbShieldCheck className="text-xl mt-0.5 shrink-0" />
            <div className="flex-1">
                <p className="text-sm font-semibold">
                    Valid &middot; {daysLeft} days left
                </p>
                <p className="text-xs text-gray-400">
                    Expires {end.format('DD MMM YYYY')}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-emerald-200 dark:bg-emerald-500/20">
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    )
}

const AssetDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER])
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
    const [printOpen, setPrintOpen] = useState(false)

    const { data, isLoading } = useSWR<Asset>(
        id ? ['/assets/details', id] : null,
        async () => {
            const resp = await apiGetAssetById<AssetResponse>(id!)
            return resp.data.asset
        },
        { revalidateOnFocus: false },
    )

    const cfg = data ? (statusConfig[data.status] ?? statusConfig.active) : null
    const photos = data?.images ?? []
    const fmt = (d: string | null | undefined) =>
        d ? dayjs(d).format('DD MMM YYYY') : '—'

    return (
        <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <Button
                    variant="plain"
                    icon={<TbArrowNarrowLeft />}
                    onClick={() => navigate('/concepts/assets/asset-list')}
                >
                    Back to Assets
                </Button>
                {data && (
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
                                        `/concepts/assets/asset-edit/${data.id}`,
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
                {!data && !isLoading ? (
                    <Card>
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl text-gray-300">
                                <TbEngine />
                            </div>
                            <h3 className="text-gray-500">Asset not found</h3>
                            <Button
                                onClick={() =>
                                    navigate('/concepts/assets/asset-list')
                                }
                            >
                                Back to list
                            </Button>
                        </div>
                    </Card>
                ) : (
                    data &&
                    cfg && (
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* ── Left column ── */}
                            <div className="gap-4 flex flex-col flex-auto">
                                {/* Identity */}
                                <Card>
                                    <div className="flex items-start gap-4">
                                        {photos.length > 0 ? (
                                            <img
                                                src={photos[0]}
                                                alt={data.name}
                                                className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 cursor-pointer ring-2 ring-gray-100 dark:ring-gray-700 hover:opacity-90 transition-opacity"
                                                onClick={() =>
                                                    setLightboxSrc(photos[0])
                                                }
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400 text-3xl flex-shrink-0">
                                                <TbEngine />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs border-0">
                                                    {data.code}
                                                </Tag>
                                                <Tag
                                                    className={`border-0 ${cfg.bgClass}`}
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <span
                                                            className={`inline-block w-2 h-2 rounded-full ${cfg.dot}`}
                                                        />
                                                        <span
                                                            className={`font-semibold ${cfg.textClass}`}
                                                        >
                                                            {cfg.label}
                                                        </span>
                                                    </span>
                                                </Tag>
                                                {data.asset_type && (
                                                    <Tag className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs border-0">
                                                        {data.asset_type.name}
                                                    </Tag>
                                                )}
                                            </div>
                                            <h4 className="leading-tight mb-1">
                                                {data.name}
                                            </h4>
                                            {data.location && (
                                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                                    <TbMapPin className="text-base" />
                                                    {data.location}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Card>

                                {/* Technical Specs */}
                                <Card>
                                    <h4 className="mb-4">Technical Specs</h4>
                                    <div className="flex flex-col gap-4 text-sm">
                                        <InfoRow
                                            label="Serial Number"
                                            value={data.serial_number || '—'}
                                        />
                                        <InfoRow
                                            label="Manufacturer"
                                            value={data.manufacturer || '—'}
                                        />
                                        <InfoRow
                                            label="Model"
                                            value={data.model || '—'}
                                        />
                                        <InfoRow
                                            label="Location"
                                            value={data.location || '—'}
                                        />
                                        {data.address_label && (
                                            <InfoRow
                                                label="Zone / Address"
                                                value={data.address_label}
                                            />
                                        )}
                                        <InfoRow
                                            label="Installed"
                                            value={fmt(data.installed_at)}
                                        />
                                    </div>
                                </Card>

                                {/* Notes */}
                                {data.notes && (
                                    <Card>
                                        <h4 className="mb-4">Notes</h4>
                                        <div className="rounded-xl p-4 bg-gray-50 dark:bg-gray-700 text-sm leading-relaxed">
                                            {data.notes}
                                        </div>
                                    </Card>
                                )}

                                {/* Photo gallery */}
                                {photos.length > 0 && (
                                    <Card>
                                        <h4 className="mb-4">
                                            Photos{' '}
                                            <span className="text-sm font-normal text-gray-400">
                                                ({photos.length})
                                            </span>
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {photos.map((src, i) => (
                                                <div
                                                    key={i}
                                                    className="group relative cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 aspect-square"
                                                    onClick={() =>
                                                        setLightboxSrc(src)
                                                    }
                                                >
                                                    <img
                                                        src={src}
                                                        alt={`${data.name} ${i + 1}`}
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
                                {/* Warranty */}
                                <Card>
                                    <h4 className="mb-4">Warranty</h4>
                                    <WarrantyStatus date={data.warranty_end_at} />
                                </Card>

                                {/* Lifecycle */}
                                <Card>
                                    <h4 className="mb-4">Lifecycle</h4>
                                    <div className="flex flex-col gap-4 text-sm">
                                        <InfoRow
                                            label="Purchase Date"
                                            value={fmt(data.purchase_date)}
                                        />
                                        <InfoRow
                                            label="Installed"
                                            value={fmt(data.installed_at)}
                                        />
                                        <hr />
                                        <InfoRow
                                            label="Created"
                                            value={fmt(data.created_at)}
                                        />
                                        <InfoRow
                                            label="Last updated"
                                            value={fmt(data.updated_at)}
                                        />
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )
                )}
            </Loading>

            {data && (
                <PrintLabelDialog
                    isOpen={printOpen}
                    onClose={() => setPrintOpen(false)}
                    type="asset"
                    name={data.name}
                    code={data.code}
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
                    className="w-full rounded-lg"
                    src={lightboxSrc ?? ''}
                    alt="Asset photo"
                />
            </Dialog>
        </>
    )
}

export default AssetDetails
