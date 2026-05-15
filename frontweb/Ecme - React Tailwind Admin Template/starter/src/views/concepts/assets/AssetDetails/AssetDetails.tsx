import { useState } from 'react'
import type { ReactNode } from 'react'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Skeleton from '@/components/ui/Skeleton'
import Dialog from '@/components/ui/Dialog'
import PrintLabelDialog from '@/components/shared/PrintLabelDialog'
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
    TbCalendar,
    TbShieldCheck,
    TbShieldOff,
    TbAlertTriangle,
    TbFileDescription,
    TbPhoto,
    TbMapPin,
} from 'react-icons/tb'
import { HiEye } from 'react-icons/hi'
import type { AssetResponse } from '@/services/AssetsService'
import type { Asset } from '../AssetList/types'

const statusConfig: Record<Asset['status'], { label: string; className: string }> = {
    active: {
        label: 'Active',
        className: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    },
    inactive: {
        label: 'Inactive',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    },
    under_maintenance: {
        label: 'Under Maintenance',
        className: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    },
    decommissioned: {
        label: 'Decommissioned',
        className: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
    },
}

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

const WarrantyStatus = ({ date }: { date: string | null }) => {
    if (!date) return <p className="text-sm text-gray-400 italic">No warranty info</p>
    const end = dayjs(date)
    const daysLeft = end.diff(dayjs(), 'day')

    if (daysLeft < 0) {
        return (
            <div className="flex items-center gap-2">
                <TbShieldOff className="text-red-500 text-base flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-red-500">Expired</p>
                    <p className="text-xs text-gray-400">{end.format('DD MMM YYYY')}</p>
                </div>
            </div>
        )
    }
    if (daysLeft <= 30) {
        return (
            <div className="flex items-center gap-2">
                <TbAlertTriangle className="text-amber-500 text-base flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-amber-500">
                        Expiring in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-400">{end.format('DD MMM YYYY')}</p>
                </div>
            </div>
        )
    }
    return (
        <div className="flex items-center gap-2">
            <TbShieldCheck className="text-emerald-500 text-base flex-shrink-0" />
            <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Valid · {daysLeft} days left
                </p>
                <p className="text-xs text-gray-400">{end.format('DD MMM YYYY')}</p>
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

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <Skeleton height={200} />
                </AdaptiveCard>
            </Container>
        )
    }

    if (!data) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col items-center justify-center py-12">
                        <h3>Asset not found</h3>
                        <Button className="mt-4" onClick={() => navigate('/concepts/assets/asset-list')}>
                            Back to list
                        </Button>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    const status = statusConfig[data.status]
    const fmt = (d: string | null) => (d ? dayjs(d).format('DD MMM YYYY') : '—')
    const fmtDatetime = (d: string | null) =>
        d ? dayjs(d).format('DD MMM YYYY HH:mm') : '—'
    const photos = data.images ?? []

    return (
        <Container>
            <div className="flex flex-col gap-4">
                {/* Page header */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="plain"
                        icon={<TbArrowNarrowLeft />}
                        onClick={() => navigate('/concepts/assets/asset-list')}
                    >
                        Back to Assets
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
                                    navigate(`/concepts/assets/asset-edit/${data.id}`)
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
                                {photos.length > 0 ? (
                                    <img
                                        src={photos[0]}
                                        alt={data.name}
                                        className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 cursor-pointer ring-2 ring-gray-100 dark:ring-gray-700 hover:opacity-90 transition-opacity"
                                        onClick={() => setLightboxSrc(photos[0])}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-3xl flex-shrink-0">
                                        <TbEngine />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 pt-1">
                                    <h3 className="text-gray-900 dark:text-gray-100 mb-2 leading-tight">
                                        {data.name}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs border-0">
                                            {data.code}
                                        </Tag>
                                        <Tag className={`text-xs ${status.className}`}>
                                            {status.label}
                                        </Tag>
                                        {data.asset_type && (
                                            <Tag className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs border-0">
                                                {data.asset_type.name}
                                            </Tag>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </AdaptiveCard>

                        {/* Equipment details */}
                        <AdaptiveCard>
                            <SectionLabel
                                icon={<TbEngine />}
                                title="Equipment Details"
                                subtitle="Technical specifications and location"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                                <InfoRow
                                    label="Serial Number"
                                    value={data.serial_number ?? ''}
                                />
                                <InfoRow
                                    label="Manufacturer"
                                    value={data.manufacturer ?? ''}
                                />
                                <InfoRow label="Model" value={data.model ?? ''} />
                                <InfoRow
                                    label="Location"
                                    value={data.location ?? ''}
                                />
                                {data.address_label && (
                                    <InfoRow
                                        label="Address / Zone"
                                        value={data.address_label}
                                    />
                                )}
                                <InfoRow
                                    label="Installed At"
                                    value={fmtDatetime(data.installed_at)}
                                />
                            </div>
                        </AdaptiveCard>

                        {/* Notes */}
                        <AdaptiveCard>
                            <SectionLabel
                                icon={<TbFileDescription />}
                                title="Notes"
                                subtitle="Observations and additional information"
                            />
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                                {data.notes || (
                                    <span className="italic text-gray-400">
                                        No notes provided.
                                    </span>
                                )}
                            </p>
                        </AdaptiveCard>

                        {/* Photo gallery */}
                        {photos.length > 0 && (
                            <AdaptiveCard>
                                <SectionLabel
                                    icon={<TbPhoto />}
                                    title="Photos"
                                    subtitle={`${photos.length} photo${photos.length !== 1 ? 's' : ''} attached`}
                                />
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                    {photos.map((src, i) => (
                                        <div
                                            key={i}
                                            className="group relative cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600"
                                            onClick={() => setLightboxSrc(src)}
                                        >
                                            <img
                                                src={src}
                                                alt={`${data.name} photo ${i + 1}`}
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

                    {/* Right sidebar */}
                    <div className="md:w-[300px] flex flex-col gap-4 flex-shrink-0">
                        {/* Lifecycle */}
                        <AdaptiveCard>
                            <SectionLabel
                                icon={<TbCalendar />}
                                title="Lifecycle"
                                subtitle="Dates and warranty status"
                            />
                            <div className="flex flex-col gap-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                        Purchase Date
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {fmt(data.purchase_date)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                                        Warranty
                                    </p>
                                    <WarrantyStatus date={data.warranty_end_at} />
                                </div>

                                {data.location && (
                                    <>
                                        <hr className="border-gray-200 dark:border-gray-700" />
                                        <div className="flex items-start gap-2">
                                            <TbMapPin className="text-gray-400 text-lg mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                                                    Location
                                                </p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                    {data.location}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <hr className="border-gray-200 dark:border-gray-700" />

                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                        Created
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {fmt(data.created_at)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                        Last Updated
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {fmt(data.updated_at)}
                                    </p>
                                </div>
                            </div>
                        </AdaptiveCard>
                    </div>
                </div>
            </div>

            <PrintLabelDialog
                isOpen={printOpen}
                onClose={() => setPrintOpen(false)}
                type="asset"
                name={data.name}
                code={data.code}
                url={window.location.href}
            />

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
        </Container>
    )
}

export default AssetDetails
