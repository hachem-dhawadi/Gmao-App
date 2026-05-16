import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useNavigate } from 'react-router-dom'
import Container from '@/components/shared/Container'
import Loading from '@/components/shared/Loading'
import GrowShrinkValue from '@/components/shared/GrowShrinkValue'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Table from '@/components/ui/Table'
import Chart from '@/components/shared/Chart'
import { COLORS } from '@/constants/chart.constant'
import { useThemeStore } from '@/store/themeStore'
import { apiGetHrDashboard } from '@/services/DashboardService'
import dayjs from 'dayjs'
import {
    TbUsers, TbUserCheck, TbUserOff,
} from 'react-icons/tb'

const { Tr, Td, TBody, THead, Th } = Table

// ── colours ──────────────────────────────────────────────────────────────────
const ROLE_COLORS = [COLORS[3], COLORS[0], COLORS[4], COLORS[5], COLORS[6]]

const roleTagColors: Record<string, string> = {
    admin:      'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-0',
    manager:    'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    technician: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    hr:         'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 border-0',
    viewer:     'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
}

const statusTagColors: Record<string, string> = {
    active:   'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
}

const capitalize = (s: string) =>
    s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// ── KPI Widget (mirrors Analytic > Metrics > Widget) ─────────────────────────
type WidgetProps = {
    title: string
    value: number
    sub: string
    growShrink?: number
    icon: React.ReactNode
    iconClass: string
}

const Widget = ({ title, value, sub, growShrink, icon, iconClass }: WidgetProps) => (
    <Card className="flex-1">
        <div className="flex justify-between gap-2 relative">
            <div>
                <div className="mb-8 text-base">{title}</div>
                <h3 className="mb-1">{value}</h3>
                {growShrink !== undefined ? (
                    <div className="inline-flex items-center flex-wrap gap-1">
                        <GrowShrinkValue
                            className="font-bold"
                            value={growShrink}
                            suffix="%"
                            positiveIcon="+"
                            negativeIcon=""
                        />
                        <span className="text-sm text-gray-500">vs last month</span>
                    </div>
                ) : (
                    <span className="text-sm text-gray-500">{sub}</span>
                )}
            </div>
            <div className={`flex items-center justify-center min-h-12 min-w-12 max-h-12 max-w-12 text-gray-900 rounded-full text-2xl ${iconClass}`}>
                {icon}
            </div>
        </div>
    </Card>
)

// ── Main component ────────────────────────────────────────────────────────────
const HrDashboard = () => {
    const navigate = useNavigate()

    const isFirstRender = useRef(true)
    const sideNavCollapse = useThemeStore((state) => state.layout.sideNavCollapse)
    useEffect(() => {
        if (!sideNavCollapse && isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        if (!isFirstRender.current) {
            window.dispatchEvent(new Event('resize'))
        }
    }, [sideNavCollapse])

    const { data, isLoading } = useSWR(
        '/dashboard/hr',
        () => apiGetHrDashboard(),
        { revalidateOnFocus: false },
    )

    const d = data?.data

    const monthLabels = (d?.monthly_stats ?? []).map((s) => s.month)
    const monthCounts = (d?.monthly_stats ?? []).map((s) => s.count)

    const roleSeries = (d?.by_role ?? []).map((r) => r.count)
    const roleLabels  = (d?.by_role ?? []).map((r) => r.label)
    const totalMembers = d?.members.total ?? 0

    // new members this month = last monthly_stats entry
    const newThisMonth = monthCounts.length ? monthCounts[monthCounts.length - 1] : 0

    return (
        <Loading loading={isLoading}>
            {d && (
                <Container className="flex flex-col gap-4">

                    {/* ── Header ─────────────────────────────────────────── */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 className="mb-1">HR overview</h4>
                            <p className="text-gray-500">{dayjs().format('dddd, MMMM D YYYY')}</p>
                        </div>
                    </div>

                    {/* ── Row 1: chart (col-3) + KPI cards (col-1) ──────── */}
                    <div className="flex flex-col 2xl:grid grid-cols-4 gap-4">

                        {/* Members area chart */}
                        <Card className="col-span-3 h-full">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h4>Member registrations</h4>
                                <div className="inline-flex items-center gap-6">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: COLORS[0] }} />
                                        <div>New members</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8">
                                <div className="flex items-center gap-10">
                                    <div>
                                        <div className="mb-2">Total members</div>
                                        <div className="flex items-end gap-2">
                                            <h3>{totalMembers}</h3>
                                            <GrowShrinkValue
                                                className="font-bold"
                                                value={d.member_grow_shrink}
                                                suffix="%"
                                                positiveIcon="+"
                                                negativeIcon=""
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-2">New this month</div>
                                        <div className="flex items-end gap-2">
                                            <h3>{newThisMonth}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4">
                                <Chart
                                    type="area"
                                    series={[{ name: 'New Members', data: monthCounts }]}
                                    xAxis={monthLabels}
                                    height="300px"
                                    customOptions={{
                                        legend: { show: false },
                                        colors: [COLORS[0]],
                                        fill: {
                                            type: 'gradient',
                                            gradient: {
                                                shadeIntensity: 1,
                                                opacityFrom: 0.4,
                                                opacityTo: 0.05,
                                                stops: [0, 100],
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </Card>

                        {/* KPI widgets */}
                        <div className="2xl:col-span-1 flex flex-col 2xl:flex-col xl:flex-row gap-4">
                            <Widget
                                title="Total members"
                                value={d.members.total}
                                sub=""
                                growShrink={d.member_grow_shrink}
                                icon={<TbUsers />}
                                iconClass="bg-orange-200"
                            />
                            <Widget
                                title="Active members"
                                value={d.members.active}
                                sub={`${totalMembers ? Math.round((d.members.active / totalMembers) * 100) : 0}% of total`}
                                icon={<TbUserCheck />}
                                iconClass="bg-emerald-200"
                            />
                            <Widget
                                title="Inactive members"
                                value={d.members.inactive}
                                sub={d.members.inactive ? 'Needs review' : 'All active'}
                                icon={<TbUserOff />}
                                iconClass={d.members.inactive ? 'bg-red-200' : 'bg-gray-200'}
                            />
                        </div>
                    </div>

                    {/* ── Row 2: recent members + donut + role breakdown ── */}
                    <div className="grid grid-cols-12 gap-4">

                        {/* Recent Members (mirrors TopPerformingPages) */}
                        <div className="col-span-12 md:col-span-6 xl:col-span-4">
                            <Card className="h-full">
                                <div className="flex items-center justify-between">
                                    <h4>Recent members</h4>
                                    <Button
                                        size="sm"
                                        onClick={() => navigate('/concepts/customers/customer-list')}
                                    >
                                        View all
                                    </Button>
                                </div>
                                <div className="mt-6">
                                    <Table hoverable={false}>
                                        <THead>
                                            <Tr>
                                                <Th className="px-0!">Member</Th>
                                                <Th className="text-right!">Role</Th>
                                                <Th className="px-0! text-right!">Status</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {d.recent_members.map((m) => (
                                                <Tr
                                                    key={m.id}
                                                    className="cursor-pointer"
                                                    onClick={() => navigate(`/concepts/customers/customer-edit/${m.id}`)}
                                                >
                                                    <Td className="px-0!">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                                <span className="text-xs font-bold text-white">
                                                                    {(m.name ?? '?').charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div className="heading-text font-semibold truncate max-w-[100px]">
                                                                {m.name ?? '—'}
                                                            </div>
                                                        </div>
                                                    </Td>
                                                    <Td className="text-right!">
                                                        {m.role ? (
                                                            <Tag className={`text-xs ${roleTagColors[m.role.toLowerCase()] ?? roleTagColors.viewer}`}>
                                                                {capitalize(m.role)}
                                                            </Tag>
                                                        ) : '—'}
                                                    </Td>
                                                    <Td className="px-0! text-right!">
                                                        <Tag className={`text-xs ${statusTagColors[m.status] ?? statusTagColors.inactive}`}>
                                                            {capitalize(m.status)}
                                                        </Tag>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                </div>
                            </Card>
                        </div>

                        {/* Role distribution donut (mirrors DeviceSession) */}
                        <div className="col-span-12 md:col-span-6 xl:col-span-4">
                            <Card className="h-full">
                                <h4>Role distribution</h4>
                                <div className="mt-6">
                                    {roleSeries.length > 0 && !roleSeries.every(v => v === 0) ? (
                                        <Chart
                                            height={240}
                                            series={roleSeries}
                                            customOptions={{
                                                colors: ROLE_COLORS,
                                                labels: roleLabels,
                                                plotOptions: {
                                                    pie: {
                                                        donut: {
                                                            labels: {
                                                                show: true,
                                                                total: {
                                                                    show: true,
                                                                    showAlways: true,
                                                                    label: 'Total',
                                                                    formatter: () => String(totalMembers),
                                                                },
                                                            },
                                                            size: '75%',
                                                        },
                                                    },
                                                },
                                            }}
                                            type="donut"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-400 text-center py-10">No role data</p>
                                    )}
                                </div>
                                <div className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-4">
                                    {d.by_role.map((r, i) => (
                                        <div key={r.code} className="flex flex-col items-center justify-center gap-1">
                                            <div className="text-2xl" style={{ color: ROLE_COLORS[i % ROLE_COLORS.length] }}>
                                                <TbUsers />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-sm">{r.label}</span>
                                                <h5>{totalMembers ? Math.round((r.count / totalMembers) * 100) : 0}%</h5>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Role breakdown table (mirrors TopChannel) */}
                        <div className="col-span-12 xl:col-span-4">
                            <Card className="h-full">
                                <div className="flex items-center justify-between">
                                    <h4>Members by role</h4>
                                </div>
                                <div className="mt-5">
                                    <div className="mb-2">Total workforce</div>
                                    <div className="flex items-end gap-2 mb-1">
                                        <h3>{totalMembers}</h3>
                                        <GrowShrinkValue
                                            className="font-bold"
                                            value={d.member_grow_shrink}
                                            suffix="%"
                                            positiveIcon="+"
                                            negativeIcon=""
                                        />
                                    </div>
                                    <Table className="mt-6" hoverable={false}>
                                        <THead>
                                            <Tr>
                                                <Th className="px-0!">Role</Th>
                                                <Th>Share</Th>
                                                <Th className="px-0!">Count</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {d.by_role.map((r, i) => (
                                                <Tr key={r.code}>
                                                    <Td className="px-0!">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length] }}
                                                            />
                                                            <div className="heading-text font-bold">{r.label}</div>
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        {totalMembers ? Math.round((r.count / totalMembers) * 100) : 0}%
                                                    </Td>
                                                    <Td className="px-0!">{r.count}</Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                </div>
                            </Card>
                        </div>

                    </div>
                </Container>
            )}
        </Loading>
    )
}

export default HrDashboard
