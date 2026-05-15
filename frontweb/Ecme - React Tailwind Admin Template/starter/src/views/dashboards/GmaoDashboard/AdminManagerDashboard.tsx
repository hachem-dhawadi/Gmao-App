import { useState } from 'react'
import useSWR from 'swr'
import { useNavigate } from 'react-router-dom'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Progress from '@/components/ui/Progress'
import Skeleton from '@/components/ui/Skeleton'
import Chart from '@/components/shared/Chart'
import Segment from '@/components/ui/Segment'
import { apiGetAdminManagerDashboard } from '@/services/DashboardService'
import classNames from '@/utils/classNames'
import isLastChild from '@/utils/isLastChild'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
    TbClipboardList, TbAlertTriangle, TbCircleCheck,
    TbCalendarTime, TbEngine, TbUsers, TbProgressBolt,
    TbArrowDownToArc, TbCopyCheck,
} from 'react-icons/tb'
import { COLOR_1, COLOR_3, COLOR_5 } from '@/constants/chart.constant'
import type { ReactNode } from 'react'

dayjs.extend(relativeTime)

// ── Types ──────────────────────────────────────────────────────────────

type WoItem = {
    id: number
    code: string
    title: string
    asset?: { name: string } | null
    priority: string
    status: string
    due_at?: string | null
}

type PmItem = {
    id: number
    code: string
    name: string
    priority: string
    assigned_to?: string | null
    next_run_at?: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
    low:      'bg-purple-200 dark:bg-purple-200 dark:text-gray-900 border-0',
    medium:   'bg-blue-200 dark:bg-blue-200 dark:text-gray-900 border-0',
    high:     'bg-amber-200 dark:bg-amber-200 dark:text-gray-900 border-0',
    critical: 'bg-red-200 dark:bg-red-200 dark:text-gray-900 border-0',
}

const statusColors: Record<string, string> = {
    open:        'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    in_progress: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    on_hold:     'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    completed:   'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    cancelled:   'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
}

const capitalize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// ── KPI Colored Box ────────────────────────────────────────────────────

const KpiBox = ({
    title, value, icon, className,
}: { title: string; value: number; icon: ReactNode; className: string }) => (
    <div className={classNames('rounded-2xl p-4 flex flex-col justify-center', className)}>
        <div className="flex justify-between items-center relative">
            <div>
                <div className="mb-4 text-gray-900 font-bold text-sm">{title}</div>
                <h1 className="mb-1 text-gray-900">{value}</h1>
            </div>
            <div className="flex items-center justify-center min-h-12 min-w-12 max-h-12 max-w-12 bg-gray-900 text-white rounded-full text-2xl">
                {icon}
            </div>
        </div>
    </div>
)

// ── WO Overview (top left) ─────────────────────────────────────────────

const WoOverviewCard = ({ d }: { d: Record<string, number> }) => (
    <Card>
        <div className="flex items-center justify-between">
            <h4>Work Orders</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl mt-4">
            <KpiBox
                title="Open"
                value={d.open ?? 0}
                icon={<TbProgressBolt />}
                className="bg-sky-100 dark:bg-sky-500/20"
            />
            <KpiBox
                title="Overdue"
                value={d.overdue ?? 0}
                icon={d.overdue ? <TbAlertTriangle /> : <TbCopyCheck />}
                className={d.overdue ? 'bg-red-100 dark:bg-red-500/20' : 'bg-emerald-100 dark:bg-emerald-500/20'}
            />
            <KpiBox
                title="Completed (month)"
                value={d.completed_month ?? 0}
                icon={<TbArrowDownToArc />}
                className="bg-purple-100 dark:bg-purple-500/20"
            />
        </div>
    </Card>
)

// ── WO Status / Priority Bar Chart ─────────────────────────────────────

type SegmentView = 'status' | 'priority'

const WoBarChartCard = ({
    workOrders, recentWos,
}: {
    workOrders: Record<string, number>
    recentWos: WoItem[]
}) => {
    const [view, setView] = useState<SegmentView>('status')

    const statusData = {
        labels: ['Open', 'In Progress', 'On Hold', 'Overdue'],
        series: [workOrders.open ?? 0, workOrders.in_progress ?? 0, workOrders.on_hold ?? 0, workOrders.overdue ?? 0],
        color: COLOR_1,
    }

    const priorities = ['critical', 'high', 'medium', 'low']
    const priorityData = {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        series: priorities.map(p => recentWos.filter(w => w.priority === p).length),
        color: COLOR_5,
    }

    const active = view === 'status' ? statusData : priorityData
    const total = active.series.reduce((a, b) => a + b, 0)
    const hasData = active.series.some(v => v > 0)

    return (
        <Card>
            <div className="flex sm:flex-row flex-col md:items-center justify-between mb-4 gap-4">
                <div>
                    <h4>Work Order Distribution</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{total} total tracked</p>
                </div>
                <Segment
                    value={view}
                    size="sm"
                    onChange={(val) => setView(val as SegmentView)}
                >
                    <Segment.Item value="status">By Status</Segment.Item>
                    <Segment.Item value="priority">By Priority</Segment.Item>
                </Segment>
            </div>
            {hasData ? (
                <Chart
                    key={view}
                    type="bar"
                    series={[{ name: 'Work Orders', data: active.series }]}
                    xAxis={active.labels}
                    height="220px"
                    customOptions={{
                        colors: [active.color],
                        legend: {
                            show: false,
                            tooltipHoverFormatter: (val, opts) => {
                                const s = opts?.w?.globals?.series?.[opts.seriesIndex]
                                return val + (s ? ` - ${s[opts.dataPointIndex] ?? ''}` : '')
                            },
                        },
                        plotOptions: {
                            bar: {
                                columnWidth: '40px',
                                borderRadius: 6,
                                borderRadiusApplication: 'end',
                            },
                        },
                    }}
                />
            ) : (
                <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
                    No work order data
                </div>
            )}
        </Card>
    )
}

// ── PM Plans Sidebar ───────────────────────────────────────────────────

const PmSidebarCard = ({
    pm, pmDueSoon, onViewAll,
}: {
    pm: { active: number; due_week: number; due_month: number }
    pmDueSoon: PmItem[]
    onViewAll: () => void
}) => {
    const pct = pm.active > 0
        ? Math.min(Math.round((pm.due_month / pm.active) * 100), 100)
        : 0

    return (
        <Card className="flex flex-col gap-0">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4>PM Plans</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {pm.due_week} due this week · {pm.due_month} due this month
                    </p>
                </div>
                <Button size="sm" onClick={onViewAll}>View all</Button>
            </div>

            {/* circle + active count */}
            <div className="flex items-center gap-4 mb-5 px-1">
                <Progress
                    percent={pct}
                    width={64}
                    variant="circle"
                    strokeWidth={7}
                />
                <div>
                    <p className="text-2xl font-bold heading-text">{pm.active}</p>
                    <p className="text-xs text-gray-500">Active plans</p>
                    {pm.due_week > 0 && (
                        <p className="text-xs text-amber-500 font-semibold mt-0.5">
                            {pm.due_week} due this week
                        </p>
                    )}
                </div>
            </div>

            {/* due soon list */}
            <div className="flex flex-col gap-1">
                {pmDueSoon.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No PM plans due this month</p>
                )}
                {pmDueSoon.map((pm, i) => (
                    <div
                        key={pm.id}
                        className={classNames(
                            'flex items-center justify-between py-2.5 border-gray-100 dark:border-gray-700',
                            !isLastChild(pmDueSoon, i) && 'border-b',
                        )}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <TbCalendarTime className="text-purple-500 text-sm" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold heading-text truncate">{pm.name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="font-mono text-xs text-purple-500">{pm.code}</span>
                                    {pm.assigned_to && (
                                        <span className="text-xs text-gray-400 truncate">· {pm.assigned_to}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 text-right ml-2">
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                {pm.next_run_at ? dayjs(pm.next_run_at).format('MMM D') : '—'}
                            </p>
                            <p className="text-xs text-gray-400">
                                {pm.next_run_at ? dayjs(pm.next_run_at).fromNow() : ''}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}

// ── Open Work Orders (checklist style) ────────────────────────────────

const OpenWorkOrdersCard = ({
    wos, onViewAll, onRow,
}: {
    wos: WoItem[]
    onViewAll: () => void
    onRow: (id: number) => void
}) => {
    const open = wos.filter(w => w.status === 'open' || w.status === 'in_progress')

    return (
        <Card>
            <div className="flex items-center justify-between">
                <h4>Current Work Orders</h4>
                <Button size="sm" onClick={onViewAll}>View all</Button>
            </div>
            <div className="mt-4">
                {open.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">No open work orders</p>
                )}
                {open.map((wo, i) => (
                    <div
                        key={wo.id}
                        className={classNames(
                            'flex items-center justify-between py-4 border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg px-2 -mx-2 transition-colors',
                            !isLastChild(open, i) && 'border-b',
                        )}
                        onClick={() => onRow(wo.id)}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <TbClipboardList className="text-blue-500 text-sm" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-mono text-xs text-purple-500">{wo.code}</span>
                                </div>
                                <p className="font-bold heading-text text-sm truncate">{wo.title}</p>
                                {wo.asset && (
                                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                        <TbEngine className="text-xs" />
                                        <span className="truncate">{wo.asset.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                            <Tag className={`text-xs ${priorityColors[wo.priority]}`}>
                                {capitalize(wo.priority)}
                            </Tag>
                            <Tag className={`text-xs ${statusColors[wo.status]}`}>
                                {capitalize(wo.status)}
                            </Tag>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}

// ── WO Status Donut ────────────────────────────────────────────────────

const WoStatusDonutCard = ({ d }: { d: Record<string, number> }) => {
    const series = [
        d.open ?? 0,
        d.in_progress ?? 0,
        d.on_hold ?? 0,
        d.overdue ?? 0,
        d.completed_month ?? 0,
    ]
    const total = series.reduce((a, b) => a + b, 0)
    const hasData = series.some(v => v > 0)

    const legend = [
        { label: 'Open',        color: 'bg-blue-500',   value: d.open ?? 0 },
        { label: 'In Progress', color: 'bg-amber-400',  value: d.in_progress ?? 0 },
        { label: 'On Hold',     color: 'bg-gray-400',   value: d.on_hold ?? 0 },
        { label: 'Overdue',     color: 'bg-red-500',    value: d.overdue ?? 0 },
        { label: 'Completed',   color: 'bg-emerald-500',value: d.completed_month ?? 0 },
    ]

    return (
        <Card>
            <h4 className="mb-4">WO Status Overview</h4>
            {!hasData ? (
                <p className="text-sm text-gray-400 text-center py-10">No work order data</p>
            ) : (
                <>
                    <Chart
                        type="donut"
                        series={series}
                        donutTitle="Total"
                        donutText={String(total)}
                        customOptions={{
                            labels: ['Open', 'In Progress', 'On Hold', 'Overdue', 'Completed'],
                            colors: ['#2a85ff', '#fbc13e', '#94a3b8', '#ff6a55', '#10b981'],
                        }}
                        height="200px"
                    />
                    <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
                        {legend.map(l => (
                            <div key={l.label} className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${l.color}`} />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{l.label}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{l.value}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </Card>
    )
}

// ── Team & Assets Summary ──────────────────────────────────────────────

const TeamAssetsCard = ({
    members, assets, completedMonth,
}: {
    members: { total_active: number; technicians: number }
    assets: { total: number }
    completedMonth: number
}) => {
    const stats = [
        { icon: <TbUsers />,         label: 'Active Members',    value: members.total_active, bg: 'bg-blue-100 dark:bg-blue-500/20',    text: 'text-blue-500' },
        { icon: <TbClipboardList />, label: 'Technicians',       value: members.technicians,  bg: 'bg-amber-100 dark:bg-amber-500/20',  text: 'text-amber-500' },
        { icon: <TbEngine />,        label: 'Total Assets',      value: assets.total,         bg: 'bg-orange-100 dark:bg-orange-500/20',text: 'text-orange-500' },
        { icon: <TbCircleCheck />,   label: 'WOs Done (month)',  value: completedMonth,       bg: 'bg-emerald-100 dark:bg-emerald-500/20',text: 'text-emerald-500' },
    ]

    return (
        <Card>
            <h4 className="mb-4">Team & Assets</h4>
            <div className="grid grid-cols-2 gap-3">
                {stats.map(s => (
                    <div key={s.label} className={classNames('rounded-2xl p-4 flex flex-col gap-3', s.bg)}>
                        <div className={classNames('text-2xl', s.text)}>{s.icon}</div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}

// ── Main ───────────────────────────────────────────────────────────────

const AdminManagerDashboard = () => {
    const navigate = useNavigate()
    const { data, isLoading, error } = useSWR(
        '/dashboard',
        () => apiGetAdminManagerDashboard(),
        { revalidateOnFocus: false },
    )

    const d = data?.data

    if (isLoading) {
        return (
            <Container>
                <div className="flex flex-col xl:flex-row gap-4 mb-4">
                    <div className="flex flex-col gap-4 flex-1">
                        <Skeleton height={176} />
                        <Skeleton height={300} />
                    </div>
                    <div className="xl:w-[350px]">
                        <Skeleton height={500} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <Skeleton height={380} />
                    <Skeleton height={380} />
                    <Skeleton height={380} />
                </div>
            </Container>
        )
    }

    if (error) {
        const status = error?.response?.status
        const message = error?.response?.data?.message || error?.message || 'Unknown error'
        return (
            <Container>
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <p className="text-lg font-semibold text-red-500">Dashboard failed to load</p>
                    <p className="text-sm text-gray-500">{status ? `HTTP ${status}: ` : ''}{message}</p>
                </div>
            </Container>
        )
    }

    const workOrders = d?.work_orders ?? { open: 0, in_progress: 0, on_hold: 0, overdue: 0, completed_month: 0 }
    const pm = d?.pm ?? { active: 0, due_week: 0, due_month: 0 }
    const pmDueSoon = d?.pm_due_soon ?? []
    const recentWos = d?.recent_work_orders ?? []
    const members = d?.members ?? { total_active: 0, technicians: 0 }
    const assets = d?.assets ?? { total: 0 }

    return (
        <Container>
            <div className="mb-6">
                <h3 className="mb-1">Dashboard</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {dayjs().format('dddd, MMMM D YYYY')}
                </p>
            </div>

            {/* Top row */}
            <div className="flex flex-col xl:flex-row gap-4 mb-4">
                <div className="flex flex-col gap-4 flex-1 xl:max-w-[calc(100%-370px)]">
                    <WoOverviewCard d={workOrders} />
                    <WoBarChartCard workOrders={workOrders} recentWos={recentWos} />
                </div>
                <div className="xl:w-[350px]">
                    <PmSidebarCard
                        pm={pm}
                        pmDueSoon={pmDueSoon}
                        onViewAll={() => navigate('/concepts/pm/pm-list')}
                    />
                </div>
            </div>

            {/* Bottom 3-col grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="md:col-span-1 xl:col-span-1">
                    <OpenWorkOrdersCard
                        wos={recentWos}
                        onViewAll={() => navigate('/concepts/work-orders/work-order-list')}
                        onRow={(id) => navigate(`/concepts/work-orders/work-order-details/${id}`)}
                    />
                </div>
                <div className="md:col-span-1 xl:col-span-1">
                    <WoStatusDonutCard d={workOrders} />
                </div>
                <div className="md:col-span-2 xl:col-span-1">
                    <TeamAssetsCard
                        members={members}
                        assets={assets}
                        completedMonth={workOrders.completed_month ?? 0}
                    />
                </div>
            </div>
        </Container>
    )
}

export default AdminManagerDashboard
