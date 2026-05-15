import { useState, useEffect, useRef, useMemo } from 'react'
import useSWR from 'swr'
import { useNavigate } from 'react-router-dom'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Progress from '@/components/ui/Progress'
import Skeleton from '@/components/ui/Skeleton'
import Chart from '@/components/shared/Chart'
import GrowShrinkValue from '@/components/shared/GrowShrinkValue'
import { useThemeStore } from '@/store/themeStore'
import classNames from '@/utils/classNames'
import isLastChild from '@/utils/isLastChild'
import ApiService from '@/services/ApiService'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { COLOR_1, COLOR_2, COLOR_4 } from '@/constants/chart.constant'
import {
    TbBuilding, TbClock, TbUsers,
    TbCircleCheck, TbCircleX, TbAlertTriangle,
    TbWorld,
} from 'react-icons/tb'
import type { ReactNode } from 'react'

dayjs.extend(relativeTime)

// ── Types ──────────────────────────────────────────────────────────────

type Company = {
    id: number
    name: string
    legal_name: string | null
    city: string | null
    country: string | null
    is_active: boolean
    approval_status: 'pending' | 'approved' | 'rejected'
    members_count: number
    created_at: string
}

type StatCategory = 'companies' | 'pending' | 'users'

// ── API fetchers ───────────────────────────────────────────────────────

const fetchCompanies = () =>
    ApiService.fetchDataWithAxios<{
        success: boolean
        data: { companies: Company[]; pagination: { total: number } }
    }>({ url: '/superadmin/companies', method: 'get', params: { per_page: 100 } })

const fetchUsers = () =>
    ApiService.fetchDataWithAxios<{
        success: boolean
        data: { pagination: { total: number } }
    }>({ url: '/superadmin/users', method: 'get', params: { per_page: 1 } })

// ── Helpers ────────────────────────────────────────────────────────────

const getLast6Months = () =>
    Array.from({ length: 6 }, (_, i) => dayjs().subtract(5 - i, 'month').format('MMM YYYY'))

const getLast6Labels = () =>
    Array.from({ length: 6 }, (_, i) => dayjs().subtract(5 - i, 'month').format('MMM YY'))

const calcGrowth = (arr: number[]) => {
    const t = arr[5] ?? 0
    const l = arr[4] ?? 0
    if (l > 0) return Math.round(((t - l) / l) * 100)
    return t > 0 ? 100 : 0
}

const approvalTag: Record<string, string> = {
    approved: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    pending:  'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    rejected: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
}

const chartColors: Record<StatCategory, string> = {
    companies: COLOR_1,
    pending:   COLOR_2,
    users:     COLOR_4,
}

// ── StatisticCard (clickable KPI) ──────────────────────────────────────

type StatCardProps = {
    title: string
    value: number
    icon: ReactNode
    iconClass: string
    growShrink: number
    label: StatCategory
    active: boolean
    onClick: (l: StatCategory) => void
}

const ClickableStatCard = ({
    title, value, icon, iconClass, growShrink, label, active, onClick,
}: StatCardProps) => (
    <button
        className={classNames(
            'p-4 rounded-2xl cursor-pointer ltr:text-left rtl:text-right transition duration-150 outline-hidden',
            active && 'bg-white dark:bg-gray-900 shadow-md',
        )}
        onClick={() => onClick(label)}
    >
        <div className="flex md:flex-col-reverse gap-2 2xl:flex-row justify-between relative">
            <div>
                <div className="mb-4 text-sm font-semibold">{title}</div>
                <h3 className="mb-1">{value}</h3>
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
            </div>
            <div className={classNames(
                'flex items-center justify-center min-h-12 min-w-12 max-h-12 max-w-12 text-gray-900 rounded-full text-2xl',
                iconClass,
            )}>
                {icon}
            </div>
        </div>
    </button>
)

// ── OverviewCard ───────────────────────────────────────────────────────

const OverviewCard = ({
    companies, totalUsers,
}: { companies: Company[]; totalUsers: number }) => {
    const [selected, setSelected] = useState<StatCategory>('companies')
    const sideNavCollapse = useThemeStore(s => s.layout.sideNavCollapse)
    const isFirst = useRef(true)

    useEffect(() => {
        if (!sideNavCollapse && isFirst.current) { isFirst.current = false; return }
        if (!isFirst.current) window.dispatchEvent(new Event('resize'))
    }, [sideNavCollapse])

    const months6 = useMemo(() => getLast6Months(), [])
    const labels  = useMemo(() => getLast6Labels(),  [])

    const byMonth = useMemo(() => {
        const all     = months6.map(m => companies.filter(c => dayjs(c.created_at).format('MMM YYYY') === m).length)
        const pending = months6.map(m => companies.filter(c => dayjs(c.created_at).format('MMM YYYY') === m && c.approval_status === 'pending').length)
        const users   = months6.map(m => companies.filter(c => dayjs(c.created_at).format('MMM YYYY') === m && c.is_active).length)
        return { companies: all, pending, users }
    }, [companies, months6])

    const growth = useMemo(() => ({
        companies: calcGrowth(byMonth.companies),
        pending:   calcGrowth(byMonth.pending),
        users:     0,
    }), [byMonth])

    const totalCompanies = companies.length
    const totalPending   = companies.filter(c => c.approval_status === 'pending').length
    const totalMembers   = companies.reduce((s, c) => s + c.members_count, 0)

    const seriesData  = byMonth[selected]
    const maxVal      = Math.max(...seriesData, 1)
    const hasChartData = seriesData.some(v => v > 0)

    // Use totalUsers for the "users" card value, totalMembers in subtitle
    void totalUsers

    return (
        <Card>
            <h4>Platform Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl p-3 bg-gray-100 dark:bg-gray-700 mt-4">
                <ClickableStatCard
                    title="Total Companies"
                    value={totalCompanies}
                    icon={<TbBuilding />}
                    iconClass="bg-sky-200 dark:opacity-80"
                    growShrink={growth.companies}
                    label="companies"
                    active={selected === 'companies'}
                    onClick={setSelected}
                />
                <ClickableStatCard
                    title="Pending Approval"
                    value={totalPending}
                    icon={<TbClock />}
                    iconClass="bg-amber-200 dark:opacity-80"
                    growShrink={growth.pending}
                    label="pending"
                    active={selected === 'pending'}
                    onClick={setSelected}
                />
                <ClickableStatCard
                    title="Total Members"
                    value={totalMembers}
                    icon={<TbUsers />}
                    iconClass="bg-purple-200 dark:opacity-80"
                    growShrink={growth.users}
                    label="users"
                    active={selected === 'users'}
                    onClick={setSelected}
                />
            </div>

            {hasChartData ? (
                <Chart
                    type="line"
                    series={[{
                        name: selected === 'companies' ? 'Registrations'
                            : selected === 'pending' ? 'Pending'
                            : 'Active companies',
                        data: seriesData,
                    }]}
                    xAxis={labels}
                    height="380px"
                    customOptions={{
                        legend: { show: false },
                        colors: [chartColors[selected]],
                        yaxis: { min: 0, max: maxVal + 1 },
                    }}
                />
            ) : (
                <div className="flex items-center justify-center h-[380px] flex-col gap-2 text-gray-400">
                    <TbBuilding className="text-4xl opacity-30" />
                    <p className="text-sm">No data for this period</p>
                </div>
            )}
        </Card>
    )
}

// ── CompanyByStatus (replaces CustomerDemographic) ─────────────────────

const CompanyByStatusCard = ({ companies }: { companies: Company[] }) => {
    const total = companies.length || 1

    const statuses = [
        { key: 'approved', label: 'Approved', color: 'bg-emerald-500', count: companies.filter(c => c.approval_status === 'approved').length },
        { key: 'pending',  label: 'Pending',  color: 'bg-amber-400',  count: companies.filter(c => c.approval_status === 'pending').length },
        { key: 'rejected', label: 'Rejected', color: 'bg-red-500',    count: companies.filter(c => c.approval_status === 'rejected').length },
        { key: 'inactive', label: 'Inactive', color: 'bg-gray-400',   count: companies.filter(c => !c.is_active).length },
    ]

    const donutSeries = statuses.map(s => s.count)
    const donutLabels = statuses.map(s => s.label)
    const donutColors = ['#10b981', '#f59e0b', '#ef4444', '#9ca3af']

    const [hovering, setHovering] = useState('')

    return (
        <Card>
            <h4>Company Breakdown</h4>
            <div className="flex flex-col xl:flex-row items-center gap-6 mt-4">
                <div className="flex-shrink-0">
                    <Chart
                        type="donut"
                        series={donutSeries}
                        donutTitle="Total"
                        donutText={String(companies.length)}
                        customOptions={{
                            labels: donutLabels,
                            colors: donutColors,
                        }}
                        height="220px"
                        width="220px"
                    />
                </div>
                <div className="flex flex-col justify-center flex-1 w-full">
                    {statuses.map((s, i) => (
                        <div
                            key={s.key}
                            className={classNames(
                                'flex items-center gap-4 p-3 rounded-xl transition-colors duration-150 cursor-default',
                                hovering === s.key && 'bg-gray-100 dark:bg-gray-700',
                            )}
                            onMouseEnter={() => setHovering(s.key)}
                            onMouseLeave={() => setHovering('')}
                        >
                            <div className="flex items-center gap-2 w-24 flex-shrink-0">
                                <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: donutColors[i] }}
                                />
                                <span className="text-sm font-semibold heading-text">{s.label}</span>
                            </div>
                            <div className="flex-1">
                                <Progress
                                    percent={Math.round((s.count / total) * 100)}
                                    trailClass={classNames(
                                        'transition-colors duration-150',
                                        hovering === s.key && 'bg-gray-200 dark:bg-gray-600',
                                    )}
                                />
                            </div>
                            <span className="text-sm font-semibold w-6 text-right text-gray-700 dark:text-gray-300">{s.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    )
}

// ── ApprovalRateCard (replaces SalesTarget) ────────────────────────────

const ApprovalRateCard = ({ companies }: { companies: Company[] }) => {
    const approved = companies.filter(c => c.approval_status === 'approved').length
    const total    = companies.length || 1
    const pct      = Math.round((approved / total) * 100)

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h4>Approval rate</h4>
            </div>
            <div className="flex items-center justify-between mt-6">
                <div className="flex flex-col">
                    <h2>
                        {approved}
                        <span className="opacity-60 text-base font-bold"> / {total} companies</span>
                    </h2>
                    <div className="mt-2 text-sm text-gray-500">Approved this platform</div>
                    {companies.filter(c => c.approval_status === 'pending').length > 0 && (
                        <div className="mt-3 flex items-center gap-1 text-amber-500 text-sm font-semibold">
                            <TbAlertTriangle />
                            <span>{companies.filter(c => c.approval_status === 'pending').length} pending review</span>
                        </div>
                    )}
                </div>
                <Progress
                    percent={pct}
                    width={80}
                    variant="circle"
                    strokeWidth={8}
                />
            </div>
        </Card>
    )
}

// ── TopCompaniesCard (replaces TopProduct) ─────────────────────────────

const TopCompaniesCard = ({
    companies, onViewAll,
}: { companies: Company[]; onViewAll: () => void }) => {
    const top = useMemo(() =>
        [...companies].sort((a, b) => b.members_count - a.members_count).slice(0, 5),
        [companies],
    )

    return (
        <Card>
            <div className="flex items-center justify-between">
                <h4>Top companies</h4>
                <Button size="sm" onClick={onViewAll}>View all</Button>
            </div>
            <div className="mt-5">
                {top.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No companies yet</p>
                )}
                {top.map((c, i) => (
                    <div
                        key={c.id}
                        className={classNames(
                            'flex items-center justify-between py-2.5 dark:border-gray-600',
                            !isLastChild(top, i) && 'border-b border-gray-100 dark:border-gray-700',
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                                <TbBuilding className="text-sky-500 text-lg" />
                            </div>
                            <div>
                                <p className="font-bold text-sm heading-text truncate max-w-[140px]">{c.name}</p>
                                <p className="text-xs text-gray-400">Members: {c.members_count}</p>
                            </div>
                        </div>
                        <Tag className={`text-xs flex-shrink-0 ${approvalTag[c.approval_status]}`}>
                            {c.approval_status.charAt(0).toUpperCase() + c.approval_status.slice(1)}
                        </Tag>
                    </div>
                ))}
            </div>
        </Card>
    )
}

// ── StatusBreakdownCard (replaces RevenueByChannel) ────────────────────

const StatusBreakdownCard = ({ companies }: { companies: Company[] }) => {
    const total    = companies.length || 1
    const approved = companies.filter(c => c.approval_status === 'approved').length
    const pending  = companies.filter(c => c.approval_status === 'pending').length
    const rejected = companies.filter(c => c.approval_status === 'rejected').length
    const active   = companies.filter(c => c.is_active).length

    const approvedPct = Math.round((approved / total) * 100)
    const pendingPct  = Math.round((pending  / total) * 100)
    const rejectedPct = Math.round((rejected / total) * 100)

    return (
        <Card>
            <h4 className="mb-4">Status breakdown</h4>
            <div className="mt-4">
                <div className="flex items-center gap-3">
                    <h2>{approvedPct}%</h2>
                    <div className="text-sm text-gray-500 leading-5">
                        <div>Approval</div>
                        <div>Rate</div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1 mt-6">
                {approvedPct > 0 && (
                    <div className="flex-1" style={{ width: `${approvedPct}%` }}>
                        <div className="h-1.5 rounded-full bg-emerald-400" />
                        <div className="font-bold heading-text mt-1 text-xs">{approvedPct}%</div>
                    </div>
                )}
                {pendingPct > 0 && (
                    <div className="flex-1" style={{ width: `${pendingPct}%` }}>
                        <div className="h-1.5 rounded-full bg-amber-400" />
                        <div className="font-bold heading-text mt-1 text-xs">{pendingPct}%</div>
                    </div>
                )}
                {rejectedPct > 0 && (
                    <div className="flex-1" style={{ width: `${rejectedPct}%` }}>
                        <div className="h-1.5 rounded-full bg-red-400" />
                        <div className="font-bold heading-text mt-1 text-xs">{rejectedPct}%</div>
                    </div>
                )}
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mt-6">
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { icon: <TbCircleCheck />, label: 'Approved', value: approved, cls: 'bg-emerald-200 dark:opacity-80' },
                        { icon: <TbAlertTriangle />, label: 'Pending',  value: pending,  cls: 'bg-amber-200 dark:opacity-80'  },
                        { icon: <TbWorld />,         label: 'Active',   value: active,   cls: 'bg-sky-200 dark:opacity-80'    },
                    ].map(item => (
                        <div key={item.label} className="flex flex-col items-center gap-3">
                            <div className={classNames('rounded-full flex items-center justify-center h-10 w-10 text-gray-900 text-lg', item.cls)}>
                                {item.icon}
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-sm">{item.value}</p>
                                <p className="text-xs text-gray-500">{item.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    )
}

// ── RecentCompaniesTable (replaces RecentOrder) ────────────────────────

const RecentCompaniesTable = ({
    companies, onRow,
}: { companies: Company[]; onRow: (id: number) => void }) => (
    <Card>
        <div className="flex items-center justify-between mb-6">
            <h4>All Companies</h4>
        </div>
        {companies.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No companies yet</p>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                            {['Company', 'Location', 'Status', 'Members', 'Registered'].map(h => (
                                <th key={h} className="text-left pb-3 pr-4 last:pr-0 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {companies.map(c => (
                            <tr
                                key={c.id}
                                className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                                onClick={() => onRow(c.id)}
                            >
                                <td className="py-3 pr-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                                            <TbBuilding className="text-sky-500 text-sm" />
                                        </div>
                                        <div>
                                            <p className="font-semibold heading-text">{c.name}</p>
                                            {c.legal_name && c.legal_name !== c.name && (
                                                <p className="text-xs text-gray-400">{c.legal_name}</p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 pr-4 text-gray-500">
                                    {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                                </td>
                                <td className="py-3 pr-4">
                                    <Tag className={`text-xs w-fit ${approvalTag[c.approval_status]}`}>
                                        {c.approval_status.charAt(0).toUpperCase() + c.approval_status.slice(1)}
                                    </Tag>
                                </td>
                                <td className="py-3 pr-4">
                                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 font-semibold">
                                        <TbUsers className="text-xs" />
                                        {c.members_count}
                                    </div>
                                </td>
                                <td className="py-3 text-xs text-gray-400">
                                    {dayjs(c.created_at).fromNow()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </Card>
)

// ── Main ───────────────────────────────────────────────────────────────

const SuperadminDashboard = () => {
    const navigate = useNavigate()

    const { data: companiesData, isLoading: loadingC } = useSWR(
        '/superadmin/companies',
        fetchCompanies,
        { revalidateOnFocus: false },
    )
    const { data: usersData, isLoading: loadingU } = useSWR(
        '/superadmin/users',
        fetchUsers,
        { revalidateOnFocus: false },
    )

    const isLoading = loadingC || loadingU
    const companies  = companiesData?.data?.companies ?? []
    const totalUsers = usersData?.data?.pagination?.total ?? 0

    if (isLoading) {
        return (
            <Container>
                <div className="flex flex-col gap-4 max-w-full">
                    <div className="flex flex-col xl:flex-row gap-4">
                        <div className="flex flex-col gap-4 flex-1">
                            <Skeleton height={560} />
                            <Skeleton height={280} />
                        </div>
                        <div className="flex flex-col gap-4 2xl:min-w-[360px] xl:w-[360px]">
                            <Skeleton height={160} />
                            <Skeleton height={240} />
                            <Skeleton height={240} />
                        </div>
                    </div>
                    <Skeleton height={300} />
                </div>
            </Container>
        )
    }

    return (
        <Container>
            <div className="flex flex-col gap-4 max-w-full overflow-x-hidden">
                <div className="flex flex-col xl:flex-row gap-4">

                    {/* Left column */}
                    <div className="flex flex-col gap-4 flex-1 min-w-0">
                        <OverviewCard companies={companies} totalUsers={totalUsers} />
                        <CompanyByStatusCard companies={companies} />
                    </div>

                    {/* Right sidebar */}
                    <div className="flex flex-col gap-4 2xl:min-w-[360px] xl:w-[360px]">
                        <ApprovalRateCard companies={companies} />
                        <TopCompaniesCard
                            companies={companies}
                            onViewAll={() => navigate('/concepts/company/company-list')}
                        />
                        <StatusBreakdownCard companies={companies} />
                    </div>
                </div>

                {/* Bottom: companies table */}
                <RecentCompaniesTable
                    companies={companies}
                    onRow={id => navigate(`/concepts/company/company-details/${id}`)}
                />
            </div>
        </Container>
    )
}

export default SuperadminDashboard
