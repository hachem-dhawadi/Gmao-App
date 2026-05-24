import { useState } from 'react'
import * as XLSX from 'xlsx'
import useSWR from 'swr'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Chart from '@/components/shared/Chart'
import Tag from '@/components/ui/Tag'
import Skeleton from '@/components/ui/Skeleton'
import Segment from '@/components/ui/Segment'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import {
    apiGetWoReport,
    apiGetAssetReport,
    apiGetPmReport,
    apiGetInvReport,
} from '@/services/ReportsService'
import dayjs from 'dayjs'
import {
    TbClipboardList, TbEngine, TbCalendarStats, TbPackage,
    TbAlertTriangle, TbCircleCheck, TbClock,
    TbProgressBolt, TbChecks, TbCurrencyDollar, TbBox, TbChartBar,
    TbDownload, TbPrinter, TbCalendar, TbX, TbFileSpreadsheet,
} from 'react-icons/tb'
import { COLORS } from '@/constants/chart.constant'
import classNames from '@/utils/classNames'
import type { ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type DateRange = { from: Date | null; to: Date | null }

// ── CSV helper ────────────────────────────────────────────────────────────────

const downloadCsv = (headers: string[], rows: (string | number)[][], filename: string) => {
    const esc  = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))]
    const blob  = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ── Excel helper ──────────────────────────────────────────────────────────────

const downloadXlsx = (
    sheets: { name: string; headers: string[]; rows: (string | number)[][] }[],
    filename: string,
) => {
    const wb = XLSX.utils.book_new()
    sheets.forEach(({ name, headers, rows }) => {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        // Bold header row
        const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
            if (cell) cell.s = { font: { bold: true } }
        }
        // Auto column widths
        ws['!cols'] = headers.map((h, i) => ({
            wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length), 10),
        }))
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
    })
    XLSX.writeFile(wb, filename)
}

// ── Date range presets ────────────────────────────────────────────────────────

const PRESETS = [
    { label: 'This Month',   from: () => dayjs().startOf('month').toDate(),  to: () => dayjs().endOf('month').toDate() },
    { label: 'Last 3M',      from: () => dayjs().subtract(3, 'month').startOf('month').toDate(), to: () => dayjs().toDate() },
    { label: 'Last 6M',      from: () => dayjs().subtract(6, 'month').startOf('month').toDate(), to: () => dayjs().toDate() },
    { label: 'This Year',    from: () => dayjs().startOf('year').toDate(),   to: () => dayjs().toDate() },
]

const toParam = (d: Date | null) => d ? dayjs(d).format('YYYY-MM-DD') : undefined

// ── Shared components ─────────────────────────────────────────────────────────

const LoadingSkeleton = () => (
    <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} height={100} />)}
        </div>
        <Skeleton height={300} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton height={280} /><Skeleton height={280} />
        </div>
    </div>
)

const EmptySection = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <TbAlertTriangle className="text-4xl" />
        <p className="text-sm">{label}</p>
    </div>
)

const KpiCard = ({ label, value, sub, icon, bg }: { label: string; value: string | number; sub?: string; icon: ReactNode; bg: string }) => (
    <div className={classNames('rounded-2xl p-4 flex flex-col justify-center', bg)}>
        <div className="flex justify-between items-center">
            <div>
                <div className="mb-2 font-bold text-sm heading-text">{label}</div>
                <h3 className="mb-1 heading-text">{value}</h3>
                {sub && <p className="text-xs text-gray-500">{sub}</p>}
            </div>
            <div className="flex items-center justify-center min-h-12 min-w-12 max-h-12 max-w-12 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full text-2xl">
                {icon}
            </div>
        </div>
    </div>
)

const SectionHeader = ({
    label,
    onExportCsv,
    onExportXlsx,
}: {
    label: string
    onExportCsv?: () => void
    onExportXlsx?: () => void
}) => (
    <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-2">
            {onExportCsv && (
                <Button size="sm" variant="default" icon={<TbDownload />} onClick={onExportCsv}>
                    CSV
                </Button>
            )}
            {onExportXlsx && (
                <Button size="sm" variant="solid" icon={<TbFileSpreadsheet />} onClick={onExportXlsx}>
                    Excel
                </Button>
            )}
        </div>
    </div>
)

// ── Date Range Filter Bar ─────────────────────────────────────────────────────

const FilterBar = ({
    range, onChange,
}: {
    range: DateRange
    onChange: (r: DateRange) => void
}) => {
    const hasFilter = !!(range.from || range.to)

    return (
        <Card bodyClass="!py-3 !px-4">
            <div className="flex flex-wrap items-center gap-3">
                <TbCalendar className="text-gray-400 text-lg shrink-0" />

                {/* Quick presets */}
                <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map(p => {
                        const isActive = range.from && range.to &&
                            dayjs(range.from).format('YYYY-MM-DD') === dayjs(p.from()).format('YYYY-MM-DD') &&
                            dayjs(range.to).format('YYYY-MM-DD') === dayjs(p.to()).format('YYYY-MM-DD')
                        return (
                            <button
                                key={p.label}
                                onClick={() => onChange({ from: p.from(), to: p.to() })}
                                className={classNames(
                                    'px-3 py-1 rounded-full text-xs font-semibold transition-colors border',
                                    isActive
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-transparent hover:border-gray-300 dark:hover:border-gray-500',
                                )}
                            >
                                {p.label}
                            </button>
                        )
                    })}
                </div>

                <div className="h-4 w-px bg-gray-200 dark:bg-gray-600 hidden sm:block" />

                {/* Custom date pickers */}
                <div className="flex flex-wrap items-center gap-2">
                    <DatePicker
                        value={range.from}
                        placeholder="From date"
                        inputFormat="DD/MM/YYYY"
                        onChange={(d) => onChange({ ...range, from: d })}
                        clearable
                    />
                    <span className="text-gray-400 text-sm">—</span>
                    <DatePicker
                        value={range.to}
                        placeholder="To date"
                        inputFormat="DD/MM/YYYY"
                        onChange={(d) => onChange({ ...range, to: d })}
                        clearable
                    />
                </div>

                {/* Clear button */}
                {hasFilter && (
                    <Button
                        size="sm"
                        variant="plain"
                        icon={<TbX />}
                        onClick={() => onChange({ from: null, to: null })}
                    >
                        Clear
                    </Button>
                )}

                {/* Active filter badge */}
                {hasFilter && (
                    <span className="text-xs text-primary font-semibold ml-auto">
                        {range.from ? dayjs(range.from).format('DD MMM YYYY') : '…'}
                        {' – '}
                        {range.to ? dayjs(range.to).format('DD MMM YYYY') : 'today'}
                    </span>
                )}
            </div>
        </Card>
    )
}

// ── Donut stat card (used by WO report) ───────────────────────────────────────

const DonutStatCard = ({
    title,
    items,
}: {
    title: string
    items: { label: string; value: number; color: string }[]
}) => {
    const total = items.reduce((s, i) => s + i.value, 0)
    return (
        <Card>
            <h4 className="mb-5">{title}</h4>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-[180px] shrink-0">
                    <Chart
                        type="donut"
                        series={items.map(i => i.value)}
                        height={180}
                        donutTitle="Total"
                        donutText={String(total)}
                        customOptions={{
                            labels: items.map(i => i.label),
                            colors: items.map(i => i.color),
                            legend: { show: false },
                            dataLabels: { enabled: false },
                            stroke: { width: 2, colors: ['transparent'] },
                            plotOptions: {
                                pie: {
                                    donut: {
                                        size: '72%',
                                        labels: {
                                            show: true,
                                            total: {
                                                show: true,
                                                showAlways: true,
                                                label: 'Total',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                            },
                                            value: {
                                                fontSize: '22px',
                                                fontWeight: 700,
                                                offsetY: 4,
                                            },
                                        },
                                    },
                                },
                            },
                        }}
                    />
                </div>
                <div className="flex-1 w-full flex flex-col gap-3">
                    {items.map(item => {
                        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                        return (
                            <div key={item.label}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                        <span className="font-medium heading-text">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-right">
                                        <span className="font-bold heading-text">{item.value}</span>
                                        <span className="text-gray-400 w-8">{pct}%</span>
                                    </div>
                                </div>
                                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </Card>
    )
}

// ── Tab 1: Work Orders ────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
    open: '#3b82f6', in_progress: '#f59e0b', on_hold: '#94a3b8', completed: '#10b981', cancelled: '#ef4444',
}
const statusLabels: Record<string, string> = {
    open: 'Open', in_progress: 'In Progress', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled',
}
const priorityColors: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#3b82f6', low: '#94a3b8',
}
const priorityLabels: Record<string, string> = {
    critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}

const WoReport = ({ range }: { range: DateRange }) => {
    const params = { from: toParam(range.from), to: toParam(range.to) }
    const { data, isLoading } = useSWR(
        ['/reports/work-orders', params.from, params.to],
        () => apiGetWoReport(params),
        { revalidateOnFocus: false },
    )
    if (isLoading) return <LoadingSkeleton />
    const d = data?.data
    if (!d) return <EmptySection label="No work order data available" />

    const total = Object.values(d.by_status).reduce((a, b) => a + b, 0)

    const filename = `wo-report-${dayjs().format('YYYY-MM-DD')}`

    const handleExportCsv = () => {
        const rows: (string | number)[][] = [
            ['--- Monthly ---', '', ''], ['Month', 'Created', 'Completed'],
            ...d.monthly.map(m => [m.month, m.created, m.completed]),
            ['', '', ''], ['--- By Status ---', '', ''],
            ...Object.entries(d.by_status).map(([k, v]) => [k, v, '']),
            ['', '', ''], ['--- By Priority ---', '', ''],
            ...Object.entries(d.by_priority).map(([k, v]) => [k, v, '']),
            ...(d.top_technicians.length > 0 ? [
                ['', '', ''], ['--- Top Technicians ---', '', ''], ['Name', 'Completed', ''],
                ...d.top_technicians.map(t => [t.name, t.completed, '']),
            ] : []),
        ]
        downloadCsv(['Field', 'Value', 'Extra'], rows, `${filename}.csv`)
    }

    const handleExportXlsx = () => {
        downloadXlsx([
            {
                name: 'Monthly',
                headers: ['Month', 'Created', 'Completed'],
                rows: d.monthly.map(m => [m.month, m.created, m.completed]),
            },
            {
                name: 'By Status',
                headers: ['Status', 'Count'],
                rows: Object.entries(d.by_status).map(([k, v]) => [statusLabels[k] ?? k, v]),
            },
            {
                name: 'By Priority',
                headers: ['Priority', 'Count'],
                rows: Object.entries(d.by_priority).map(([k, v]) => [priorityLabels[k] ?? k, v]),
            },
            ...(d.top_technicians.length > 0 ? [{
                name: 'Top Technicians',
                headers: ['Technician', 'Completed'],
                rows: d.top_technicians.map(t => [t.name, t.completed]),
            }] : []),
        ], `${filename}.xlsx`)
    }

    return (
        <div className="flex flex-col gap-5">
            <SectionHeader label="Work Order Metrics" onExportCsv={handleExportCsv} onExportXlsx={handleExportXlsx} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Total WOs" value={total} sub={range.from ? 'Selected period' : 'All time'} icon={<TbClipboardList />} bg="bg-sky-100 dark:bg-sky-500/20" />
                <KpiCard label="Completed" value={d.by_status.completed} sub={range.from ? 'Selected period' : 'All time'} icon={<TbChecks />} bg="bg-emerald-100 dark:bg-emerald-500/20" />
                <KpiCard label="On Hold" value={d.by_status.on_hold} sub="Blocked" icon={<TbProgressBolt />} bg="bg-amber-100 dark:bg-amber-500/20" />
                <KpiCard
                    label="Avg Resolution"
                    value={d.avg_resolution_h != null ? `${d.avg_resolution_h}h` : '—'}
                    sub={range.from ? 'Selected period' : 'This month'}
                    icon={<TbClock />}
                    bg={d.avg_resolution_h != null && d.avg_resolution_h <= 8 ? 'bg-purple-100 dark:bg-purple-500/20' : 'bg-red-100 dark:bg-red-500/20'}
                />
            </div>

            <Card>
                <h4 className="mb-4">
                    Created vs Completed
                    {range.from
                        ? ` — ${dayjs(range.from).format('DD MMM YYYY')} to ${range.to ? dayjs(range.to).format('DD MMM YYYY') : 'today'}`
                        : ' — Last 6 Months'}
                </h4>
                {d.monthly.some(m => m.created > 0 || m.completed > 0) ? (
                    <Chart
                        series={[
                            { name: 'Created',   data: d.monthly.map(m => m.created) },
                            { name: 'Completed', data: d.monthly.map(m => m.completed) },
                        ]}
                        xAxis={d.monthly.map(m => m.month)}
                        type="bar"
                        customOptions={{
                            colors: [COLORS[4], COLORS[3]],
                            plotOptions: { bar: { columnWidth: '40%', borderRadius: 4, borderRadiusApplication: 'end' } },
                            legend: { show: true, position: 'top' },
                        }}
                    />
                ) : <EmptySection label="No work orders in this period" />}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DonutStatCard
                    title="By Status"
                    items={Object.entries(d.by_status).map(([k, v]) => ({
                        label: statusLabels[k] ?? k,
                        value: v,
                        color: statusColors[k],
                    }))}
                />
                <DonutStatCard
                    title="By Priority"
                    items={Object.entries(d.by_priority).map(([k, v]) => ({
                        label: priorityLabels[k] ?? k,
                        value: v,
                        color: priorityColors[k],
                    }))}
                />
            </div>

            {d.top_technicians.length > 0 && (
                <Card>
                    <h4 className="mb-4">Top Technicians by WOs Completed</h4>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
                                <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Technician</th>
                                <th className="pb-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Completed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {d.top_technicians.map((t, i) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="py-3 text-gray-400 text-xs">{i + 1}</td>
                                    <td className="py-3 font-medium heading-text">{t.name}</td>
                                    <td className="py-3 text-right">
                                        <Tag className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 font-bold">{t.completed}</Tag>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    )
}

// ── Tab 2: Assets ─────────────────────────────────────────────────────────────

const AssetReport = ({ range }: { range: DateRange }) => {
    const params = { from: toParam(range.from), to: toParam(range.to) }
    const { data, isLoading } = useSWR(
        ['/reports/assets', params.from, params.to],
        () => apiGetAssetReport(params),
        { revalidateOnFocus: false },
    )
    if (isLoading) return <LoadingSkeleton />
    const d = data?.data
    if (!d || d.assets.length === 0) return <EmptySection label="No assets with work orders found in this period" />

    const maxWo = Math.max(...d.assets.map(a => a.wo_count), 1)
    const totalDowntime = d.assets.reduce((s, a) => s + a.total_downtime_h, 0)

    const assetFilename = `asset-report-${dayjs().format('YYYY-MM-DD')}`
    const assetHeaders = ['#', 'Code', 'Name', 'Location', 'WO Count', 'Downtime (h)', 'Last Maintenance']
    const assetRows = d.assets.map((a, i) => [i + 1, a.code, a.name, a.location ?? '', a.wo_count, Number(a.total_downtime_h.toFixed(0)), a.last_maintenance_at ? dayjs(a.last_maintenance_at).format('YYYY-MM-DD') : ''] as (string | number)[])

    const handleExportCsv = () => downloadCsv(assetHeaders, assetRows, `${assetFilename}.csv`)
    const handleExportXlsx = () => downloadXlsx([{ name: 'Assets', headers: assetHeaders, rows: assetRows }], `${assetFilename}.xlsx`)

    return (
        <div className="flex flex-col gap-5">
            <SectionHeader label="Asset Health Overview" onExportCsv={handleExportCsv} onExportXlsx={handleExportXlsx} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard label="Assets Tracked" value={d.assets.length} sub="With work orders" icon={<TbEngine />} bg="bg-indigo-100 dark:bg-indigo-500/20" />
                <KpiCard label="Most Failures" value={d.assets[0]?.name ?? '—'} sub={`${d.assets[0]?.wo_count ?? 0} work orders`} icon={<TbAlertTriangle />} bg="bg-red-100 dark:bg-red-500/20" />
                <KpiCard label="Total Downtime" value={`${totalDowntime.toFixed(0)}h`} sub="All assets combined" icon={<TbClock />} bg="bg-amber-100 dark:bg-amber-500/20" />
            </div>
            <Card>
                <h4 className="mb-4">Assets by Work Order Count</h4>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                            <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
                            <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Asset</th>
                            <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</th>
                            <th className="pb-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">WOs</th>
                            <th className="pb-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Downtime</th>
                            <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Last Maintenance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {d.assets.map((a, i) => (
                            <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="py-3 text-gray-400 text-xs">{i + 1}</td>
                                <td className="py-3"><p className="font-semibold heading-text">{a.name}</p><p className="text-xs text-gray-400 font-mono">{a.code}</p></td>
                                <td className="py-3 text-gray-500 text-xs">{a.location ?? '—'}</td>
                                <td className="py-3">
                                    <div className="flex items-center gap-2 justify-center">
                                        <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${(a.wo_count / maxWo) * 100}%` }} />
                                        </div>
                                        <span className="font-bold text-xs w-5 text-right heading-text">{a.wo_count}</span>
                                    </div>
                                </td>
                                <td className="py-3 text-center text-xs font-medium heading-text">{a.total_downtime_h > 0 ? `${a.total_downtime_h.toFixed(0)}h` : '—'}</td>
                                <td className="py-3 text-xs text-gray-500">{a.last_maintenance_at ? dayjs(a.last_maintenance_at).format('DD MMM YYYY') : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    )
}

// ── Tab 3: PM Compliance ──────────────────────────────────────────────────────

const complianceTagEl = (status: string) => {
    if (status === 'on_time') return <Tag className="bg-emerald-100 dark:bg-emerald-500/20 border-0 text-xs"><span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><TbCircleCheck /> On Time</span></Tag>
    if (status === 'overdue') return <Tag className="bg-red-100 dark:bg-red-500/20 border-0 text-xs"><span className="flex items-center gap-1 text-red-500"><TbAlertTriangle /> Overdue</span></Tag>
    return <Tag className="bg-gray-100 dark:bg-gray-700 border-0 text-xs"><span className="flex items-center gap-1 text-gray-400"><TbClock /> Never Run</span></Tag>
}

const PmReport = ({ range }: { range: DateRange }) => {
    const params = { from: toParam(range.from), to: toParam(range.to) }
    const { data, isLoading } = useSWR(
        ['/reports/pm', params.from, params.to],
        () => apiGetPmReport(params),
        { revalidateOnFocus: false },
    )
    if (isLoading) return <LoadingSkeleton />
    const d = data?.data
    if (!d) return <EmptySection label="No PM data available" />

    const validMonths = d.monthly.filter(m => m.compliance !== null)
    const avgCompliance = validMonths.length > 0 ? Math.round(validMonths.reduce((s, m) => s + (m.compliance ?? 0), 0) / validMonths.length) : 100
    const onTime  = d.plans.filter(p => p.compliance_status === 'on_time').length
    const overdue = d.plans.filter(p => p.compliance_status === 'overdue').length
    const neverRun = d.plans.filter(p => p.compliance_status === 'never_run').length
    const complianceBg = avgCompliance >= 80 ? 'bg-emerald-100 dark:bg-emerald-500/20' : avgCompliance >= 50 ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-red-100 dark:bg-red-500/20'

    const pmFilename = `pm-report-${dayjs().format('YYYY-MM-DD')}`
    const pmHeaders = ['Code', 'Name', 'Assigned To', 'Last Run', 'Next Run', 'Status']
    const pmRows = d.plans.map(p => [p.code, p.name, p.assigned_to ?? '', p.last_run_at ? dayjs(p.last_run_at).format('YYYY-MM-DD') : '', p.next_run_at ? dayjs(p.next_run_at).format('YYYY-MM-DD') : '', p.compliance_status] as (string | number)[])

    const handleExportCsv = () => downloadCsv(pmHeaders, pmRows, `${pmFilename}.csv`)
    const handleExportXlsx = () => downloadXlsx([
        { name: 'PM Plans', headers: pmHeaders, rows: pmRows },
        { name: 'Monthly Compliance', headers: ['Month', 'Compliance %'], rows: d.monthly.map(m => [m.month, m.compliance ?? 0]) },
    ], `${pmFilename}.xlsx`)

    return (
        <div className="flex flex-col gap-5">
            <SectionHeader label="PM Compliance Summary" onExportCsv={handleExportCsv} onExportXlsx={handleExportXlsx} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Avg Compliance" value={`${avgCompliance}%`} sub={range.from ? 'Selected period' : 'Last 6 months'} icon={<TbCalendarStats />} bg={complianceBg} />
                <KpiCard label="On Time" value={onTime} sub="Active plans" icon={<TbCircleCheck />} bg="bg-emerald-100 dark:bg-emerald-500/20" />
                <KpiCard label="Overdue" value={overdue} sub="Need attention" icon={<TbAlertTriangle />} bg="bg-red-100 dark:bg-red-500/20" />
                <KpiCard label="Never Run" value={neverRun} sub="Not started yet" icon={<TbClock />} bg="bg-gray-100 dark:bg-gray-700" />
            </div>
            <Card>
                <h4 className="mb-4">Compliance Trend</h4>
                {validMonths.length > 0 ? (
                    <Chart
                        series={[{ name: 'Compliance %', data: d.monthly.map(m => m.compliance ?? 0) }]}
                        xAxis={d.monthly.map(m => m.month)}
                        type="line"
                        customOptions={{
                            colors: [COLORS[3]],
                            stroke: { curve: 'smooth', width: 3 },
                            yaxis: { min: 0, max: 100, labels: { formatter: (v: number) => `${v}%` } },
                            markers: { size: 5 },
                        }}
                    />
                ) : <EmptySection label="No PM plans have run in this period" />}
            </Card>
            {d.plans.length > 0 && (
                <Card>
                    <h4 className="mb-4">PM Plan Status</h4>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</th>
                                <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Assigned To</th>
                                <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Last Run</th>
                                <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Next Run</th>
                                <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {d.plans.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="py-3"><p className="font-semibold heading-text">{p.name}</p><p className="text-xs font-mono text-gray-400">{p.code}</p></td>
                                    <td className="py-3 text-gray-500 text-xs">{p.assigned_to ?? '—'}</td>
                                    <td className="py-3 text-xs text-gray-500">{p.last_run_at ? dayjs(p.last_run_at).format('DD MMM YYYY') : '—'}</td>
                                    <td className="py-3 text-xs text-gray-500">{p.next_run_at ? dayjs(p.next_run_at).format('DD MMM YYYY') : '—'}</td>
                                    <td className="py-3">{complianceTagEl(p.compliance_status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    )
}

// ── Tab 4: Inventory ──────────────────────────────────────────────────────────

const InventoryReport = ({ range }: { range: DateRange }) => {
    const params = { from: toParam(range.from), to: toParam(range.to) }
    const { data, isLoading } = useSWR(
        ['/reports/inventory', params.from, params.to],
        () => apiGetInvReport(params),
        { revalidateOnFocus: false },
    )
    if (isLoading) return <LoadingSkeleton />
    const d = data?.data
    if (!d) return <EmptySection label="No inventory data available" />

    const maxUsed = Math.max(...(d.top_items.map(i => i.total_used)), 1)
    const fmt = (n: number) => `$${n.toLocaleString('en', { minimumFractionDigits: 2 })}`
    const hasRange = !!(range.from || range.to)

    const invFilename = `inventory-report-${dayjs().format('YYYY-MM-DD')}`
    const invHeaders = ['#', 'Code', 'Name', 'Unit', 'Qty Used', 'Total Cost ($)']
    const invRows = d.top_items.map((item, i) => [i + 1, item.code, item.name, item.unit ?? '', item.total_used, Number(item.total_cost.toFixed(2))] as (string | number)[])

    const handleExportCsv = () => downloadCsv(invHeaders, invRows, `${invFilename}.csv`)
    const handleExportXlsx = () => downloadXlsx([
        {
            name: 'Top Parts Used',
            headers: invHeaders,
            rows: invRows,
        },
        {
            name: 'Cost Summary',
            headers: ['Metric', 'Value ($)'],
            rows: [
                ['Parts Cost (Period)', Number(d.cost_month.toFixed(2))],
                ['Parts Cost (Year)', Number(d.cost_year.toFixed(2))],
                ['Current Stock Value', Number(d.stock_value.toFixed(2))],
            ],
        },
    ], `${invFilename}.xlsx`)

    return (
        <div className="flex flex-col gap-5">
            <SectionHeader label="Inventory & Cost Summary" onExportCsv={handleExportCsv} onExportXlsx={handleExportXlsx} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                    label={hasRange ? 'Parts Cost (Period)' : 'Parts Cost This Month'}
                    value={fmt(d.cost_month)}
                    sub={hasRange && range.from ? `${dayjs(range.from).format('DD MMM')} – ${range.to ? dayjs(range.to).format('DD MMM YYYY') : 'today'}` : undefined}
                    icon={<TbCurrencyDollar />}
                    bg="bg-sky-100 dark:bg-sky-500/20"
                />
                <KpiCard
                    label={hasRange ? 'Parts Cost (Period)' : 'Parts Cost This Year'}
                    value={fmt(d.cost_year)}
                    icon={<TbChartBar />}
                    bg="bg-amber-100 dark:bg-amber-500/20"
                />
                <KpiCard label="Stock Value" value={fmt(d.stock_value)} sub="Current inventory value" icon={<TbBox />} bg="bg-emerald-100 dark:bg-emerald-500/20" />
            </div>

            {d.top_items.length > 0 ? (
                <Card>
                    <h4 className="mb-4">Top 10 Most Used Parts</h4>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
                                <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Item</th>
                                <th className="pb-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Qty Used</th>
                                <th className="pb-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {d.top_items.map((item, i) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="py-3 text-gray-400 text-xs">{i + 1}</td>
                                    <td className="py-3"><p className="font-semibold heading-text">{item.name}</p><p className="text-xs font-mono text-gray-400">{item.code}</p></td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-2 justify-center">
                                            <div className="w-20 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                                <div className="h-full bg-primary rounded-full" style={{ width: `${(item.total_used / maxUsed) * 100}%` }} />
                                            </div>
                                            <span className="text-xs font-medium w-14 heading-text">{item.total_used} {item.unit ?? ''}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 text-right font-semibold heading-text">{fmt(item.total_cost)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            ) : (
                <Card><EmptySection label="No parts used on work orders yet in this period" /></Card>
            )}
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const Reports = () => {
    const [activeTab, setActiveTab] = useState('wo')
    const [range, setRange] = useState<DateRange>({ from: null, to: null })

    return (
        <Container>
            <div className="flex flex-col gap-5">
                {/* Page header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h3>Reports</h3>
                        <p className="text-sm text-gray-500">
                            Maintenance performance, asset health, PM compliance and inventory costs
                        </p>
                    </div>
                    <Button variant="default" icon={<TbPrinter />} onClick={() => window.print()}>
                        Print / PDF
                    </Button>
                </div>

                {/* Tab navigation */}
                <Segment value={activeTab} onChange={(val) => setActiveTab(val as string)}>
                    <Segment.Item value="wo"><span className="flex items-center gap-1.5"><TbClipboardList className="text-base" /> Work Orders</span></Segment.Item>
                    <Segment.Item value="asset"><span className="flex items-center gap-1.5"><TbEngine className="text-base" /> Assets</span></Segment.Item>
                    <Segment.Item value="pm"><span className="flex items-center gap-1.5"><TbCalendarStats className="text-base" /> PM Compliance</span></Segment.Item>
                    <Segment.Item value="inv"><span className="flex items-center gap-1.5"><TbPackage className="text-base" /> Inventory</span></Segment.Item>
                </Segment>

                {/* Date range filter */}
                <FilterBar range={range} onChange={setRange} />

                {/* Tab content */}
                <div>
                    {activeTab === 'wo'    && <WoReport    range={range} />}
                    {activeTab === 'asset' && <AssetReport range={range} />}
                    {activeTab === 'pm'    && <PmReport    range={range} />}
                    {activeTab === 'inv'   && <InventoryReport range={range} />}
                </div>
            </div>
        </Container>
    )
}

export default Reports
