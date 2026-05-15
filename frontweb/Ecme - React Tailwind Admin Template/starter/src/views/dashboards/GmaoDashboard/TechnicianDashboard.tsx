import useSWR from 'swr'
import { useNavigate } from 'react-router-dom'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Skeleton from '@/components/ui/Skeleton'
import Progress from '@/components/ui/Progress'
import StatCard from './components/StatCard'
import { apiGetTechnicianDashboard } from '@/services/DashboardService'
import { useSessionUser } from '@/store/authStore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
    TbClipboardList, TbAlertTriangle, TbCircleCheck,
    TbCalendarTime, TbLoader,
} from 'react-icons/tb'

dayjs.extend(relativeTime)

const statusColors: Record<string, string> = {
    open:        'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    in_progress: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    on_hold:     'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    completed:   'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
}

const priorityColors: Record<string, string> = {
    low:      'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    medium:   'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    high:     'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    critical: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
}

const capitalize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const TechnicianDashboard = () => {
    const navigate = useNavigate()
    const userName = useSessionUser((s) => s.user.userName)

    const { data, isLoading } = useSWR(
        '/dashboard/my',
        () => apiGetTechnicianDashboard(),
        { revalidateOnFocus: false },
    )

    const d = data?.data

    if (isLoading) {
        return (
            <Container>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} height={90} />)}
                </div>
                <Skeleton height={280} />
            </Container>
        )
    }

    const firstName = userName?.split(' ')[0] ?? 'Technician'

    const totalWos = (d?.my_work_orders.open ?? 0) + (d?.my_work_orders.in_progress ?? 0) + (d?.my_work_orders.completed_week ?? 0)
    const completionPct = totalWos > 0
        ? Math.round(((d?.my_work_orders.completed_week ?? 0) / totalWos) * 100)
        : 0

    return (
        <Container>
            <div className="mb-6">
                <h3 className="mb-1">Good morning, {firstName} 👋</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {dayjs().format('dddd, MMMM D YYYY')} — here&apos;s your workload today
                </p>
            </div>

            {/* KPI Row + completion rate */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                <StatCard
                    label="My Open WOs"
                    value={d?.my_work_orders.open ?? 0}
                    icon={<TbClipboardList />}
                    iconBg="bg-blue-500"
                />
                <StatCard
                    label="In Progress"
                    value={d?.my_work_orders.in_progress ?? 0}
                    icon={<TbLoader />}
                    iconBg="bg-amber-500"
                />
                <StatCard
                    label="Overdue"
                    value={d?.my_work_orders.overdue ?? 0}
                    icon={<TbAlertTriangle />}
                    iconBg={d?.my_work_orders.overdue ? 'bg-red-500' : 'bg-gray-400'}
                    subColor={d?.my_work_orders.overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}
                    sub={d?.my_work_orders.overdue ? 'Needs attention' : 'All on track'}
                />
                <StatCard
                    label="Done This Week"
                    value={d?.my_work_orders.completed_week ?? 0}
                    icon={<TbCircleCheck />}
                    iconBg="bg-emerald-500"
                />

                {/* Completion rate card */}
                <Card className="col-span-2 md:col-span-4 xl:col-span-1">
                    <div className="flex items-center gap-4 h-full">
                        <Progress
                            percent={completionPct}
                            width={64}
                            variant="circle"
                            strokeWidth={7}
                        />
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Completion</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{completionPct}%</p>
                            <p className="text-xs text-gray-400 mt-0.5">this week</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* PM summary strip */}
            {((d?.my_pm.due_week ?? 0) > 0 || (d?.my_pm.due_month ?? 0) > 0) && (
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex-1">
                        <TbCalendarTime className="text-2xl text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                                {d?.my_pm.due_week} PM {d?.my_pm.due_week === 1 ? 'plan' : 'plans'} due this week
                            </p>
                            <p className="text-xs text-purple-500">{d?.my_pm.due_month} due this month total</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* My recent work orders */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold">My Work Orders</h5>
                        <span
                            className="text-sm text-primary cursor-pointer hover:underline"
                            onClick={() => navigate('/concepts/work-orders/work-order-list')}
                        >
                            View all
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {!d?.my_recent_work_orders.length && (
                            <p className="text-sm text-gray-400 text-center py-6">No work orders assigned to you</p>
                        )}
                        {d?.my_recent_work_orders.map((wo) => (
                            <div
                                key={wo.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                onClick={() => navigate(`/concepts/work-orders/work-order-details/${wo.id}`)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-mono text-xs text-purple-500">{wo.code}</span>
                                        <Tag className={`text-xs ${priorityColors[wo.priority]}`}>
                                            {capitalize(wo.priority)}
                                        </Tag>
                                    </div>
                                    <p className="text-sm font-medium truncate">{wo.title}</p>
                                    {wo.asset && <p className="text-xs text-gray-400 truncate">{wo.asset.name}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <Tag className={`text-xs ${statusColors[wo.status]}`}>
                                        {capitalize(wo.status)}
                                    </Tag>
                                    {wo.due_at && (
                                        <span className={`text-xs ${new Date(wo.due_at) < new Date() ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                                            Due {dayjs(wo.due_at).fromNow()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* My PM due soon */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold">My PM Plans Due Soon</h5>
                        <span
                            className="text-sm text-primary cursor-pointer hover:underline"
                            onClick={() => navigate('/concepts/pm/pm-list')}
                        >
                            View all
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {!d?.my_pm_due_soon.length && (
                            <p className="text-sm text-gray-400 text-center py-6">No PM plans due this month</p>
                        )}
                        {d?.my_pm_due_soon.map((pm) => (
                            <div key={pm.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-mono text-xs text-purple-500">{pm.code}</span>
                                        <Tag className={`text-xs ${priorityColors[pm.priority]}`}>
                                            {capitalize(pm.priority)}
                                        </Tag>
                                    </div>
                                    <p className="text-sm font-medium truncate">{pm.name}</p>
                                </div>
                                <div className="flex-shrink-0 text-right">
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
            </div>
        </Container>
    )
}

export default TechnicianDashboard
