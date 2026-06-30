import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import {
    TbAlertTriangle,
    TbAlertCircle,
    TbInfoCircle,
    TbTool,
    TbBuilding,
    TbUser,
    TbCalendar,
    TbHeartRateMonitor,
    TbBug,
    TbExternalLink,
    TbCircleDot,
    TbSparkles,
    TbLoader2,
    TbCheck,
    TbChevronDown,
    TbChevronUp,
    TbClipboardList,
    TbFileAlert,
    TbMapPin,
} from 'react-icons/tb'
import { apiCreatePmPlans, apiCreateWorkOrderFromAi, apiCreateMaintenanceRequestFromAi } from '@/services/AiService'
import type { PmPlanSuggestion } from '@/services/AiService'
import type { ChatActionData } from '../types'

// ── Shared helpers ─────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
    open:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    on_hold:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    completed:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    cancelled:   'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
}

const priorityColors: Record<string, string> = {
    low:      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    medium:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    high:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const riskColors: Record<string, string> = {
    low:    'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    high:   'text-red-600 dark:text-red-400',
}

const Chip = ({ label, colorClass }: { label: string; colorClass: string }) => (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${colorClass}`}>
        {label.replace('_', ' ')}
    </span>
)

const CardShell = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <span className="text-indigo-500">{icon}</span>
            <span className="font-semibold text-xs text-gray-600 dark:text-gray-300">{title}</span>
        </div>
        {children}
    </div>
)

// ── Work Orders ────────────────────────────────────────────────────────────────

type WoRow = { id: number; title: string; status: string; priority: string; due_at?: string; asset?: string; assigned_to?: string }

const WorkOrdersCard = ({ data }: { data: WoRow[] }) => (
    <CardShell icon={<TbTool className="text-base" />} title={`Work Orders (${data.length})`}>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {data.map((wo) => (
                <div key={wo.id} className="px-3 py-2 flex items-start gap-3">
                    <TbCircleDot className="mt-0.5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-800 dark:text-gray-100 truncate">{wo.title}</span>
                            <Chip label={wo.status} colorClass={statusColors[wo.status] ?? ''} />
                            <Chip label={wo.priority} colorClass={priorityColors[wo.priority] ?? ''} />
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 flex gap-2 flex-wrap">
                            {wo.asset      && <span>Asset: {wo.asset}</span>}
                            {wo.assigned_to && <span>Assigned: {wo.assigned_to}</span>}
                            {wo.due_at     && <span>Due: {wo.due_at}</span>}
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">#{wo.id}</span>
                </div>
            ))}
            {data.length === 0 && <p className="px-3 py-3 text-xs text-gray-400">No work orders found.</p>}
        </div>
    </CardShell>
)

// ── Assets ─────────────────────────────────────────────────────────────────────

type AssetRow = { id: number; name: string; code: string; site?: string; type?: string; open_wo_count: number }

const AssetsCard = ({ data }: { data: AssetRow[] }) => (
    <CardShell icon={<TbBuilding className="text-base" />} title={`Assets (${data.length})`}>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {data.map((a) => (
                <div key={a.id} className="px-3 py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 dark:text-gray-100">{a.name}</span>
                            <span className="text-[10px] font-mono text-gray-400">{a.code}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 flex gap-2">
                            {a.type && <span>{a.type}</span>}
                            {a.site && <span>· {a.site}</span>}
                        </div>
                    </div>
                    {a.open_wo_count > 0 && (
                        <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300 px-1.5 py-0.5 rounded shrink-0">
                            {a.open_wo_count} open WO{a.open_wo_count > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            ))}
            {data.length === 0 && <p className="px-3 py-3 text-xs text-gray-400">No assets found.</p>}
        </div>
    </CardShell>
)

// ── Technicians ────────────────────────────────────────────────────────────────

type TechRow = { id: number; name: string; sites?: string; open_wo_count: number }

const workloadColor = (count: number) => {
    if (count === 0) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    if (count <= 3)  return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
}

const TechniciansCard = ({ data }: { data: TechRow[] }) => (
    <CardShell icon={<TbUser className="text-base" />} title={`Technicians (${data.length})`}>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {data.map((t) => (
                <div key={t.id} className="px-3 py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800 dark:text-gray-100">{t.name}</span>
                        {t.sites && <p className="text-[11px] text-gray-400">{t.sites}</p>}
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${workloadColor(t.open_wo_count)}`}>
                        {t.open_wo_count} WO{t.open_wo_count !== 1 ? 's' : ''}
                    </span>
                </div>
            ))}
            {data.length === 0 && <p className="px-3 py-3 text-xs text-gray-400">No technicians found.</p>}
        </div>
    </CardShell>
)

// ── PM Plans ───────────────────────────────────────────────────────────────────

type PmRow = { id: number; name: string; code: string; status: string; assets?: string; assigned_to?: string; trigger?: string; next_run_at?: string }

const PmPlansCard = ({ data }: { data: PmRow[] }) => (
    <CardShell icon={<TbCalendar className="text-base" />} title={`PM Plans (${data.length})`}>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {data.map((p) => (
                <div key={p.id} className="px-3 py-2">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 dark:text-gray-100">{p.name}</span>
                        <span className="text-[10px] font-mono text-gray-400">{p.code}</span>
                        <Chip label={p.status} colorClass={statusColors[p.status] ?? 'bg-gray-100 text-gray-600'} />
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 flex gap-2 flex-wrap">
                        {p.assets       && <span>Assets: {p.assets}</span>}
                        {p.trigger      && <span>· Every {p.trigger}</span>}
                        {p.next_run_at  && <span>· Next: {p.next_run_at}</span>}
                        {p.assigned_to  && <span>· {p.assigned_to}</span>}
                    </div>
                </div>
            ))}
            {data.length === 0 && <p className="px-3 py-3 text-xs text-gray-400">No PM plans found.</p>}
        </div>
    </CardShell>
)

// ── Asset Health ───────────────────────────────────────────────────────────────

type HealthRow = { asset_id: number; asset_name: string; total_wos: number; open_wos: number; critical_wos: number; overdue_wos: number; risk_level: string }

const AssetHealthCard = ({ data }: { data: HealthRow[] }) => (
    <CardShell icon={<TbHeartRateMonitor className="text-base" />} title={`Asset Health Analysis (last 90 days)`}>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {data.map((a) => (
                <div key={a.asset_id} className="px-3 py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 dark:text-gray-100">{a.asset_name}</span>
                            <span className={`text-[10px] font-bold uppercase ${riskColors[a.risk_level] ?? ''}`}>
                                {a.risk_level} risk
                            </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 flex gap-2">
                            <span>{a.total_wos} WOs total</span>
                            {a.open_wos     > 0 && <span>· {a.open_wos} open</span>}
                            {a.critical_wos > 0 && <span>· {a.critical_wos} critical</span>}
                            {a.overdue_wos  > 0 && <span className="text-red-400">· {a.overdue_wos} overdue</span>}
                        </div>
                    </div>
                    <div className={`w-2 h-8 rounded-full shrink-0 ${a.risk_level === 'high' ? 'bg-red-500' : a.risk_level === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                </div>
            ))}
            {data.length === 0 && <p className="px-3 py-3 text-xs text-gray-400">No asset data found for the last 90 days.</p>}
        </div>
    </CardShell>
)

// ── Anomalies ──────────────────────────────────────────────────────────────────

type AnomalyRow = { type: string; severity: string; message: string; asset?: string; assigned_to?: string; wo_id?: number; count?: number }

const severityIcon = (s: string) => {
    if (s === 'critical') return <TbAlertCircle className="text-red-500 shrink-0 mt-0.5" />
    if (s === 'warning')  return <TbAlertTriangle className="text-yellow-500 shrink-0 mt-0.5" />
    return <TbInfoCircle className="text-blue-500 shrink-0 mt-0.5" />
}

const sectionLabel: Record<string, string> = {
    overdue_wo:            '⏰ Overdue Work Orders',
    repeated_failures:     '🔁 Repeated Asset Failures',
    overloaded_technician: '👷 Overloaded Technicians',
}

const AnomaliesCard = ({ data }: { data: AnomalyRow[] }) => {
    const groups = data.reduce<Record<string, AnomalyRow[]>>((acc, a) => {
        ;(acc[a.type] ??= []).push(a)
        return acc
    }, {})

    return (
        <CardShell icon={<TbBug className="text-base" />} title={`Anomalies Detected (${data.length})`}>
            {data.length === 0 && <p className="px-3 py-3 text-xs text-gray-400">No anomalies detected.</p>}
            {Object.entries(groups).map(([type, rows]) => (
                <div key={type}>
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800/60 border-y border-gray-100 dark:border-gray-700">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {sectionLabel[type] ?? type}
                        </span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {rows.map((a, i) => (
                            <div key={i} className="px-3 py-2 flex items-start gap-2">
                                {severityIcon(a.severity)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-800 dark:text-gray-100 text-[12px]">{a.message}</p>
                                    {a.asset && type !== 'overloaded_technician' && (
                                        <p className="text-[11px] text-gray-400 mt-0.5">{a.asset}</p>
                                    )}
                                    {a.assigned_to && type === 'overdue_wo' && (
                                        <p className="text-[11px] text-gray-400 mt-0.5">Assigned: {a.assigned_to}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </CardShell>
    )
}

// ── Create Work Order ──────────────────────────────────────────────────────────

type SuggestWoData = {
    title?: string
    description?: string
    priority?: string
    due_at?: string | null
    estimated_minutes?: number | null
    asset_id?: number | null
    asset_name?: string | null
    asset_code?: string | null
}

const isRealDate = (d?: string | null) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d !== 'YYYY-MM-DD'

const CreateWorkOrderCard = ({ data, messageId }: { data: SuggestWoData; messageId?: string }) => {
    const navigate = useNavigate()
    const userAuthority = useSessionUser((s) => s.user.authority)
    const canCreate = useAuthority(userAuthority, ['work_orders.write', 'admin', 'owner'])
    const [loading, setLoading] = useState(false)
    const storageKey = `ai-created-wo-${messageId ?? ''}`
    const [created, setCreated] = useState<{ id: number; code: string } | null>(() => {
        if (!messageId) return null
        try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null') } catch { return null }
    })
    const [error, setError] = useState<string | null>(null)

    const handleCreate = async () => {
        setLoading(true)
        setError(null)
        try {
            const resp = await apiCreateWorkOrderFromAi({
                title:             data.title ?? '',
                description:       data.description,
                priority:          data.priority ?? 'medium',
                due_at:            data.due_at,
                estimated_minutes: data.estimated_minutes ?? undefined,
                asset_id:          data.asset_id,
            })
            const state = { id: resp.id, code: resp.code }
            setCreated(state)
            if (messageId) localStorage.setItem(storageKey, JSON.stringify(state))
        } catch {
            setError('Could not create the work order. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <CardShell icon={<TbTool className="text-base" />} title="Work Order — Ready to Create">
            <div className="px-3 py-3 space-y-1.5">
                {created ? (
                    <>
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm mb-2">
                            <TbCheck className="text-lg shrink-0" />
                            Work order {created.code} created
                        </div>
                        <Button type="button" variant="twoTone" size="sm" className="w-full"
                            onClick={() => navigate(`/concepts/work-orders/work-order-details/${created.id}`)}>
                            <span className="flex items-center justify-center gap-2">
                                <TbExternalLink className="text-base" />
                                View Work Order
                            </span>
                        </Button>
                    </>
                ) : (
                    <>
                        {data.title       && <Row label="Title"    value={data.title} />}
                        {data.priority    && <Row label="Priority" value={<Chip label={data.priority} colorClass={priorityColors[data.priority] ?? ''} />} />}
                        {data.asset_name  && <Row label="Asset"    value={<span>{data.asset_name} <span className="text-gray-400 font-mono text-[10px]">{data.asset_code}</span></span>} />}
                        {!data.asset_id   && <Row label="Asset"    value={<span className="text-yellow-500 text-[11px]">No asset matched — you can set it manually</span>} />}
                        {isRealDate(data.due_at) && <Row label="Due" value={data.due_at!} />}
                        {(data.estimated_minutes ?? 0) > 0 && (
                            <Row label="Duration" value={`${Math.floor(data.estimated_minutes! / 60)}h ${data.estimated_minutes! % 60}m`} />
                        )}
                        {data.description && <Row label="Notes" value={data.description} />}
                        {error && <p className="text-xs text-red-500 pt-1">{error}</p>}
                        {canCreate ? (
                            <Button type="button" variant="solid" size="sm" className="w-full mt-3"
                                loading={loading} onClick={handleCreate}>
                                <span className="flex items-center justify-center gap-2">
                                    {loading
                                        ? <TbLoader2 className="text-base animate-spin" />
                                        : <TbCheck className="text-base" />
                                    }
                                    {loading ? 'Creating…' : 'Create Work Order'}
                                </span>
                            </Button>
                        ) : (
                            <p className="text-[11px] text-amber-500 dark:text-amber-400 pt-2">
                                You don't have permission to create work orders.
                            </p>
                        )}
                    </>
                )}
            </div>
        </CardShell>
    )
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-2">
        <span className="text-[11px] text-gray-400 w-16 shrink-0 pt-0.5">{label}</span>
        <span className="text-[12px] text-gray-800 dark:text-gray-100 flex-1">{value}</span>
    </div>
)

// ── Members ────────────────────────────────────────────────────────────────────

type MemberRow = { id: number; name: string; email?: string; roles?: string; sites?: string }

const MembersCard = ({ data }: { data: MemberRow[] }) => (
    <CardShell icon={<TbUser className="text-base" />} title={`Company Members (${data.length})`}>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {data.map((m) => (
                <div key={m.id} className="px-3 py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800 dark:text-gray-100">{m.name}</span>
                        {m.email && <p className="text-[11px] text-gray-400">{m.email}</p>}
                    </div>
                    <div className="text-right shrink-0">
                        {m.roles && <p className="text-[10px] font-semibold text-indigo-500">{m.roles}</p>}
                        {m.sites && <p className="text-[10px] text-gray-400">{m.sites}</p>}
                    </div>
                </div>
            ))}
            {data.length === 0 && <p className="px-3 py-3 text-xs text-gray-400">No members found.</p>}
        </div>
    </CardShell>
)

// ── PM Bulk Create ─────────────────────────────────────────────────────────────

type SuggestPmPlansData = { plans: PmPlanSuggestion[]; error?: string }

const riskDot: Record<string, string> = {
    high:     'bg-red-500',
    medium:   'bg-yellow-400',
    low:      'bg-green-400',
    critical: 'bg-red-600',
}

const PmBulkCreateCard = ({ data }: { data: SuggestPmPlansData }) => {
    const navigate = useNavigate()
    const userAuthority = useSessionUser((s) => s.user.authority)
    const canCreate = useAuthority(userAuthority, ['pm_plans.write', 'admin', 'owner'])
    const [expanded, setExpanded]   = useState<number | null>(null)
    const [loading, setLoading]     = useState(false)
    const [result, setResult]       = useState<{ count: number; codes: string[] } | null>(null)
    const [error, setError]         = useState<string | null>(null)

    const plans = data.plans ?? []

    const handleCreate = async () => {
        if (!plans.length || loading) return
        setLoading(true)
        setError(null)
        try {
            const resp = await apiCreatePmPlans(plans)
            setResult({
                count: resp.created_count,
                codes: resp.created.map((c) => `${c.code} · ${c.asset_name}`),
            })
        } catch {
            setError('Failed to create PM plans. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (data.error && !plans.length) {
        return (
            <CardShell icon={<TbClipboardList className="text-base" />} title="PM Plan Suggestions">
                <p className="px-3 py-3 text-xs text-red-500">{data.error}</p>
            </CardShell>
        )
    }

    return (
        <CardShell
            icon={<TbClipboardList className="text-base" />}
            title={`AI Suggested PM Plans (${plans.length})`}
        >
            {/* Plan list */}
            {!result && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {plans.map((plan, idx) => {
                        const isOpen = expanded === idx
                        const dotClass = riskDot[plan.priority] ?? 'bg-gray-400'
                        return (
                            <div key={idx}>
                                <button
                                    type="button"
                                    onClick={() => setExpanded(isOpen ? null : idx)}
                                    className="w-full px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                                        <span className="font-medium text-gray-800 dark:text-gray-100 text-sm flex-1 truncate">
                                            {plan.asset_name}
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Chip label={plan.priority} colorClass={priorityColors[plan.priority] ?? ''} />
                                            <Chip label={plan.status}   colorClass={statusColors[plan.status] ?? 'bg-gray-100 text-gray-600'} />
                                            {isOpen
                                                ? <TbChevronUp className="text-gray-400 text-sm" />
                                                : <TbChevronDown className="text-gray-400 text-sm" />
                                            }
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-gray-400 mt-0.5 flex gap-3 ml-4">
                                        <span>Every {plan.interval_value} {plan.interval_unit}</span>
                                        {plan.next_run_at && <span>· First: {plan.next_run_at}</span>}
                                        {plan.estimated_minutes && <span>· {Math.round(plan.estimated_minutes / 60)}h</span>}
                                        {plan.assigned_member_name && <span>· {plan.assigned_member_name}</span>}
                                    </div>
                                </button>

                                {/* Expanded tasks */}
                                {isOpen && plan.tasks?.length > 0 && (
                                    <div className="px-4 pb-3 bg-gray-50/50 dark:bg-gray-800/30">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                            {plan.tasks.length} Maintenance Tasks
                                        </p>
                                        <ul className="space-y-1">
                                            {plan.tasks.map((task, ti) => (
                                                <li key={ti} className="text-[11px] text-gray-600 dark:text-gray-300 flex items-start gap-1.5">
                                                    <TbCircleDot className="text-indigo-400 shrink-0 mt-0.5 text-[10px]" />
                                                    {task}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Success state */}
            {result && (
                <div className="px-3 py-3 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                        <TbCheck className="text-lg shrink-0" />
                        {result.count} PM Plan{result.count !== 1 ? 's' : ''} created successfully
                    </div>
                    <ul className="space-y-0.5 pl-1">
                        {result.codes.map((c, i) => (
                            <li key={i} className="text-[11px] text-gray-500 dark:text-gray-400">{c}</li>
                        ))}
                    </ul>
                    <Button
                        type="button"
                        variant="twoTone"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => navigate('/concepts/pm/pm-plans')}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <TbExternalLink className="text-base" />
                            View PM Plans
                        </span>
                    </Button>
                </div>
            )}

            {/* Action footer */}
            {!result && (
                <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700">
                    {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                    {canCreate ? (
                        <>
                            <Button
                                type="button"
                                variant="solid"
                                size="sm"
                                className="w-full"
                                loading={loading}
                                disabled={!plans.length || loading}
                                onClick={handleCreate}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    {loading
                                        ? <TbLoader2 className="text-base animate-spin" />
                                        : <TbSparkles className="text-base" />
                                    }
                                    {loading
                                        ? `Creating ${plans.length} PM Plans…`
                                        : `Create All ${plans.length} PM Plans`
                                    }
                                </span>
                            </Button>
                            <p className="text-[10px] text-gray-400 text-center mt-1.5">
                                Review the plans above before creating
                            </p>
                        </>
                    ) : (
                        <p className="text-[11px] text-amber-500 dark:text-amber-400">
                            You don't have permission to create PM plans.
                        </p>
                    )}
                </div>
            )}
        </CardShell>
    )
}

// ── Create Maintenance Request ─────────────────────────────────────────────────

type SuggestRequestData = {
    title?: string
    description?: string
    priority?: string
    asset_id?: number | null
    asset_name?: string | null
    asset_code?: string | null
    location?: string | null
}

const CreateRequestCard = ({ data, messageId }: { data: SuggestRequestData; messageId?: string }) => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const storageKey = `ai-created-req-${messageId ?? ''}`
    const [created, setCreated] = useState<{ id: number; code: string } | null>(() => {
        if (!messageId) return null
        try { return JSON.parse(localStorage.getItem(storageKey) ?? 'null') } catch { return null }
    })
    const [error, setError] = useState<string | null>(null)

    const handleCreate = async () => {
        setLoading(true)
        setError(null)
        try {
            const resp = await apiCreateMaintenanceRequestFromAi({
                title:       data.title ?? '',
                description: data.description,
                priority:    data.priority ?? 'medium',
                asset_id:    data.asset_id,
                location:    data.location,
            })
            const state = { id: resp.id, code: resp.code }
            setCreated(state)
            if (messageId) localStorage.setItem(storageKey, JSON.stringify(state))
        } catch {
            setError('Could not submit the request. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <CardShell icon={<TbFileAlert className="text-base" />} title="Maintenance Request — Ready to Submit">
            <div className="px-3 py-3 space-y-1.5">
                {created ? (
                    <>
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm mb-2">
                            <TbCheck className="text-lg shrink-0" />
                            Request {created.code} submitted
                        </div>
                        <Button type="button" variant="twoTone" size="sm" className="w-full"
                            onClick={() => navigate(`/concepts/requests/request-details/${created.id}`)}>
                            <span className="flex items-center justify-center gap-2">
                                <TbExternalLink className="text-base" />
                                View Request
                            </span>
                        </Button>
                    </>
                ) : (
                    <>
                        {data.title    && <Row label="Title"    value={data.title} />}
                        {data.priority && <Row label="Priority" value={<Chip label={data.priority} colorClass={priorityColors[data.priority] ?? ''} />} />}
                        {data.asset_name ? (
                            <Row label="Asset" value={<span>{data.asset_name} <span className="text-gray-400 font-mono text-[10px]">{data.asset_code}</span></span>} />
                        ) : data.location ? (
                            <Row label="Location" value={<span className="flex items-center gap-1"><TbMapPin className="text-gray-400 text-xs" />{data.location}</span>} />
                        ) : (
                            <Row label="Asset" value={<span className="text-yellow-500 text-[11px]">No asset matched — you can set it manually</span>} />
                        )}
                        {data.description && <Row label="Problem" value={data.description} />}
                        {error && <p className="text-xs text-red-500 pt-1">{error}</p>}
                        <Button type="button" variant="solid" size="sm" className="w-full mt-3"
                            loading={loading} onClick={handleCreate}>
                            <span className="flex items-center justify-center gap-2">
                                {loading
                                    ? <TbLoader2 className="text-base animate-spin" />
                                    : <TbFileAlert className="text-base" />
                                }
                                {loading ? 'Submitting…' : 'Submit Request'}
                            </span>
                        </Button>
                    </>
                )}
            </div>
        </CardShell>
    )
}

// ── Root export ────────────────────────────────────────────────────────────────

const ChatActionCard = ({ actionData, messageId }: { actionData: ChatActionData; messageId?: string }) => {
    const { type, data } = actionData

    switch (type) {
        case 'get_work_orders':      return <WorkOrdersCard       data={data as WoRow[]} />
        case 'get_assets':           return <AssetsCard           data={data as AssetRow[]} />
        case 'get_technicians':      return <TechniciansCard      data={data as TechRow[]} />
        case 'get_members':          return <MembersCard          data={data as MemberRow[]} />
        case 'get_pm_plans':         return <PmPlansCard          data={data as PmRow[]} />
        case 'analyze_asset_health': return <AssetHealthCard      data={data as HealthRow[]} />
        case 'detect_anomalies':     return <AnomaliesCard        data={data as AnomalyRow[]} />
        case 'suggest_work_order':           return <CreateWorkOrderCard data={data as SuggestWoData} messageId={messageId} />
        case 'prefill_work_order':           return <CreateWorkOrderCard data={data as SuggestWoData} messageId={messageId} />
        case 'suggest_pm_plans':             return <PmBulkCreateCard   data={data as SuggestPmPlansData} />
        case 'suggest_maintenance_request':  return <CreateRequestCard  data={data as SuggestRequestData} messageId={messageId} />
        default:                             return null
    }
}

export default ChatActionCard
