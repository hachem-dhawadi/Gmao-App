import useSWR from 'swr'
import { useNavigate } from 'react-router-dom'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Skeleton from '@/components/ui/Skeleton'
import Chart from '@/components/shared/Chart'
import StatCard from './components/StatCard'
import { apiGetHrDashboard } from '@/services/DashboardService'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
    TbUsers, TbUserCheck, TbUserOff,
} from 'react-icons/tb'

dayjs.extend(relativeTime)

const roleColors: Record<string, string> = {
    admin:      'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-0',
    manager:    'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    technician: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    hr:         'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 border-0',
    viewer:     'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
}

const statusColors: Record<string, string> = {
    active:   'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
}

const roleChartColors = ['#8C62FF', '#2a85ff', '#fbc13e', '#00C7BE', '#94a3b8']

const capitalize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const HrDashboard = () => {
    const navigate = useNavigate()
    const { data, isLoading } = useSWR(
        '/dashboard/hr',
        () => apiGetHrDashboard(),
        { revalidateOnFocus: false },
    )

    const d = data?.data

    if (isLoading) {
        return (
            <Container>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} height={90} />)}
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <Skeleton height={320} />
                    <Skeleton height={320} />
                </div>
            </Container>
        )
    }

    const roleSeries = (d?.by_role ?? []).map((r) => r.count)
    const roleLabels = (d?.by_role ?? []).map((r) => r.label)

    return (
        <Container>
            <div className="mb-6">
                <h3 className="mb-1">HR Dashboard</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {dayjs().format('dddd, MMMM D YYYY')}
                </p>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <StatCard
                    label="Total Members"
                    value={d?.members.total ?? 0}
                    icon={<TbUsers />}
                    iconBg="bg-blue-500"
                />
                <StatCard
                    label="Active"
                    value={d?.members.active ?? 0}
                    icon={<TbUserCheck />}
                    iconBg="bg-emerald-500"
                    sub={`${d?.members.total ? Math.round((d.members.active / d.members.total) * 100) : 0}% of total`}
                />
                <StatCard
                    label="Inactive"
                    value={d?.members.inactive ?? 0}
                    icon={<TbUserOff />}
                    iconBg={d?.members.inactive ? 'bg-red-500' : 'bg-gray-400'}
                    subColor={d?.members.inactive ? 'text-red-500' : 'text-gray-400'}
                    sub={d?.members.inactive ? 'Needs review' : 'All active'}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* Role Distribution Donut */}
                <Card>
                    <h5 className="font-bold mb-4">Members by Role</h5>
                    {roleSeries.length === 0 || roleSeries.every(v => v === 0) ? (
                        <p className="text-sm text-gray-400 text-center py-10">No role data available</p>
                    ) : (
                        <>
                            <Chart
                                type="donut"
                                series={roleSeries}
                                donutTitle="Members"
                                donutText={String(d?.members.total ?? 0)}
                                customOptions={{
                                    labels: roleLabels,
                                    colors: roleChartColors,
                                }}
                                height="220px"
                            />
                            <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
                                {d?.by_role.map((r, i) => (
                                    <div key={r.code} className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: roleChartColors[i % roleChartColors.length] }}
                                            />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{r.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-400">
                                                {d.members.total ? Math.round((r.count / d.members.total) * 100) : 0}%
                                            </span>
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-5 text-right">{r.count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </Card>

                {/* Recent Members */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold">Recent Members</h5>
                        <span
                            className="text-sm text-primary cursor-pointer hover:underline"
                            onClick={() => navigate('/concepts/members/member-list')}
                        >
                            View all
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {!d?.recent_members.length && (
                            <p className="text-sm text-gray-400 text-center py-6">No members yet</p>
                        )}
                        {d?.recent_members.map((m) => (
                            <div
                                key={m.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                onClick={() => navigate(`/concepts/members/member-details/${m.id}`)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-white">
                                            {(m.name ?? '?').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{m.name ?? '—'}</p>
                                        <p className="text-xs text-gray-400 truncate">{m.job_title ?? m.email ?? '—'}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    {m.role && (
                                        <Tag className={`text-xs ${roleColors[m.role] ?? roleColors.viewer}`}>
                                            {capitalize(m.role)}
                                        </Tag>
                                    )}
                                    <Tag className={`text-xs ${statusColors[m.status] ?? statusColors.inactive}`}>
                                        {capitalize(m.status)}
                                    </Tag>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </Container>
    )
}

export default HrDashboard
