import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { useNavigate } from 'react-router-dom'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Skeleton from '@/components/ui/Skeleton'
import Chart from '@/components/shared/Chart'
import Segment from '@/components/ui/Segment'
import Timeline from '@/components/ui/Timeline'
import ScrollBar from '@/components/ui/ScrollBar'
import GanttChart from '@/components/shared/GanttChart'
import { apiGetAdminManagerDashboard } from '@/services/DashboardService'
import classNames from '@/utils/classNames'
import isLastChild from '@/utils/isLastChild'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { apiUpdateWorkOrder } from '@/services/WorkOrdersService'
import {
    TbProgressBolt, TbCopyCheck, TbArrowDownToArc,
    TbCircleCheck, TbCircleCheckFilled, TbCalendar,
    TbRefresh, TbAlertTriangle, TbLoader,
    TbPlayerPause, TbCalendarTime,
} from 'react-icons/tb'
import { COLORS } from '@/constants/chart.constant'
import type { ExtendedTask } from '@/components/shared/GanttChart'
import type { ReactNode } from 'react'

dayjs.extend(relativeTime)

// ── Types ──────────────────────────────────────────────────────────────

type WoItem = {
    id: number; code: string; title: string
    asset?: { name: string } | null
    priority: string; status: string
    due_at?: string | null; created_at?: string | null
}

type PmItem = {
    id: number; code: string; name: string; priority: string
    assigned_to?: string | null; next_run_at?: string | null
}

// ── Colour maps (same as CurrentTasks.labelClass) ──────────────────────

const labelClass: Record<string, string> = {
    critical: 'bg-red-200 dark:bg-red-200 dark:text-gray-900',
    high:     'bg-orange-200 dark:bg-orange-200 dark:text-gray-900',
    medium:   'bg-amber-200 dark:bg-amber-200 dark:text-gray-900',
    low:      'bg-purple-200 dark:bg-purple-200 dark:text-gray-900',
}

const statusTag: Record<string, string> = {
    open:        'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    in_progress: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    on_hold:     'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    completed:   'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    cancelled:   'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
}

const statusAvatarClass: Record<string, string> = {
    open:        'text-gray-900 bg-blue-100 dark:bg-blue-500/20',
    in_progress: 'text-gray-900 bg-amber-100 dark:bg-amber-500/20',
    on_hold:     'text-gray-900 bg-gray-100 dark:bg-gray-700',
    completed:   'text-gray-900 bg-emerald-100 dark:bg-emerald-500/20',
    cancelled:   'text-gray-900 bg-red-100 dark:bg-red-500/20',
}

const statusAvatarIcon: Record<string, ReactNode> = {
    open:        <TbProgressBolt />,
    in_progress: <TbLoader />,
    on_hold:     <TbPlayerPause />,
    completed:   <TbCircleCheck />,
    cancelled:   <TbAlertTriangle />,
}

const ganttColors: Record<string, string> = {
    open:        '#2a85ff',
    in_progress: '#fbc13e',
    on_hold:     '#94a3b8',
    overdue:     '#ff6a55',
    completed:   '#10b981',
}

const capitalize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

// ── 1. WO Overview  (= ProjectOverview) ───────────────────────────────

type KpiBoxProps = { title: string; value: number; icon: ReactNode; className: string }

const KpiBox = ({ title, value, icon, className }: KpiBoxProps) => (
    <div className={classNames('rounded-2xl p-4 flex flex-col justify-center', className)}>
        <div className="flex justify-between items-center relative">
            <div>
                <div className="mb-4 text-gray-900 font-bold">{title}</div>
                <h1 className="mb-1 text-gray-900">{value}</h1>
            </div>
            <div className="flex items-center justify-center min-h-12 min-w-12 max-h-12 max-w-12 bg-gray-900 text-white rounded-full text-2xl">
                {icon}
            </div>
        </div>
    </div>
)

const WoOverviewCard = ({
    wo, onViewAll,
}: { wo: Record<string, number>; onViewAll: () => void }) => (
    <Card>
        <div className="flex items-center justify-between">
            <h4>Overview</h4>
            <Button size="sm" onClick={onViewAll}>All work orders</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl mt-4">
            <KpiBox
                title="Open work orders"
                value={wo.open ?? 0}
                icon={<TbProgressBolt />}
                className="bg-sky-100 dark:bg-sky-500/20"
            />
            <KpiBox
                title="Completed (month)"
                value={wo.completed_month ?? 0}
                icon={<TbCopyCheck />}
                className="bg-emerald-100 dark:bg-emerald-500/20"
            />
            <KpiBox
                title="Overdue"
                value={wo.overdue ?? 0}
                icon={<TbArrowDownToArc />}
                className={wo.overdue ? 'bg-red-100 dark:bg-red-500/20' : 'bg-purple-100 dark:bg-purple-500/20'}
            />
        </div>
    </Card>
)

// ── 2. WO Gantt Schedule  (= Schedule) ────────────────────────────────

const mapWoToGanttTask = (wo: WoItem): ExtendedTask => {
    const start = wo.created_at
        ? dayjs(wo.created_at).toDate()
        : dayjs().subtract(7, 'day').toDate()

    let end = wo.due_at
        ? dayjs(wo.due_at).toDate()
        : dayjs(start).add(14, 'day').toDate()

    if (end <= start) {
        end = dayjs(start).add(1, 'day').toDate()
    }

    const progress =
        wo.status === 'completed' ? 100 :
        wo.status === 'in_progress' ? 50 : 0

    const isOverdue = wo.due_at && new Date(wo.due_at) < new Date() && wo.status !== 'completed'

    return {
        id: String(wo.id),
        name: `${wo.code} — ${wo.title}`,
        start,
        end,
        type: 'task',
        progress,
        barVariant: isOverdue ? 'overdue' : wo.status,
    }
}

const WoScheduleCard = ({ wos }: { wos: WoItem[] }) => {
    const activeWos = wos.filter(w => w.status !== 'cancelled')
    const [tasks, setTasks] = useState<ExtendedTask[]>([])

    useEffect(() => {
        if (activeWos.length > 0 && tasks.length === 0) {
            setTasks(activeWos.map(mapWoToGanttTask))
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeWos.length])

    return (
        <Card>
            <h4>Schedule</h4>
            <div className="mt-4 overflow-x-auto">
                {tasks.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">No work orders to display</p>
                ) : (
                    <GanttChart
                        tasks={tasks}
                        colorsMap={ganttColors}
                        onDateChange={(task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t))}
                        onProgressChange={(task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t))}
                        onExpanderClick={(task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t))}
                    />
                )}
            </div>
        </Card>
    )
}

// ── 3. PM Upcoming Sidebar  (= UpcomingSchedule) ──────────────────────

const PmScheduleCard = ({
    pm, pmDueSoon, onViewAll,
}: {
    pm: { active: number; due_week: number; due_month: number }
    pmDueSoon: PmItem[]
    onViewAll: () => void
}) => (
    <Card>
        <div className="flex flex-col md:flex-row xl:flex-col md:gap-10 xl:gap-0">
            {/* Stats panel — replaces the Calendar */}
            <div className="flex items-center mx-auto w-[280px] py-4">
                <div className="w-full">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-2xl p-3 bg-purple-50 dark:bg-purple-500/10">
                            <p className="text-2xl font-bold heading-text">{pm.active}</p>
                            <p className="text-xs text-gray-500 mt-1">Active</p>
                        </div>
                        <div className="rounded-2xl p-3 bg-amber-50 dark:bg-amber-500/10">
                            <p className="text-2xl font-bold heading-text">{pm.due_week}</p>
                            <p className="text-xs text-gray-500 mt-1">This week</p>
                        </div>
                        <div className="rounded-2xl p-3 bg-sky-50 dark:bg-sky-500/10">
                            <p className="text-2xl font-bold heading-text">{pm.due_month}</p>
                            <p className="text-xs text-gray-500 mt-1">This month</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Due soon list — replaces the events list */}
            <div className="w-full">
                <div className="my-6 flex items-center justify-between">
                    <h5>Upcoming PM Plans</h5>
                    <Button size="sm" variant="solid" onClick={onViewAll}>
                        View all
                    </Button>
                </div>
                <div className="w-full">
                    <ScrollBar className="overflow-y-auto h-[280px] xl:max-w-[280px]">
                        <div className="flex flex-col gap-4">
                            {pmDueSoon.length === 0 && (
                                <p className="text-sm text-gray-400 text-center">No PM plans due soon</p>
                            )}
                            {pmDueSoon.map(pm => (
                                <div key={pm.id} className="flex items-center justify-between gap-4 py-1">
                                    <div className="flex items-center gap-3">
                                        <Avatar
                                            className="text-gray-900 bg-purple-100 dark:bg-purple-500/20"
                                            icon={<TbCalendarTime />}
                                            shape="round"
                                            size={35}
                                        />
                                        <div>
                                            <div className="font-bold heading-text truncate max-w-[140px]">{pm.name}</div>
                                            <div className="font-normal text-gray-500 text-sm">PM Plan · {pm.code}</div>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="font-semibold heading-text text-sm">
                                            {pm.next_run_at ? dayjs(pm.next_run_at).format('MMM D') : '—'}
                                        </span>
                                        <br />
                                        <small className="text-gray-400">
                                            {pm.next_run_at ? dayjs(pm.next_run_at).format('YYYY') : ''}
                                        </small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollBar>
                </div>
            </div>
        </div>

        <div className="mt-4">
            <Button block size="sm" variant="twoTone" onClick={onViewAll}>
                View all PM plans
            </Button>
        </div>
    </Card>
)

// ── 4. Open Work Orders  (= CurrentTasks — exact copy) ─────────────────

type WoTask = WoItem & { checked: boolean }

const OpenWorkOrdersCard = ({
    wos, onViewAll, onRow,
}: { wos: WoItem[]; onViewAll: () => void; onRow: (id: number) => void }) => {
    const active = wos.filter(w => w.status === 'open' || w.status === 'in_progress')
    const [tasks, setTasks] = useState<WoTask[]>([])

    useEffect(() => {
        if (tasks.length === 0) {
            setTasks(active.map(w => ({ ...w, checked: false })))
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active.length])

    const handleToggle = async (id: number) => {
        const task = tasks.find(t => t.id === id)
        if (!task) return
        const newChecked = !task.checked
        setTasks(prev => prev.map(t => t.id === id ? { ...t, checked: newChecked } : t))
        try {
            await apiUpdateWorkOrder(id, { status: newChecked ? 'completed' : 'open' } as never)
        } catch {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, checked: !newChecked } : t))
            toast.push(
                <Notification type="danger" title="Failed to update status" />,
                { placement: 'top-center' },
            )
        }
    }

    return (
        <Card>
            <div className="flex items-center justify-between">
                <h4>Current work orders</h4>
                <Button size="sm" onClick={onViewAll}>All tasks</Button>
            </div>
            <div className="mt-4">
                {tasks.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">No open work orders</p>
                )}
                {tasks.map((wo, i) => (
                    <div
                        key={wo.id}
                        className={classNames(
                            'flex items-center justify-between py-4 border-gray-200 dark:border-gray-600',
                            !isLastChild(tasks, i) && 'border-b',
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <button
                                className="text-[26px] cursor-pointer"
                                onClick={() => handleToggle(wo.id)}
                            >
                                {wo.checked
                                    ? <TbCircleCheckFilled className="text-primary" />
                                    : <TbCircleCheck className="hover:text-primary" />}
                            </button>
                            <div>
                                <div
                                    className={classNames(
                                        'heading-text font-bold mb-1 cursor-pointer hover:text-primary transition-colors',
                                        wo.checked && 'line-through opacity-50',
                                    )}
                                    onClick={() => onRow(wo.id)}
                                >
                                    <span className="font-mono text-xs text-purple-500 mr-1.5">{wo.code}</span>
                                    {wo.title}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                    <TbCalendar className="text-lg" />
                                    {wo.due_at ? dayjs(wo.due_at).format('MMMM DD') : 'No due date'}
                                </div>
                            </div>
                        </div>
                        <div>
                            <Tag className={`mr-2 rtl:ml-2 mb-2 ${labelClass[wo.priority] ?? ''}`}>
                                {capitalize(wo.priority)}
                            </Tag>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}

// ── 5. WO Status Overview  (= TaskOverview — exact copy) ───────────────

type TimeRange = 'status' | 'monthly'

type OverviewChartData = {
    total: number
    onGoing: number
    finished: number
    series: { name: string; data: number[] }[]
    range: string[]
}

const ChartLegend = ({
    label, value, color, showBadge = true,
}: { label: string; value: number; color?: string; showBadge?: boolean }) => (
    <div className="flex gap-2">
        {showBadge && (
            <span
                className="mt-2.5 w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
            />
        )}
        <div>
            <h5 className="font-bold">{value}</h5>
            <p>{label}</p>
        </div>
    </div>
)

type MonthlyStatItem = { month: string; active: number; completed: number }

const WoStatusOverviewCard = ({
    wo, monthlyStats,
}: { wo: Record<string, number>; monthlyStats: MonthlyStatItem[] }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('status')

    const data = useMemo<Record<TimeRange, OverviewChartData>>(() => {
        // "Status" view — current WO status distribution
        const statusData: OverviewChartData = {
            total: (wo.open ?? 0) + (wo.in_progress ?? 0) + (wo.on_hold ?? 0) + (wo.overdue ?? 0),
            onGoing: (wo.open ?? 0) + (wo.in_progress ?? 0),
            finished: wo.completed_month ?? 0,
            series: [
                { name: 'Active', data: [wo.open ?? 0, wo.in_progress ?? 0, 0, 0] },
                { name: 'Blocked', data: [0, 0, wo.on_hold ?? 0, wo.overdue ?? 0] },
            ],
            range: ['Open', 'In Progress', 'On Hold', 'Overdue'],
        }

        // "Monthly" view — real monthly data from backend (last 6 months)
        const monthlyData: OverviewChartData = {
            total: monthlyStats.reduce((s, m) => s + m.active + m.completed, 0),
            onGoing: monthlyStats.reduce((s, m) => s + m.active, 0),
            finished: monthlyStats.reduce((s, m) => s + m.completed, 0),
            series: [
                { name: 'On Going', data: monthlyStats.map(m => m.active) },
                { name: 'Finished', data: monthlyStats.map(m => m.completed) },
            ],
            range: monthlyStats.map(m => m.month),
        }

        return { status: statusData, monthly: monthlyData }
    }, [wo, monthlyStats])

    const current = data[timeRange]

    return (
        <Card>
            <div className="flex sm:flex-row flex-col md:items-center justify-between mb-6 gap-4">
                <h4>Task overview</h4>
                <Segment value={timeRange} size="sm" onChange={(val) => setTimeRange(val as TimeRange)}>
                    <Segment.Item value="status">Status</Segment.Item>
                    <Segment.Item value="monthly">Monthly</Segment.Item>
                </Segment>
            </div>

            <div className="flex items-center justify-between mb-4">
                <ChartLegend showBadge={false} label="Total Tasks" value={current.total} />
                <div className="flex gap-x-6">
                    <ChartLegend color={COLORS[7]} label={current.series[0].name} value={current.onGoing} />
                    <ChartLegend color={COLORS[8]} label={current.series[1].name} value={current.finished} />
                </div>
            </div>

            <Chart
                key={timeRange}
                series={current.series}
                xAxis={current.range}
                type="bar"
                customOptions={{
                    colors: [COLORS[7], COLORS[8]],
                    legend: { show: false },
                    plotOptions: {
                        bar: {
                            columnWidth: '15px',
                            borderRadius: 4,
                            borderRadiusApplication: 'end',
                        },
                    },
                }}
            />
        </Card>
    )
}

// ── 6. Recent WO Activity  (= RecentActivity) ─────────────────────────

const RecentWoActivityCard = ({
    wos, onViewAll, onRow,
}: { wos: WoItem[]; onViewAll: () => void; onRow: (id: number) => void }) => (
    <Card>
        <div className="flex sm:flex-row flex-col md:items-center justify-between mb-6 gap-4">
            <h4>Recent activity</h4>
            <Button size="sm" onClick={onViewAll}>View all</Button>
        </div>
        <div className="mt-4">
            <ScrollBar className="max-h-[390px]">
                <Timeline>
                    {wos.length === 0 && (
                        <Timeline.Item>
                            <p className="text-sm text-gray-400">No recent work orders</p>
                        </Timeline.Item>
                    )}
                    {wos.map(wo => (
                        <Timeline.Item
                            key={wo.id}
                            media={
                                <Avatar
                                    className={statusAvatarClass[wo.status] ?? 'text-gray-900 bg-gray-100 dark:bg-gray-700'}
                                    icon={statusAvatarIcon[wo.status] ?? <TbRefresh />}
                                    shape="circle"
                                    size={35}
                                />
                            }
                        >
                            <div className="mt-1">
                                <div className="flex flex-col gap-y-0.5">
                                    <span className="font-bold heading-text">{wo.code}</span>
                                    <span className="text-xs font-semibold text-gray-500">
                                        {wo.due_at
                                            ? `Due ${dayjs(wo.due_at).format('MMM D, YYYY')}`
                                            : 'No due date'}
                                    </span>
                                </div>
                                <div
                                    className="mt-2 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => onRow(wo.id)}
                                >
                                    <span className="font-bold heading-text">{wo.title} </span>
                                    <span className="mx-1">status is</span>
                                    <Tag className={`text-xs ${statusTag[wo.status]}`}>
                                        {capitalize(wo.status)}
                                    </Tag>
                                </div>
                            </div>
                        </Timeline.Item>
                    ))}
                </Timeline>
            </ScrollBar>
        </div>
    </Card>
)

// ── Loading skeleton ───────────────────────────────────────────────────

const LoadingSkeleton = () => (
    <Container>
        <div className="flex flex-col gap-4">
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex flex-col gap-4 flex-1 xl:max-w-[calc(100%-350px)]">
                    <Skeleton height={180} />
                    <Skeleton height={320} />
                </div>
                <div><Skeleton height={520} className="xl:w-[350px]" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <Skeleton height={380} />
                <Skeleton height={380} />
                <Skeleton height={380} />
            </div>
        </div>
    </Container>
)

// ── Main ───────────────────────────────────────────────────────────────

const AdminManagerDashboard = () => {
    const navigate = useNavigate()
    const { data, isLoading, error } = useSWR(
        '/dashboard',
        () => apiGetAdminManagerDashboard(),
        { revalidateOnFocus: false },
    )

    if (isLoading) return <LoadingSkeleton />

    if (error) {
        const status  = error?.response?.status
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

    const d            = data?.data
    const wo           = d?.work_orders ?? { open: 0, in_progress: 0, on_hold: 0, overdue: 0, completed_month: 0 }
    const pm           = d?.pm ?? { active: 0, due_week: 0, due_month: 0 }
    const pmDueSoon    = d?.pm_due_soon ?? []
    const recentWos    = d?.recent_work_orders ?? []
    const monthlyStats = d?.monthly_stats ?? []

    return (
        <Container>
            <div className="flex flex-col gap-4">

                {/* ── Top row ──────────────────────────────────────── */}
                <div className="flex flex-col xl:flex-row gap-4">
                    <div className="flex flex-col gap-4 flex-1 xl:max-w-[calc(100%-350px)]">
                        <WoOverviewCard
                            wo={wo}
                            onViewAll={() => navigate('/concepts/work-orders/work-order-list')}
                        />
                        <WoScheduleCard wos={recentWos} />
                    </div>
                    <div>
                        <PmScheduleCard
                            pm={pm}
                            pmDueSoon={pmDueSoon}
                            onViewAll={() => navigate('/concepts/pm/pm-list')}
                        />
                    </div>
                </div>

                {/* ── Bottom 3-col grid ─────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div className="md:col-span-1 xl:col-span-1 order-1">
                        <OpenWorkOrdersCard
                            wos={recentWos}
                            onViewAll={() => navigate('/concepts/work-orders/work-order-list')}
                            onRow={(id) => navigate(`/concepts/work-orders/work-order-details/${id}`)}
                        />
                    </div>
                    <div className="md:col-span-1 xl:col-span-1 order-2 xl:order-3">
                        <RecentWoActivityCard
                            wos={recentWos}
                            onViewAll={() => navigate('/concepts/work-orders/work-order-list')}
                            onRow={(id) => navigate(`/concepts/work-orders/work-order-details/${id}`)}
                        />
                    </div>
                    <div className="md:col-span-2 xl:col-span-1 order-3 xl:order-2">
                        <WoStatusOverviewCard wo={wo} monthlyStats={monthlyStats} />
                    </div>
                </div>

            </div>
        </Container>
    )
}

export default AdminManagerDashboard
