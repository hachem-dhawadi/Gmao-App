import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import Loading from '@/components/shared/Loading'
import PrintLabelDialog from '@/components/shared/PrintLabelDialog'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Dialog from '@/components/ui/Dialog'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { apiGetAssetById, apiSyncAssetChecklistTemplates } from '@/services/AssetsService'
import type { ChecklistTemplate } from '@/services/AssetsService'
import { apiGetWorkOrdersList } from '@/services/WorkOrdersService'
import { useNavigate, useParams } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
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
    TbClipboardList,
    TbClock,
    TbCurrencyDollar,
    TbChevronRight,
    TbPlus,
    TbTrash,
    TbGripVertical,
    TbCheckbox,
} from 'react-icons/tb'
import { HiEye } from 'react-icons/hi'
import type { AssetResponse } from '@/services/AssetsService'
import type { WorkOrder } from '@/services/WorkOrdersService'
import type { Asset } from '../AssetList/types'

const woStatusConfig: Record<
    WorkOrder['status'],
    { label: string; bgClass: string; textClass: string; dot: string }
> = {
    open: {
        label: 'Open',
        bgClass: 'bg-blue-100 dark:bg-blue-500/20',
        textClass: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
    },
    in_progress: {
        label: 'In Progress',
        bgClass: 'bg-amber-100 dark:bg-amber-500/20',
        textClass: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
    on_hold: {
        label: 'On Hold',
        bgClass: 'bg-gray-100 dark:bg-gray-700',
        textClass: 'text-gray-500 dark:text-gray-400',
        dot: 'bg-gray-400',
    },
    completed: {
        label: 'Completed',
        bgClass: 'bg-emerald-100 dark:bg-emerald-500/20',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    cancelled: {
        label: 'Cancelled',
        bgClass: 'bg-red-100 dark:bg-red-500/20',
        textClass: 'text-red-600 dark:text-red-400',
        dot: 'bg-red-400',
    },
    pending_approval: {
        label: 'Pending Approval',
        bgClass: 'bg-orange-100 dark:bg-orange-500/20',
        textClass: 'text-orange-600 dark:text-orange-400',
        dot: 'bg-orange-400',
    },
    rejected: {
        label: 'Rejected',
        bgClass: 'bg-rose-100 dark:bg-rose-500/20',
        textClass: 'text-rose-600 dark:text-rose-400',
        dot: 'bg-rose-500',
    },
}

const woPriorityConfig: Record<
    WorkOrder['priority'],
    { label: string; textClass: string }
> = {
    low: { label: 'Low', textClass: 'text-gray-400' },
    medium: { label: 'Medium', textClass: 'text-blue-500' },
    high: { label: 'High', textClass: 'text-amber-500' },
    critical: { label: 'Critical', textClass: 'text-red-500 font-bold' },
}

const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

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

type DraftTask = { id?: number; title: string }

const DefaultTasksSection = ({
    assetId,
    initialTasks,
}: {
    assetId: number
    initialTasks: ChecklistTemplate[]
}) => {
    const [tasks, setTasks] = useState<DraftTask[]>(initialTasks)
    const [newTitle, setNewTitle] = useState('')
    const [saving, setSaving] = useState(false)
    const [dirty, setDirty] = useState(false)

    useEffect(() => {
        setTasks(initialTasks)
        setDirty(false)
    }, [assetId])

    const addTask = () => {
        const t = newTitle.trim()
        if (!t) return
        setTasks((prev) => [...prev, { title: t }])
        setNewTitle('')
        setDirty(true)
    }

    const removeTask = (idx: number) => {
        setTasks((prev) => prev.filter((_, i) => i !== idx))
        setDirty(true)
    }

    const updateTask = (idx: number, title: string) => {
        setTasks((prev) =>
            prev.map((t, i) => (i === idx ? { ...t, title } : t)),
        )
        setDirty(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await apiSyncAssetChecklistTemplates(
                assetId,
                tasks.map((t, i) => ({ title: t.title, order_index: i })),
            )
            setDirty(false)
            toast.push(
                <Notification type="success">Default tasks saved.</Notification>,
                { placement: 'top-end' },
            )
        } catch {
            toast.push(
                <Notification type="danger">Failed to save tasks.</Notification>,
                { placement: 'top-end' },
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h4 className="flex items-center gap-2">
                    <TbCheckbox className="text-indigo-500" />
                    Default Tasks
                    {tasks.length > 0 && (
                        <span className="text-sm font-normal text-gray-400">
                            ({tasks.length})
                        </span>
                    )}
                </h4>
                {dirty && (
                    <Button
                        size="sm"
                        variant="solid"
                        loading={saving}
                        onClick={handleSave}
                    >
                        Save
                    </Button>
                )}
            </div>

            <div className="flex flex-col gap-1.5 mb-3">
                {tasks.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">
                        No default tasks yet. Add steps below.
                    </p>
                )}
                {tasks.map((task, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-2 group rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                        <TbGripVertical className="text-gray-300 shrink-0 text-base" />
                        <span className="text-xs text-gray-400 w-5 shrink-0 text-right">{idx + 1}.</span>
                        <input
                            className="flex-1 text-sm bg-transparent border-0 outline-none focus:ring-0 text-gray-700 dark:text-gray-200 min-w-0"
                            value={task.title}
                            onChange={(e) => updateTask(idx, e.target.value)}
                        />
                        <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity shrink-0"
                            onClick={() => removeTask(idx)}
                        >
                            <TbTrash className="text-base" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <Input
                    size="sm"
                    placeholder="New task step…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                />
                <Button size="sm" icon={<TbPlus />} onClick={addTask}>
                    Add
                </Button>
            </div>
        </Card>
    )
}

const AssetDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, ['assets.write', 'admin', 'manager'])
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

    const { data: historyData, isLoading: historyLoading } = useSWR<WorkOrder[]>(
        id ? ['/work-orders', 'asset-history', id] : null,
        async () => {
            const resp = await apiGetWorkOrdersList({ asset_id: id, per_page: 100 })
            return resp.data.work_orders
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

                                {/* Default Tasks — admin/manager only */}
                                {canEdit && (
                                    <DefaultTasksSection
                                        assetId={data.id}
                                        initialTasks={data.checklist_templates ?? []}
                                    />
                                )}

                                {/* Maintenance History */}
                                <Card>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="flex items-center gap-2">
                                            <TbClipboardList className="text-blue-500" />
                                            Maintenance History
                                            {historyData && historyData.length > 0 && (
                                                <span className="text-sm font-normal text-gray-400">
                                                    ({historyData.length})
                                                </span>
                                            )}
                                        </h4>
                                    </div>

                                    {historyLoading ? (
                                        <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
                                            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                            Loading history…
                                        </div>
                                    ) : !historyData || historyData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                                            <TbClipboardList className="text-4xl" />
                                            <p className="text-sm">No work orders on record for this asset</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                                            {historyData.map((wo) => {
                                                const woCfg = woStatusConfig[wo.status] ?? woStatusConfig.open
                                                const priCfg = woPriorityConfig[wo.priority] ?? woPriorityConfig.medium
                                                const duration = wo.work_logs_summary?.total_minutes
                                                const cost = wo.work_logs_summary?.total_cost
                                                const date = wo.closed_at ?? wo.opened_at ?? wo.created_at
                                                return (
                                                    <div
                                                        key={wo.id}
                                                        className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-2 -mx-2 transition-colors group"
                                                        onClick={() => navigate(`/concepts/work-orders/work-order-details/${wo.id}`)}
                                                    >
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${woCfg.dot}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-mono text-xs text-gray-400">{wo.code}</span>
                                                                <Tag className={`border-0 text-xs py-0 px-1.5 ${woCfg.bgClass}`}>
                                                                    <span className={`font-semibold ${woCfg.textClass}`}>{woCfg.label}</span>
                                                                </Tag>
                                                                <span className={`text-xs font-semibold ${priCfg.textClass}`}>{priCfg.label}</span>
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate mt-0.5">{wo.title}</p>
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                                                                <span>{date ? dayjs(date).format('DD MMM YYYY') : '—'}</span>
                                                                {duration != null && duration > 0 && (
                                                                    <span className="flex items-center gap-1">
                                                                        <TbClock className="text-base" />
                                                                        {formatDuration(duration)}
                                                                    </span>
                                                                )}
                                                                {cost != null && cost > 0 && (
                                                                    <span className="flex items-center gap-1">
                                                                        <TbCurrencyDollar className="text-base" />
                                                                        {cost.toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <TbChevronRight className="text-gray-300 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400 transition-colors shrink-0" />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </Card>
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
