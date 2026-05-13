import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Skeleton from '@/components/ui/Skeleton'
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
    TbEngine,
    TbMapPin,
    TbCalendar,
    TbShieldCheck,
    TbShieldOff,
    TbAlertTriangle,
    TbFileDescription,
} from 'react-icons/tb'
import type { AssetResponse } from '@/services/AssetsService'
import type { Asset } from '../AssetList/types'

const statusConfig: Record<
    Asset['status'],
    { label: string; className: string }
> = {
    active: {
        label: 'Active',
        className:
            'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    },
    inactive: {
        label: 'Inactive',
        className:
            'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    },
    under_maintenance: {
        label: 'Under Maintenance',
        className:
            'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    },
    decommissioned: {
        label: 'Decommissioned',
        className:
            'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
    },
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            {label}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
            {value || '—'}
        </p>
    </div>
)

const WarrantyStatus = ({ date }: { date: string | null }) => {
    if (!date) {
        return (
            <p className="text-sm text-gray-400 italic">No warranty info</p>
        )
    }

    const end = dayjs(date)
    const now = dayjs()
    const daysLeft = end.diff(now, 'day')

    if (daysLeft < 0) {
        return (
            <div className="flex items-center gap-2">
                <TbShieldOff className="text-red-500 text-base flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-red-500">
                        Expired
                    </p>
                    <p className="text-xs text-gray-400">
                        {end.format('DD MMM YYYY')}
                    </p>
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
                    <p className="text-xs text-gray-400">
                        {end.format('DD MMM YYYY')}
                    </p>
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
                <p className="text-xs text-gray-400">
                    {end.format('DD MMM YYYY')}
                </p>
            </div>
        </div>
    )
}

const AssetDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER])

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
                        <Button
                            className="mt-4"
                            onClick={() =>
                                navigate('/concepts/assets/asset-list')
                            }
                        >
                            Back to list
                        </Button>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    const status = statusConfig[data.status]
    const fmt = (d: string | null) =>
        d ? dayjs(d).format('DD MMM YYYY') : '—'
    const fmtDatetime = (d: string | null) =>
        d ? dayjs(d).format('DD MMM YYYY HH:mm') : '—'

    return (
        <Container>
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="plain"
                        icon={<TbArrowNarrowLeft />}
                        onClick={() => navigate('/concepts/assets/asset-list')}
                    >
                        Back to Assets
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

                <div className="flex flex-col md:flex-row gap-4">
                    {/* Left: main info */}
                    <AdaptiveCard className="flex-auto">
                        {/* Asset identity */}
                        <div className="flex items-start gap-4 mb-6">
                            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-2xl flex-shrink-0">
                                <TbEngine />
                            </div>
                            <div>
                                <h3 className="text-gray-900 dark:text-gray-100">
                                    {data.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
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

                        {/* Info grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6">
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
                                    label="Address Label"
                                    value={data.address_label}
                                />
                            )}
                            <InfoRow
                                label="Installed At"
                                value={fmtDatetime(data.installed_at)}
                            />
                        </div>

                        {/* Notes */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TbFileDescription className="text-gray-400 text-base" />
                                <p className="text-xs text-gray-400 uppercase tracking-wide">
                                    Notes
                                </p>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                                {data.notes || 'No notes provided.'}
                            </p>
                        </div>
                    </AdaptiveCard>

                    {/* Right: lifecycle sidebar */}
                    <div className="md:w-[300px] flex flex-col gap-4">
                        <AdaptiveCard>
                            <h5 className="mb-4 text-gray-700 dark:text-gray-300">
                                Lifecycle
                            </h5>
                            <div className="flex flex-col gap-5">
                                {/* Purchase date */}
                                <div className="flex items-start gap-3">
                                    <TbCalendar className="mt-0.5 text-lg text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                                            Purchase Date
                                        </p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            {fmt(data.purchase_date)}
                                        </p>
                                    </div>
                                </div>

                                {/* Warranty */}
                                <div className="flex items-start gap-3">
                                    <TbShieldCheck className="mt-0.5 text-lg text-gray-400 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                            Warranty
                                        </p>
                                        <WarrantyStatus
                                            date={data.warranty_end_at}
                                        />
                                    </div>
                                </div>

                                {/* Location pin */}
                                {data.location && (
                                    <div className="flex items-start gap-3">
                                        <TbMapPin className="mt-0.5 text-lg text-gray-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                                                Location
                                            </p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                {data.location}
                                            </p>
                                        </div>
                                    </div>
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
        </Container>
    )
}

export default AssetDetails
