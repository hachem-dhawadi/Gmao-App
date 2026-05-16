import { useState } from 'react'
import useSWR from 'swr'
import { useNavigate } from 'react-router-dom'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Avatar from '@/components/ui/Avatar'
import Table from '@/components/ui/Table'
import Segment from '@/components/ui/Segment'
import Switcher from '@/components/ui/Switcher'
import Chart from '@/components/shared/Chart'
import Loading from '@/components/shared/Loading'
import GrowShrinkValue from '@/components/shared/GrowShrinkValue'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ApexChart from 'react-apexcharts'
import { COLORS } from '@/constants/chart.constant'
import classNames from '@/utils/classNames'
import { apiGetTechnicianDashboard } from '@/services/DashboardService'
import { apiUpdateWorkOrder } from '@/services/WorkOrdersService'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
    TbClipboardList,
    TbLoader,
    TbRefreshAlert,
    TbCircleCheck,
    TbAlertTriangle,
    TbArrowUp,
    TbArrowDown,
    TbMinus,
} from 'react-icons/tb'
import type { ReactNode } from 'react'

dayjs.extend(relativeTime)

// ─── SummarySegment (identical to KpiSummary in Marketing Dashboard) ──────────

type SummarySegmentProps = {
    title: string
    value: string | number
    growShrink: number
    icon: ReactNode
    iconClass: string
    className?: string
}

const SummarySegment = ({
    title,
    value,
    growShrink,
    icon,
    iconClass,
    className,
}: SummarySegmentProps) => (
    <div className={classNames('flex flex-col gap-2 py-4 px-6', className)}>
        <div
            className={classNames(
                'flex items-center justify-center min-h-12 min-w-12 max-h-12 max-w-12 text-gray-900 rounded-full text-2xl',
                iconClass,
            )}
        >
            {icon}
        </div>
        <div className="mt-4">
            <div className="mb-1">{title}</div>
            <h3 className="mb-1">{value}</h3>
            <div className="inline-flex items-center flex-wrap gap-1">
                <GrowShrinkValue
                    className="font-bold"
                    value={growShrink}
                    suffix="%"
                    positiveIcon="+"
                    negativeIcon=""
                />
                <span>vs last month</span>
            </div>
        </div>
    </div>
)

// ─── Status / Priority maps ───────────────────────────────────────────────────

const woStatus: Record<string, { label: string; className: string }> = {
    open:        { label: 'Open',        className: 'bg-sky-200' },
    in_progress: { label: 'In Progress', className: 'bg-amber-200' },
    on_hold:     { label: 'On Hold',     className: 'bg-gray-200' },
    completed:   { label: 'Completed',   className: 'bg-emerald-200' },
}

const priorityIcon: Record<string, ReactNode> = {
    critical: <TbAlertTriangle />,
    high:     <TbArrowUp />,
    medium:   <TbMinus />,
    low:      <TbArrowDown />,
}

const priorityTagClass: Record<string, string> = {
    critical: 'bg-red-200',
    high:     'bg-amber-200',
    medium:   'bg-sky-200',
    low:      'bg-gray-200',
}

const priorityIconColor: Record<string, string> = {
    critical: 'text-red-600',
    high:     'text-amber-600',
    medium:   'text-sky-600',
    low:      'text-gray-500',
}

const RADAR_LABELS = ['Completion', 'On Time', 'Response', 'Workload', 'Efficiency']

const { Tr, Td, TBody, THead, Th } = Table

// ─── TechnicianDashboard ──────────────────────────────────────────────────────

const TechnicianDashboard = () => {
    const navigate = useNavigate()
    const [woView, setWoView] = useState<'all' | 'active' | 'completed'>('all')

    const { data, isLoading, mutate } = useSWR(
        '/dashboard/my',
        () => apiGetTechnicianDashboard(),
        { revalidateOnFocus: false },
    )

    const d = data?.data

    // ── Derived KPI values ────────────────────────────────────────────────────

    const open          = d?.my_work_orders.open          ?? 0
    const inProg        = d?.my_work_orders.in_progress   ?? 0
    const completedWeek = d?.my_work_orders.completed_week ?? 0

    // ── Real chart data from backend monthly_stats ───────────────────────────

    const chartMonths     = d?.monthly_stats.map((s) => s.month)        ?? []
    const activeSeries    = d?.monthly_stats.map((s) => s.active)       ?? []
    const completedSeries = d?.monthly_stats.map((s) => s.completed)    ?? []

    const chartSeries = (() => {
        const activeBar = {
            name: 'Active WOs',
            type: 'column',
            data: activeSeries,
            color: COLORS[9],
        }
        const completedLine = {
            name: 'Completed',
            type: 'line',
            data: completedSeries,
            color: COLORS[0],
        }
        if (woView === 'all')       return [activeBar, completedLine]
        if (woView === 'active')    return [activeBar]
        return [completedLine]
    })()

    // ── Real performance scores from backend ──────────────────────────────────

    const scores = d?.performance_scores
    const radarSeries = scores
        ? [scores.completion, scores.on_time, scores.response, scores.workload, scores.efficiency]
        : [0, 0, 0, 0, 0]

    // ── Switcher: toggle open ↔ in_progress ──────────────────────────────────

    const handleSwitcher = async (checked: boolean, woId: number, currentStatus: string) => {
        const newStatus = checked ? 'in_progress' : 'open'

        // Optimistic update in SWR cache
        await mutate(
            (prev) => {
                if (!prev?.data) return prev
                return {
                    ...prev,
                    data: {
                        ...prev.data,
                        my_recent_work_orders: prev.data.my_recent_work_orders.map((wo) =>
                            wo.id === woId ? { ...wo, status: newStatus } : wo,
                        ),
                    },
                }
            },
            { revalidate: false },
        )

        try {
            await apiUpdateWorkOrder(woId, { status: newStatus } as never)
            // Revalidate to sync real counts/scores
            mutate()
        } catch {
            // Roll back on error
            await mutate(
                (prev) => {
                    if (!prev?.data) return prev
                    return {
                        ...prev,
                        data: {
                            ...prev.data,
                            my_recent_work_orders: prev.data.my_recent_work_orders.map((wo) =>
                                wo.id === woId ? { ...wo, status: currentStatus } : wo,
                            ),
                        },
                    }
                },
                { revalidate: false },
            )
            toast.push(
                <Notification type="danger" title="Failed to update status" />,
                { placement: 'top-center' },
            )
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Loading loading={isLoading}>
            {d && (
                <Container>
                    <div className="flex flex-col gap-4">

                        {/* ── KPI Summary Card ───────────────────────────────── */}
                        <Card>
                            <div className="flex items-center justify-between">
                                <h4>My Work Order Summary</h4>
                            </div>
                            <div className="grid md:grid-cols-2 xl:grid-cols-4 mt-6">
                                <SummarySegment
                                    title="My Open WOs"
                                    value={open}
                                    growShrink={d.my_work_orders.open_grow_shrink}
                                    icon={<TbClipboardList />}
                                    iconClass="bg-rose-200"
                                    className="border-b border-r-0 md:border-b-0 md:ltr:border-r md:rtl:border-l border-gray-200 dark:border-gray-700"
                                />
                                <SummarySegment
                                    title="In Progress"
                                    value={inProg}
                                    growShrink={d.my_work_orders.in_progress_grow_shrink}
                                    icon={<TbLoader />}
                                    iconClass="bg-sky-200"
                                    className="border-b md:border-b-0 xl:ltr:border-r xl:rtl:border-l border-gray-200 dark:border-gray-700"
                                />
                                <SummarySegment
                                    title="Completion Rate"
                                    value={`${scores?.completion ?? 0}%`}
                                    growShrink={d.my_work_orders.completion_grow_shrink}
                                    icon={<TbRefreshAlert />}
                                    iconClass="bg-emerald-200"
                                    className="border-b border-r-0 md:border-b-0 md:ltr:border-r md:rtl:border-l border-gray-200 dark:border-gray-700"
                                />
                                <SummarySegment
                                    title="Done This Week"
                                    value={completedWeek}
                                    growShrink={d.my_work_orders.done_week_grow_shrink}
                                    icon={<TbCircleCheck />}
                                    iconClass="bg-purple-200"
                                />
                            </div>
                        </Card>

                        {/* ── Charts row ─────────────────────────────────────── */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-x-4">

                            {/* WO Performance — col-span-2 */}
                            <div className="col-span-2">
                                <Card>
                                    <div className="flex items-center justify-between">
                                        <h4>WO Performance</h4>
                                        <Segment
                                            className="gap-1"
                                            value={woView}
                                            size="sm"
                                            onChange={(val) =>
                                                setWoView(val as 'all' | 'active' | 'completed')
                                            }
                                        >
                                            <Segment.Item value="all">All</Segment.Item>
                                            <Segment.Item value="active">Active</Segment.Item>
                                            <Segment.Item value="completed">Completed</Segment.Item>
                                        </Segment>
                                    </div>
                                    <div className="mt-6">
                                        <ApexChart
                                            key={woView}
                                            options={{
                                                chart: {
                                                    type: 'line',
                                                    zoom: { enabled: false },
                                                    toolbar: { show: false },
                                                },
                                                legend: { show: false },
                                                stroke: {
                                                    width:
                                                        woView === 'completed'
                                                            ? 2.5
                                                            : woView === 'active'
                                                            ? 0
                                                            : [0, 2.5],
                                                    curve: 'smooth',
                                                    lineCap: 'round',
                                                },
                                                states: {
                                                    hover: { filter: { type: 'none' } },
                                                },
                                                tooltip: {
                                                    custom: function ({ series, dataPointIndex }) {
                                                        const renderActive = () => `
                                                            <div class="flex items-center gap-2">
                                                                <div class="h-[10px] w-[10px] rounded-full" style="background-color: ${COLORS[9]}"></div>
                                                                <div class="flex gap-2">Active: <span class="font-bold">${series[0][dataPointIndex]}</span></div>
                                                            </div>`
                                                        const renderCompleted = () => `
                                                            <div class="flex items-center gap-2">
                                                                <div class="h-[10px] w-[10px] rounded-full" style="background-color: ${COLORS[0]}"></div>
                                                                <div class="flex gap-2">Completed: <span class="font-bold">${series[woView === 'all' ? 1 : 0][dataPointIndex]}</span></div>
                                                            </div>`
                                                        const render = () => {
                                                            if (woView === 'all')
                                                                return `${renderActive()}${renderCompleted()}`
                                                            if (woView === 'active') return renderActive()
                                                            return renderCompleted()
                                                        }
                                                        return `
                                                            <div class="py-2 px-4 rounded-xl">
                                                                <div class="flex flex-col gap-2">
                                                                    <div>${chartMonths[dataPointIndex] ?? ''}</div>
                                                                    ${render()}
                                                                </div>
                                                            </div>`
                                                    },
                                                },
                                                labels: chartMonths,
                                                yaxis:
                                                    woView === 'all'
                                                        ? [{}, { opposite: true }]
                                                        : [],
                                                plotOptions: {
                                                    bar: {
                                                        horizontal: false,
                                                        columnWidth: '35px',
                                                        borderRadius: 4,
                                                        borderRadiusApplication: 'end',
                                                    },
                                                },
                                            }}
                                            series={chartSeries}
                                            height={450}
                                        />
                                    </div>
                                </Card>
                            </div>

                            {/* Performance Score radar — col-span-1 */}
                            <Card>
                                <div className="flex items-center justify-between">
                                    <h4>Performance Score</h4>
                                </div>
                                <div className="mt-6">
                                    <Chart
                                        type="radar"
                                        customOptions={{
                                            xaxis: {
                                                categories: RADAR_LABELS,
                                                labels: {
                                                    formatter: (val: string) =>
                                                        `${RADAR_LABELS.indexOf(val) + 1}`,
                                                },
                                            },
                                            yaxis: { show: false },
                                            tooltip: {
                                                custom: function ({
                                                    dataPointIndex,
                                                }: {
                                                    dataPointIndex: number
                                                }) {
                                                    return `
                                                        <div class="py-2 px-4 rounded-xl">
                                                            <div class="flex items-center gap-2">
                                                                <div class="h-[10px] w-[10px] rounded-full" style="background-color: ${COLORS[0]}"></div>
                                                                <div class="flex gap-2">${RADAR_LABELS[dataPointIndex]}: <span class="font-bold">${radarSeries[dataPointIndex]}%</span></div>
                                                            </div>
                                                        </div>`
                                                },
                                            },
                                        }}
                                        series={[{ name: 'Performance Score', data: radarSeries }]}
                                        height={250}
                                    />
                                    <div className="flex flex-col gap-4 mt-4">
                                        {RADAR_LABELS.map((label, index) => (
                                            <div key={label} className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="rounded-full h-8 w-8 border-2 border-gray-200 dark:border-gray-600 font-bold heading-text flex items-center justify-center shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <div className="heading-text">{label}</div>
                                                </div>
                                                <div className="border-dashed border-[1.5px] border-gray-300 dark:border-gray-500 flex-1" />
                                                <span
                                                    className={classNames(
                                                        'rounded-full px-2 py-1 text-white text-sm',
                                                        radarSeries[index] > 75 && 'bg-success',
                                                        radarSeries[index] <= 30 && 'bg-error',
                                                        radarSeries[index] > 30 &&
                                                            radarSeries[index] <= 75 &&
                                                            'bg-warning',
                                                    )}
                                                >
                                                    {radarSeries[index]}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* ── Recent Work Orders table ───────────────────────── */}
                        <Card>
                            <div className="flex items-center justify-between">
                                <h4>Recent Work Orders</h4>
                                <Button
                                    size="sm"
                                    variant="solid"
                                    onClick={() =>
                                        navigate('/concepts/work-orders/work-order-list')
                                    }
                                >
                                    View all
                                </Button>
                            </div>
                            <div className="mt-6">
                                <Table hoverable={false}>
                                    <THead>
                                        <Tr>
                                            <Th>Active</Th>
                                            <Th>Work Order</Th>
                                            <Th>Status</Th>
                                            <Th>Priority</Th>
                                            <Th>Asset</Th>
                                            <Th>Due Date</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {d.my_recent_work_orders.length === 0 && (
                                            <Tr>
                                                <Td colSpan={6}>
                                                    <p className="text-center text-gray-400 py-6">
                                                        No work orders assigned to you
                                                    </p>
                                                </Td>
                                            </Tr>
                                        )}
                                        {d.my_recent_work_orders.map((wo) => {
                                            const isToggleable =
                                                wo.status === 'open' || wo.status === 'in_progress'
                                            return (
                                                <Tr key={wo.id}>
                                                    <Td>
                                                        <Switcher
                                                            checked={wo.status === 'in_progress'}
                                                            disabled={!isToggleable}
                                                            onChange={(checked) =>
                                                                handleSwitcher(
                                                                    checked,
                                                                    wo.id,
                                                                    wo.status,
                                                                )
                                                            }
                                                        />
                                                    </Td>
                                                    <Td
                                                        className="cursor-pointer"
                                                        onClick={() =>
                                                            navigate(
                                                                `/concepts/work-orders/work-order-details/${wo.id}`,
                                                            )
                                                        }
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Avatar
                                                                className="bg-transparent dark:bg-transparent p-2 border-2 border-gray-200 dark:border-gray-600"
                                                                size={50}
                                                                shape="round"
                                                                icon={
                                                                    <div
                                                                        className={classNames(
                                                                            'text-2xl',
                                                                            priorityIconColor[
                                                                                wo.priority
                                                                            ],
                                                                        )}
                                                                    >
                                                                        {priorityIcon[
                                                                            wo.priority
                                                                        ] ?? <TbMinus />}
                                                                    </div>
                                                                }
                                                            />
                                                            <div className="whitespace-nowrap">
                                                                <div className="heading-text font-bold">
                                                                    {wo.title}
                                                                </div>
                                                                <span className="font-mono text-xs text-purple-500">
                                                                    {wo.code}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        <Tag
                                                            className={classNames(
                                                                woStatus[wo.status]?.className ??
                                                                    '',
                                                            )}
                                                        >
                                                            {woStatus[wo.status]?.label ??
                                                                wo.status}
                                                        </Tag>
                                                    </Td>
                                                    <Td>
                                                        <Tag
                                                            className={classNames(
                                                                priorityTagClass[wo.priority] ?? '',
                                                            )}
                                                        >
                                                            {wo.priority.charAt(0).toUpperCase() +
                                                                wo.priority.slice(1)}
                                                        </Tag>
                                                    </Td>
                                                    <Td>
                                                        <div className="whitespace-nowrap">
                                                            {wo.asset?.name ?? '—'}
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        {wo.due_at ? (
                                                            <div
                                                                className={classNames(
                                                                    'whitespace-nowrap',
                                                                    new Date(wo.due_at) <
                                                                        new Date() &&
                                                                        wo.status !== 'completed'
                                                                        ? 'text-red-500 font-semibold'
                                                                        : '',
                                                                )}
                                                            >
                                                                {dayjs(wo.due_at).format(
                                                                    'DD MMM YYYY',
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div>—</div>
                                                        )}
                                                    </Td>
                                                </Tr>
                                            )
                                        })}
                                    </TBody>
                                </Table>
                            </div>
                        </Card>
                    </div>
                </Container>
            )}
        </Loading>
    )
}

export default TechnicianDashboard
