import { useState, useEffect, useCallback } from 'react'
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Colors } from '@/constants/colors'
import {
    apiGetWoReport, apiGetAssetReport, apiGetPmReport, apiGetInvReport,
    type WoReportData, type AssetReportData, type PmReportData, type InventoryReportData,
} from '@/services/ReportsService'

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (d: Date) => d.toISOString().split('T')[0]
const now  = () => new Date()

function getPresets() {
    const n = now()
    return [
        { key: 'all',   label: 'All Time',   from: undefined, to: undefined },
        { key: 'month', label: 'This Month',  from: fmt(new Date(n.getFullYear(), n.getMonth(), 1)),       to: fmt(n) },
        { key: '3m',    label: 'Last 3M',     from: fmt(new Date(n.getFullYear(), n.getMonth() - 3, 1)),   to: fmt(n) },
        { key: '6m',    label: 'Last 6M',     from: fmt(new Date(n.getFullYear(), n.getMonth() - 6, 1)),   to: fmt(n) },
        { key: 'year',  label: 'This Year',   from: fmt(new Date(n.getFullYear(), 0, 1)),                  to: fmt(n) },
    ]
}

const fmtDate = (s: string | null) => {
    if (!s) return '—'
    const d = new Date(s)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fmtMoney = (n: number) =>
    n.toLocaleString('en', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

// ── shared sub-components ─────────────────────────────────────────────────────

function KpiCard({ label, value, sub, bg, iconName, iconColor }: {
    label: string; value: string | number; sub?: string
    bg: string; iconName: string; iconColor: string
}) {
    return (
        <View style={[k.card, { backgroundColor: bg }]}>
            <View style={[k.iconWrap, { backgroundColor: iconColor + '22' }]}>
                <Ionicons name={iconName as never} size={20} color={iconColor} />
            </View>
            <Text style={k.value} numberOfLines={1}>{value}</Text>
            <Text style={k.label}>{label}</Text>
            {sub ? <Text style={k.sub}>{sub}</Text> : null}
        </View>
    )
}

const k = StyleSheet.create({
    card:     { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#ebebeb', minHeight: 110 },
    iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    value:    { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 2 },
    label:    { fontSize: 12, fontWeight: '700', color: '#444', marginBottom: 2 },
    sub:      { fontSize: 11, color: '#aaa' },
})

function MiniBar({ pct, color }: { pct: number; color: string }) {
    return (
        <View style={{ height: 5, borderRadius: 3, backgroundColor: '#ebebeb', overflow: 'hidden', flex: 1 }}>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: color, width: `${Math.min(100, Math.max(0, pct))}%` }} />
        </View>
    )
}

function SectionTitle({ label }: { label: string }) {
    return <Text style={st.sectionTitle}>{label}</Text>
}
const st = StyleSheet.create({
    sectionTitle: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
})

function DataCard({ children }: { children: React.ReactNode }) {
    return <View style={dc.card}>{children}</View>
}
const dc = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb', overflow: 'hidden', marginBottom: 20, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
})

function EmptyState({ label }: { label: string }) {
    return (
        <View style={{ alignItems: 'center', padding: 40, gap: 10 }}>
            <Ionicons name="bar-chart-outline" size={36} color="#ddd" />
            <Text style={{ fontSize: 14, color: '#bbb', textAlign: 'center' }}>{label}</Text>
        </View>
    )
}

function LoadingState() {
    return (
        <View style={{ alignItems: 'center', padding: 60 }}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
    )
}

// ── STATUS & PRIORITY CONFIG ──────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string }> = {
    open:        { label: 'Open',        color: '#2a85ff' },
    in_progress: { label: 'In Progress', color: '#f59e0b' },
    on_hold:     { label: 'On Hold',     color: '#94a3b8' },
    completed:   { label: 'Completed',   color: '#10b981' },
    cancelled:   { label: 'Cancelled',   color: '#ef4444' },
}

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
    critical: { label: 'Critical', color: '#ef4444' },
    high:     { label: 'High',     color: '#f97316' },
    medium:   { label: 'Medium',   color: '#3b82f6' },
    low:      { label: 'Low',      color: '#94a3b8' },
}

// ── TAB: WORK ORDERS ─────────────────────────────────────────────────────────

function WoTab({ params }: { params: { from?: string; to?: string } }) {
    const [data,    setData]    = useState<WoReportData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        setData(null)
        apiGetWoReport(params)
            .then(r => setData(r.data?.data ?? null))
            .catch(() => setData(null))
            .finally(() => setLoading(false))
    }, [params.from, params.to])

    if (loading) return <LoadingState />
    if (!data)   return <EmptyState label="No work order data for this period." />

    const total = Object.values(data.by_status).reduce((a, b) => a + b, 0)

    return (
        <>
            {/* KPI row 1 */}
            <View style={r.kpiRow}>
                <KpiCard label="Total WOs"    value={total}
                    sub="selected period" bg="#f0f7ff" iconName="clipboard-outline" iconColor="#2a85ff" />
                <KpiCard label="Completed"    value={data.by_status.completed}
                    bg="#f0fdf4" iconName="checkmark-circle-outline" iconColor="#10b981" />
            </View>
            <View style={r.kpiRow}>
                <KpiCard label="On Hold"      value={data.by_status.on_hold}
                    bg="#fffbeb" iconName="pause-circle-outline" iconColor="#f59e0b" />
                <KpiCard label="Avg Resolution" value={data.avg_resolution_h != null ? `${data.avg_resolution_h}h` : '—'}
                    bg="#fdf4ff" iconName="time-outline" iconColor="#a855f7" />
            </View>

            {/* By Status */}
            <SectionTitle label="By Status" />
            <DataCard>
                {Object.entries(data.by_status).map(([key, val], i) => {
                    const cfg = STATUS_CFG[key]
                    const pct = total > 0 ? (val / total) * 100 : 0
                    return (
                        <View key={key} style={[r.statRow, i > 0 && r.statBorder]}>
                            <View style={[r.dot, { backgroundColor: cfg?.color ?? '#aaa' }]} />
                            <Text style={r.statLabel}>{cfg?.label ?? key}</Text>
                            <MiniBar pct={pct} color={cfg?.color ?? '#aaa'} />
                            <Text style={r.statVal}>{val}</Text>
                        </View>
                    )
                })}
            </DataCard>

            {/* By Priority */}
            <SectionTitle label="By Priority" />
            <DataCard>
                {Object.entries(data.by_priority).map(([key, val], i) => {
                    const cfg  = PRIORITY_CFG[key]
                    const maxP = Math.max(...Object.values(data.by_priority), 1)
                    return (
                        <View key={key} style={[r.statRow, i > 0 && r.statBorder]}>
                            <View style={[r.dot, { backgroundColor: cfg?.color ?? '#aaa' }]} />
                            <Text style={r.statLabel}>{cfg?.label ?? key}</Text>
                            <MiniBar pct={(val / maxP) * 100} color={cfg?.color ?? '#aaa'} />
                            <Text style={r.statVal}>{val}</Text>
                        </View>
                    )
                })}
            </DataCard>

            {/* Monthly */}
            {data.monthly.length > 0 && (
                <>
                    <SectionTitle label="Monthly Breakdown" />
                    <DataCard>
                        {data.monthly.map((m, i) => {
                            const maxVal = Math.max(...data.monthly.map(x => Math.max(x.created, x.completed)), 1)
                            return (
                                <View key={m.month} style={[r.monthRow, i > 0 && r.statBorder]}>
                                    <Text style={r.monthLabel}>{m.month}</Text>
                                    <View style={r.monthBars}>
                                        <View style={r.monthBarRow}>
                                            <Text style={r.monthBarLabel}>Created</Text>
                                            <MiniBar pct={(m.created / maxVal) * 100} color="#2a85ff" />
                                            <Text style={r.monthBarVal}>{m.created}</Text>
                                        </View>
                                        <View style={r.monthBarRow}>
                                            <Text style={r.monthBarLabel}>Done</Text>
                                            <MiniBar pct={(m.completed / maxVal) * 100} color="#10b981" />
                                            <Text style={r.monthBarVal}>{m.completed}</Text>
                                        </View>
                                    </View>
                                </View>
                            )
                        })}
                    </DataCard>
                </>
            )}

            {/* Top Technicians */}
            {data.top_technicians.length > 0 && (
                <>
                    <SectionTitle label="Top Technicians" />
                    <DataCard>
                        {data.top_technicians.map((tech, i) => {
                            const max = Math.max(...data.top_technicians.map(t => t.completed), 1)
                            return (
                                <View key={i} style={[r.techRow, i > 0 && r.statBorder]}>
                                    <View style={r.techRank}>
                                        <Text style={r.techRankText}>{i + 1}</Text>
                                    </View>
                                    <Text style={r.techName} numberOfLines={1}>{tech.name}</Text>
                                    <MiniBar pct={(tech.completed / max) * 100} color="#10b981" />
                                    <Text style={r.statVal}>{tech.completed}</Text>
                                </View>
                            )
                        })}
                    </DataCard>
                </>
            )}
        </>
    )
}

// ── TAB: ASSETS ───────────────────────────────────────────────────────────────

function AssetTab({ params }: { params: { from?: string; to?: string } }) {
    const [data,    setData]    = useState<AssetReportData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        setData(null)
        apiGetAssetReport(params)
            .then(r => setData(r.data?.data ?? null))
            .catch(() => setData(null))
            .finally(() => setLoading(false))
    }, [params.from, params.to])

    if (loading) return <LoadingState />
    if (!data || data.assets.length === 0) return <EmptyState label="No asset maintenance data for this period." />

    const maxWo       = Math.max(...data.assets.map(a => a.wo_count), 1)
    const totalDown   = data.assets.reduce((s, a) => s + a.total_downtime_h, 0)
    const mostFailed  = data.assets[0]

    return (
        <>
            <View style={r.kpiRow}>
                <KpiCard label="Assets Tracked"  value={data.assets.length}
                    bg="#f0f7ff" iconName="hardware-chip-outline" iconColor="#6366f1" />
                <KpiCard label="Total Downtime"   value={`${totalDown.toFixed(0)}h`}
                    bg="#fffbeb" iconName="time-outline" iconColor="#f59e0b" />
            </View>
            {mostFailed && (
                <View style={r.kpiRow}>
                    <KpiCard label="Most Failures" value={mostFailed.name}
                        sub={`${mostFailed.wo_count} WOs`} bg="#fef2f2" iconName="alert-circle-outline" iconColor="#ef4444" />
                </View>
            )}

            <SectionTitle label="Asset Maintenance Summary" />
            <DataCard>
                {data.assets.map((a, i) => (
                    <View key={a.id} style={[r.assetRow, i > 0 && r.statBorder]}>
                        <View style={r.assetMain}>
                            <Text style={r.assetName} numberOfLines={1}>{a.name}</Text>
                            <Text style={r.assetCode}>{a.code}{a.location ? ` · ${a.location}` : ''}</Text>
                        </View>
                        <View style={r.assetStats}>
                            <View style={r.assetStatItem}>
                                <MiniBar pct={(a.wo_count / maxWo) * 100} color="#ef4444" />
                                <Text style={r.assetStatVal}>{a.wo_count} WOs</Text>
                            </View>
                            <Text style={r.assetDowntime}>
                                {a.total_downtime_h > 0 ? `${a.total_downtime_h.toFixed(0)}h` : '—'} downtime
                            </Text>
                            <Text style={r.assetDate}>{fmtDate(a.last_maintenance_at)}</Text>
                        </View>
                    </View>
                ))}
            </DataCard>
        </>
    )
}

// ── TAB: PM COMPLIANCE ────────────────────────────────────────────────────────

const COMPLIANCE_CFG = {
    on_time:   { label: 'On Time',   color: '#10b981', bg: '#f0fdf4', icon: 'checkmark-circle-outline' },
    overdue:   { label: 'Overdue',   color: '#ef4444', bg: '#fef2f2', icon: 'alert-circle-outline'    },
    never_run: { label: 'Never Run', color: '#94a3b8', bg: '#f8fafc', icon: 'time-outline'             },
}

function PmTab({ params }: { params: { from?: string; to?: string } }) {
    const [data,    setData]    = useState<PmReportData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        setData(null)
        apiGetPmReport(params)
            .then(r => setData(r.data?.data ?? null))
            .catch(() => setData(null))
            .finally(() => setLoading(false))
    }, [params.from, params.to])

    if (loading) return <LoadingState />
    if (!data)   return <EmptyState label="No PM compliance data for this period." />

    const validMonths   = data.monthly.filter(m => m.compliance !== null)
    const avgCompliance = validMonths.length > 0
        ? Math.round(validMonths.reduce((s, m) => s + (m.compliance ?? 0), 0) / validMonths.length)
        : 100
    const onTime   = data.plans.filter(p => p.compliance_status === 'on_time').length
    const overdue  = data.plans.filter(p => p.compliance_status === 'overdue').length
    const neverRun = data.plans.filter(p => p.compliance_status === 'never_run').length

    const complianceColor = avgCompliance >= 80 ? '#10b981' : avgCompliance >= 50 ? '#f59e0b' : '#ef4444'
    const complianceBg    = avgCompliance >= 80 ? '#f0fdf4' : avgCompliance >= 50 ? '#fffbeb' : '#fef2f2'

    return (
        <>
            <View style={r.kpiRow}>
                <KpiCard label="Avg Compliance"  value={`${avgCompliance}%`}
                    bg={complianceBg} iconName="analytics-outline" iconColor={complianceColor} />
                <KpiCard label="On Time"          value={onTime}
                    bg="#f0fdf4" iconName="checkmark-circle-outline" iconColor="#10b981" />
            </View>
            <View style={r.kpiRow}>
                <KpiCard label="Overdue"          value={overdue}
                    bg="#fef2f2" iconName="alert-circle-outline" iconColor="#ef4444" />
                <KpiCard label="Never Run"        value={neverRun}
                    bg="#f8fafc" iconName="time-outline" iconColor="#94a3b8" />
            </View>

            {/* Compliance gauge */}
            <SectionTitle label="Overall Compliance" />
            <DataCard>
                <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>Compliance Rate</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: complianceColor }}>{avgCompliance}%</Text>
                    </View>
                    <View style={{ height: 10, borderRadius: 5, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
                        <View style={{ height: 10, borderRadius: 5, backgroundColor: complianceColor, width: `${avgCompliance}%` }} />
                    </View>
                </View>
            </DataCard>

            {/* PM Plans */}
            {data.plans.length > 0 && (
                <>
                    <SectionTitle label="PM Plan Status" />
                    <DataCard>
                        {data.plans.map((p, i) => {
                            const cfg = COMPLIANCE_CFG[p.compliance_status]
                            return (
                                <View key={p.id} style={[r.pmRow, i > 0 && r.statBorder]}>
                                    <View style={[r.pmBadge, { backgroundColor: cfg.bg }]}>
                                        <Ionicons name={cfg.icon as never} size={14} color={cfg.color} />
                                    </View>
                                    <View style={r.pmText}>
                                        <Text style={r.pmName} numberOfLines={1}>{p.name}</Text>
                                        <Text style={r.pmMeta}>
                                            {p.assigned_to ? `${p.assigned_to} · ` : ''}
                                            Next: {fmtDate(p.next_run_at)}
                                        </Text>
                                    </View>
                                    <Text style={[r.pmStatus, { color: cfg.color }]}>{cfg.label}</Text>
                                </View>
                            )
                        })}
                    </DataCard>
                </>
            )}
        </>
    )
}

// ── TAB: INVENTORY ────────────────────────────────────────────────────────────

function InventoryTab({ params }: { params: { from?: string; to?: string } }) {
    const [data,    setData]    = useState<InventoryReportData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        setData(null)
        apiGetInvReport(params)
            .then(r => setData(r.data?.data ?? null))
            .catch(() => setData(null))
            .finally(() => setLoading(false))
    }, [params.from, params.to])

    if (loading) return <LoadingState />
    if (!data)   return <EmptyState label="No inventory data for this period." />

    const maxUsed = Math.max(...data.top_items.map(i => i.total_used), 1)

    return (
        <>
            <View style={r.kpiRow}>
                <KpiCard label="Parts Cost (Period)" value={fmtMoney(data.cost_month)}
                    bg="#f0f7ff" iconName="cash-outline" iconColor="#2a85ff" />
                <KpiCard label="Parts Cost (Year)"   value={fmtMoney(data.cost_year)}
                    bg="#fffbeb" iconName="trending-up-outline" iconColor="#f59e0b" />
            </View>
            <View style={r.kpiRow}>
                <KpiCard label="Current Stock Value" value={fmtMoney(data.stock_value)}
                    bg="#f0fdf4" iconName="cube-outline" iconColor="#10b981" />
            </View>

            {data.top_items.length > 0 && (
                <>
                    <SectionTitle label="Top Parts Used" />
                    <DataCard>
                        {data.top_items.map((item, i) => (
                            <View key={item.id} style={[r.invRow, i > 0 && r.statBorder]}>
                                <Text style={r.invRank}>{i + 1}</Text>
                                <View style={r.invMain}>
                                    <Text style={r.invName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={r.invCode}>{item.code}</Text>
                                </View>
                                <View style={r.invRight}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                        <MiniBar pct={(item.total_used / maxUsed) * 100} color={Colors.primary} />
                                        <Text style={r.invQty}>{item.total_used} {item.unit ?? ''}</Text>
                                    </View>
                                    <Text style={r.invCost}>{fmtMoney(item.total_cost)}</Text>
                                </View>
                            </View>
                        ))}
                    </DataCard>
                </>
            )}
        </>
    )
}

// ── TABS CONFIG ───────────────────────────────────────────────────────────────

const TABS = [
    { key: 'wo',    label: 'Work Orders', icon: 'clipboard-outline'      },
    { key: 'asset', label: 'Assets',      icon: 'hardware-chip-outline'  },
    { key: 'pm',    label: 'PM Plans',    icon: 'calendar-outline'       },
    { key: 'inv',   label: 'Inventory',   icon: 'cube-outline'           },
]

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function ReportsScreen() {
    const insets   = useSafeAreaInsets()
    const PRESETS  = getPresets()
    const [preset,  setPreset]  = useState('all')
    const [tab,     setTab]     = useState('wo')

    const activePreset = PRESETS.find(p => p.key === preset) ?? PRESETS[0]
    const params = { from: activePreset.from, to: activePreset.to }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={22} color="#111" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Reports</Text>
                <View style={s.headerBtn} />
            </View>

            {/* Date presets */}
            <View style={s.presetWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.presetScroll}>
                    {PRESETS.map(p => (
                        <TouchableOpacity
                            key={p.key}
                            style={[s.preset, preset === p.key && s.presetActive]}
                            onPress={() => setPreset(p.key)}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.presetText, preset === p.key && s.presetTextActive]}>{p.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Tabs */}
            <View style={s.tabsWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsScroll}>
                    {TABS.map(t => (
                        <TouchableOpacity
                            key={t.key}
                            style={[s.tabChip, tab === t.key && s.tabChipActive]}
                            onPress={() => setTab(t.key)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={t.icon as never}
                                size={14}
                                color={tab === t.key ? '#fff' : '#888'}
                            />
                            <Text style={[s.tabChipText, tab === t.key && s.tabChipTextActive]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Content */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
            >
                {tab === 'wo'    && <WoTab        params={params} />}
                {tab === 'asset' && <AssetTab     params={params} />}
                {tab === 'pm'    && <PmTab        params={params} />}
                {tab === 'inv'   && <InventoryTab params={params} />}
            </ScrollView>
        </SafeAreaView>
    )
}

// ── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f5f5f5' },

    header: {
        flexDirection:     'row',
        alignItems:        'center',
        backgroundColor:   '#fff',
        paddingHorizontal: 12,
        paddingVertical:   14,
        borderBottomWidth: 1,
        borderBottomColor: '#ebebeb',
    },
    headerBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#111', textAlign: 'center' },

    presetWrap:   { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    presetScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
    preset: {
        paddingHorizontal: 14,
        paddingVertical:   6,
        borderRadius:      20,
        backgroundColor:   '#f5f5f5',
        borderWidth:       1,
        borderColor:       '#ebebeb',
    },
    presetActive:     { backgroundColor: '#111', borderColor: '#111' },
    presetText:       { fontSize: 12, fontWeight: '600', color: '#666' },
    presetTextActive: { color: '#fff' },

    tabsWrap:   { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ebebeb' },
    tabsScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
    tabChip: {
        flexDirection:     'row',
        alignItems:        'center',
        gap:               6,
        paddingHorizontal: 14,
        paddingVertical:   8,
        borderRadius:      20,
        backgroundColor:   '#f5f5f5',
        borderWidth:       1,
        borderColor:       '#ebebeb',
    },
    tabChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tabChipText:       { fontSize: 13, fontWeight: '600', color: '#888' },
    tabChipTextActive: { color: '#fff' },

    content: { padding: 16 },
})

const r = StyleSheet.create({
    kpiRow:   { flexDirection: 'row', gap: 12, marginBottom: 12 },

    /* Stat rows (status/priority/monthly) */
    statRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
    statBorder: { borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    dot:        { width: 9, height: 9, borderRadius: 5 },
    statLabel:  { width: 90, fontSize: 12, fontWeight: '600', color: '#444' },
    statVal:    { width: 28, fontSize: 13, fontWeight: '800', color: '#111', textAlign: 'right' },

    /* Monthly */
    monthRow:     { paddingHorizontal: 16, paddingVertical: 12 },
    monthLabel:   { fontSize: 12, fontWeight: '700', color: '#111', marginBottom: 6 },
    monthBars:    { gap: 4 },
    monthBarRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    monthBarLabel: { width: 44, fontSize: 11, color: '#aaa' },
    monthBarVal:  { width: 22, fontSize: 11, fontWeight: '700', color: '#555', textAlign: 'right' },

    /* Top technicians */
    techRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
    techRank:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
    techRankText: { fontSize: 10, fontWeight: '800', color: '#666' },
    techName:    { width: 110, fontSize: 13, fontWeight: '600', color: '#222' },

    /* Assets */
    assetRow:      { paddingHorizontal: 16, paddingVertical: 12 },
    assetMain:     { marginBottom: 6 },
    assetName:     { fontSize: 14, fontWeight: '700', color: '#111' },
    assetCode:     { fontSize: 11, color: '#aaa', marginTop: 1 },
    assetStats:    { gap: 3 },
    assetStatItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    assetStatVal:  { fontSize: 11, fontWeight: '600', color: '#666', width: 60 },
    assetDowntime: { fontSize: 11, color: '#888' },
    assetDate:     { fontSize: 11, color: '#aaa' },

    /* PM */
    pmRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
    pmBadge:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    pmText:   { flex: 1 },
    pmName:   { fontSize: 13, fontWeight: '700', color: '#111' },
    pmMeta:   { fontSize: 11, color: '#aaa', marginTop: 1 },
    pmStatus: { fontSize: 11, fontWeight: '700' },

    /* Inventory */
    invRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
    invRank: { fontSize: 11, fontWeight: '700', color: '#ccc', width: 16 },
    invMain: { flex: 1 },
    invName: { fontSize: 13, fontWeight: '700', color: '#111' },
    invCode: { fontSize: 11, color: '#aaa', fontFamily: 'monospace', marginTop: 1 },
    invRight: { width: 110 },
    invQty:  { fontSize: 11, fontWeight: '600', color: '#555', width: 60 },
    invCost: { fontSize: 12, fontWeight: '800', color: '#111', textAlign: 'right' },
})
