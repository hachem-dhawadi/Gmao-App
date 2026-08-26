import { useState, useCallback, useEffect } from 'react'
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { StatusColors, PriorityColors } from '@/constants/colors'
import { useAuthStore } from '@/store/authStore'
import { apiGetTechDashboard, type TechDashboard } from '@/services/DashboardService'
import { apiUpdateWorkOrder } from '@/services/WorkOrdersService'

const BLUE  = '#374151'
const HEADER_BG = '#ffffff'
const BAR_H = 90

type WO = TechDashboard['my_recent_work_orders'][0]

// ── Welcome header ────────────────────────────────────────────────────────────

function WelcomeHeader({ name, overdue }: { name: string; overdue: number }) {
    const hour  = new Date().getHours()
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
    const date  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    return (
        <View style={h.wrap}>
            <View style={h.top}>
                <View style={{ flex: 1 }}>
                    <Text style={h.greet}>{greet},</Text>
                    <Text style={h.name} numberOfLines={1}>{name}</Text>
                </View>
                <View style={h.datePill}>
                    <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.75)" />
                    <Text style={h.dateText}>{date}</Text>
                </View>
            </View>
            {overdue > 0 && (
                <TouchableOpacity
                    style={h.alert}
                    onPress={() => router.push('/app/work-orders' as never)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                    <Text style={h.alertText}>
                        {overdue} overdue work order{overdue > 1 ? 's' : ''}
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color="#dc2626" />
                </TouchableOpacity>
            )}
        </View>
    )
}

const h = StyleSheet.create({
    wrap: {
        backgroundColor: HEADER_BG,
        paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20,
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    },
    top:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    greet:    { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
    name:     { fontSize: 24, fontWeight: '900', color: '#111', marginTop: 1 },
    datePill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#f5f5f5',
        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
        marginTop: 4, flexShrink: 0,
    },
    dateText:  { fontSize: 11, color: '#6b7280', fontWeight: '600' },
    alert: {
        flexDirection: 'row', alignItems: 'center', gap: 7,
        backgroundColor: '#fff1f0',
        borderWidth: 1, borderColor: '#fca5a5',
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    },
    alertText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#dc2626' },
})

// ── KPI tile ──────────────────────────────────────────────────────────────────

function KpiTile({ icon, label, value, valueColor, trend }: {
    icon: string; label: string; value: number | string
    valueColor: string; trend: number
}) {
    const upDown = trend > 0 ? '#10b981' : trend < 0 ? '#ff6a55' : '#bbb'
    const arrow  = trend > 0 ? 'arrow-up' : trend < 0 ? 'arrow-down' : 'remove'
    return (
        <View style={k.tile}>
            <View style={k.iconBox}>
                <Ionicons name={icon as never} size={18} color={BLUE} />
            </View>
            <Text style={[k.value, { color: valueColor }]}>{value}</Text>
            <Text style={k.label}>{label}</Text>
            <View style={k.trendRow}>
                <Ionicons name={arrow as never} size={10} color={upDown} />
                <Text style={[k.trendText, { color: upDown }]}>
                    {trend !== 0 ? `${trend > 0 ? '+' : ''}${trend}%` : '0%'}
                </Text>
                <Text style={k.trendDim}>vs last month</Text>
            </View>
        </View>
    )
}

const k = StyleSheet.create({
    tile: {
        width: 138, backgroundColor: '#fff', borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: '#e5e7eb',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    iconBox: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6',
        alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    },
    value:    { fontSize: 30, fontWeight: '900', lineHeight: 34 },
    label:    { fontSize: 11, color: '#999', fontWeight: '600', marginTop: 5, marginBottom: 4 },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    trendText:{ fontSize: 11, fontWeight: '700' },
    trendDim: { fontSize: 10, color: '#bbb' },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusLabel(s: string) {
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function fmtShort(d: string | null) {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtFull(d: string | null) {
    if (!d) return null
    const date = new Date(d)
    return {
        day:  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        year: String(date.getFullYear()),
    }
}

function isOverdue(wo: WO) {
    if (!wo.due_at || wo.status === 'completed' || wo.status === 'cancelled') return false
    return new Date(wo.due_at) < new Date()
}

function scoreBg(v: number) {
    return v > 75 ? '#10b981' : v > 30 ? '#f59e0b' : '#ff6a55'
}

const SCORE_LABELS: { key: keyof TechDashboard['performance_scores']; label: string }[] = [
    { key: 'completion', label: 'Completion Rate' },
    { key: 'on_time',    label: 'On-Time Rate'    },
    { key: 'response',   label: 'Response Time'   },
    { key: 'workload',   label: 'Workload'         },
    { key: 'efficiency', label: 'Efficiency'       },
]

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
    const user      = useAuthStore(s => s.user)
    const hasPmRead = useAuthStore(s => s.user?.permissions?.includes('pm_plans.read') ?? false)

    const [data,       setData]       = useState<TechDashboard | null>(null)
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [chartView,  setChartView]  = useState<'all' | 'active' | 'completed'>('all')

    const load = useCallback(async () => {
        setFetchError(null)
        try {
            const res     = await apiGetTechDashboard()
            const payload = res.data?.data ?? res.data
            setData(payload)
        } catch (err: any) {
            const status = err?.response?.status
            setFetchError(
                status === 400 || status === 401
                    ? 'Session expired. Please sign out and sign in again.'
                    : 'Unable to load dashboard. Check your connection and try again.',
            )
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const onRefresh = () => { setRefreshing(true); load() }

    const handleToggle = async (checked: boolean, woId: number, currentStatus: string) => {
        const next = checked ? 'in_progress' : 'open'
        setData(prev => prev ? {
            ...prev,
            my_recent_work_orders: prev.my_recent_work_orders.map(wo =>
                wo.id === woId ? { ...wo, status: next } : wo,
            ),
        } : prev)
        try {
            await apiUpdateWorkOrder(String(woId), { status: next } as never)
        } catch {
            setData(prev => prev ? {
                ...prev,
                my_recent_work_orders: prev.my_recent_work_orders.map(wo =>
                    wo.id === woId ? { ...wo, status: currentStatus } : wo,
                ),
            } : prev)
        }
    }

    const chartMonths = data?.monthly_stats?.slice(-6) ?? []
    const maxVal      = Math.max(...chartMonths.flatMap(s => [s.active, s.completed]), 1)
    const firstName   = (user?.name ?? 'Technician').split(' ')[0]

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <WelcomeHeader name={firstName} overdue={data?.my_work_orders?.overdue ?? 0} />

            <ScrollView
                style={s.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
                contentContainerStyle={s.content}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
                ) : fetchError ? (
                    <View style={s.errorWrap}>
                        <Ionicons name="cloud-offline-outline" size={40} color="#ccc" />
                        <Text style={s.errorTitle}>Could not load dashboard</Text>
                        <Text style={s.errorMsg}>{fetchError}</Text>
                        <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); load() }}>
                            <Text style={s.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : !data ? null : (
                    <>
                        {/* 1. KPI tiles */}
                        <View style={s.card}>
                            <Text style={s.cardTitle}>My Work Orders</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={s.kpiScroll}
                                contentContainerStyle={s.kpiRow}
                            >
                                <KpiTile
                                    icon="clipboard-outline"
                                    label="Open"
                                    value={data.my_work_orders.open}
                                    valueColor="#f59e0b"
                                    trend={data.my_work_orders.open_grow_shrink}
                                />
                                <KpiTile
                                    icon="reload-outline"
                                    label="In Progress"
                                    value={data.my_work_orders.in_progress}
                                    valueColor={BLUE}
                                    trend={data.my_work_orders.in_progress_grow_shrink}
                                />
                                <KpiTile
                                    icon="stats-chart-outline"
                                    label="Completion"
                                    value={`${data.performance_scores?.completion ?? 0}%`}
                                    valueColor="#10b981"
                                    trend={data.my_work_orders.completion_grow_shrink}
                                />
                                <KpiTile
                                    icon="checkmark-circle-outline"
                                    label="Done (week)"
                                    value={data.my_work_orders.completed_week}
                                    valueColor="#111"
                                    trend={data.my_work_orders.done_week_grow_shrink}
                                />
                            </ScrollView>
                        </View>

                        {/* 2. PM */}
                        {hasPmRead && (
                            <View style={s.card}>
                                <View style={s.cardHeader}>
                                    <Text style={s.cardTitle}>Preventive Maintenance</Text>
                                    <TouchableOpacity style={s.seeAllBtn} onPress={() => router.push('/app/pm-plans' as never)} activeOpacity={0.85}>
                                        <Text style={s.seeAllText}>See all</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={s.pmBoxRow}>
                                    <View style={[s.pmBox, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                                        <View style={[s.pmBoxIcon, { backgroundColor: '#fde68a55' }]}>
                                            <Ionicons name="calendar-outline" size={20} color="#f59e0b" />
                                        </View>
                                        <View>
                                            <Text style={s.pmBoxLabel}>Due this week</Text>
                                            <Text style={[s.pmBoxValue, { color: '#f59e0b' }]}>{data.my_pm.due_week}</Text>
                                        </View>
                                    </View>
                                    <View style={[s.pmBox, { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }]}>
                                        <View style={[s.pmBoxIcon, { backgroundColor: BLUE + '18' }]}>
                                            <Ionicons name="calendar-clear-outline" size={20} color={BLUE} />
                                        </View>
                                        <View>
                                            <Text style={s.pmBoxLabel}>Due this month</Text>
                                            <Text style={[s.pmBoxValue, { color: BLUE }]}>{data.my_pm.due_month}</Text>
                                        </View>
                                    </View>
                                </View>

                                {data.my_pm_due_soon?.length > 0 ? (
                                    <>
                                        <Text style={s.sectionLabel}>UPCOMING</Text>
                                        {data.my_pm_due_soon.map((pm, i) => {
                                            const d = fmtFull(pm.next_run_at)
                                            return (
                                                <View key={pm.id} style={[s.listItem, i > 0 && s.listItemBorder]}>
                                                    <View style={[s.listIcon, { backgroundColor: BLUE + '15' }]}>
                                                        <Ionicons name="calendar-outline" size={16} color={BLUE} />
                                                    </View>
                                                    <View style={s.listMid}>
                                                        <Text style={s.listTitle} numberOfLines={1}>{pm.name}</Text>
                                                        <Text style={s.listCode}>{pm.code}</Text>
                                                    </View>
                                                    {d && (
                                                        <View style={s.listDate}>
                                                            <Text style={s.listDateDay}>{d.day}</Text>
                                                            <Text style={s.listDateYear}>{d.year}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            )
                                        })}
                                    </>
                                ) : (
                                    <Text style={s.emptyText}>No upcoming PM plans</Text>
                                )}
                            </View>
                        )}

                        {/* 3. Bar chart */}
                        {chartMonths.length > 0 && (
                            <View style={s.card}>
                                <View style={s.cardHeader}>
                                    <Text style={s.cardTitle}>WO Performance</Text>
                                    <View style={s.toggleRow}>
                                        {(['all', 'active', 'completed'] as const).map(v => (
                                            <TouchableOpacity
                                                key={v}
                                                style={[s.toggleBtn, chartView === v && s.toggleBtnActive]}
                                                onPress={() => setChartView(v)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={[s.toggleText, chartView === v && s.toggleTextActive]}>
                                                    {v.charAt(0).toUpperCase() + v.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                                <View style={s.legendRow}>
                                    {(chartView === 'all' || chartView === 'active') && (
                                        <View style={s.legendItem}>
                                            <View style={[s.legendDot, { backgroundColor: BLUE }]} />
                                            <Text style={s.legendText}>Active</Text>
                                        </View>
                                    )}
                                    {(chartView === 'all' || chartView === 'completed') && (
                                        <View style={s.legendItem}>
                                            <View style={[s.legendDot, { backgroundColor: '#10b981' }]} />
                                            <Text style={s.legendText}>Completed</Text>
                                        </View>
                                    )}
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={s.barsWrap}>
                                        {chartMonths.map((stat, i) => {
                                            const activeH    = Math.max((stat.active    / maxVal) * BAR_H, 4)
                                            const completedH = Math.max((stat.completed / maxVal) * BAR_H, 4)
                                            return (
                                                <View key={i} style={s.barGroup}>
                                                    <View style={s.barValRow}>
                                                        {(chartView === 'all' || chartView === 'active') && (
                                                            <Text style={[s.barVal, { color: BLUE }]}>{stat.active}</Text>
                                                        )}
                                                        {(chartView === 'all' || chartView === 'completed') && (
                                                            <Text style={[s.barVal, { color: '#10b981' }]}>{stat.completed}</Text>
                                                        )}
                                                    </View>
                                                    <View style={s.barPair}>
                                                        {(chartView === 'all' || chartView === 'active') && (
                                                            <View style={[s.bar, { height: activeH, backgroundColor: BLUE }]} />
                                                        )}
                                                        {(chartView === 'all' || chartView === 'completed') && (
                                                            <View style={[s.bar, { height: completedH, backgroundColor: '#10b981' }]} />
                                                        )}
                                                    </View>
                                                    <Text style={s.barLabel}>{stat.month.substring(0, 3)}</Text>
                                                </View>
                                            )
                                        })}
                                    </View>
                                </ScrollView>
                            </View>
                        )}

                        {/* 4. Performance score */}
                        {data.performance_scores && (
                            <View style={s.card}>
                                <Text style={s.cardTitle}>Performance Score</Text>
                                <View style={s.scoreList}>
                                    {SCORE_LABELS.map((item, idx) => {
                                        const val   = data.performance_scores[item.key]
                                        const color = scoreBg(val)
                                        return (
                                            <View key={item.key} style={s.scoreRow}>
                                                <View style={s.scoreNum}>
                                                    <Text style={s.scoreNumText}>{idx + 1}</Text>
                                                </View>
                                                <Text style={s.scoreLabel}>{item.label}</Text>
                                                <View style={s.scoreDash} />
                                                <View style={[s.scoreBadge, { backgroundColor: color }]}>
                                                    <Text style={s.scoreBadgeText}>{val}%</Text>
                                                </View>
                                            </View>
                                        )
                                    })}
                                </View>
                            </View>
                        )}

                        {/* 5. Recent WOs */}
                        <View style={s.card}>
                            <View style={s.cardHeader}>
                                <Text style={s.cardTitle}>Recent Work Orders</Text>
                                <TouchableOpacity style={s.seeAllBtn} onPress={() => router.push('/app/work-orders')} activeOpacity={0.85}>
                                    <Text style={s.seeAllText}>See all</Text>
                                </TouchableOpacity>
                            </View>
                            {data.my_recent_work_orders.length === 0 ? (
                                <Text style={s.emptyText}>No work orders</Text>
                            ) : (
                                data.my_recent_work_orders.map((wo, i) => {
                                    const sc  = StatusColors[wo.status]   ?? StatusColors.open
                                    const pc  = PriorityColors[wo.priority] ?? PriorityColors.medium
                                    const can = wo.status === 'open' || wo.status === 'in_progress'
                                    const due = fmtShort(wo.due_at)
                                    const odd = isOverdue(wo)
                                    return (
                                        <TouchableOpacity
                                            key={wo.id}
                                            style={[s.woRow, i > 0 && s.listItemBorder]}
                                            activeOpacity={0.75}
                                            onPress={() => router.push(`/app/work-orders/${wo.id}` as never)}
                                        >
                                            <Switch
                                                value={wo.status === 'in_progress'}
                                                disabled={!can}
                                                onValueChange={v => handleToggle(v, wo.id, wo.status)}
                                                trackColor={{ false: '#e4e4e4', true: BLUE }}
                                                thumbColor="#fff"
                                                ios_backgroundColor="#e4e4e4"
                                                style={{ transform: [{ scale: 0.78 }], marginRight: 2, flexShrink: 0 }}
                                            />
                                            <View style={s.woInfo}>
                                                <Text style={s.woTitle} numberOfLines={1}>{wo.title}</Text>
                                                {wo.asset && (
                                                    <View style={s.woAssetRow}>
                                                        <Ionicons name="cube-outline" size={11} color="#bbb" />
                                                        <Text style={s.woAssetName} numberOfLines={1}>{wo.asset.name}</Text>
                                                    </View>
                                                )}
                                                <View style={s.woFootRow}>
                                                    <View style={[s.priorityChip, { backgroundColor: pc.bg }]}>
                                                        <Text style={[s.priorityChipText, { color: pc.text }]}>
                                                            {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                                                        </Text>
                                                    </View>
                                                    {due && (
                                                        <Text style={[s.woDue, odd && s.woDueRed]}>{due}</Text>
                                                    )}
                                                </View>
                                            </View>
                                            <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                                                <View style={[s.statusDot, { backgroundColor: sc.text }]} />
                                                <Text style={[s.statusText, { color: sc.text }]}>{statusLabel(wo.status)}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )
                                })
                            )}
                        </View>

                        <View style={{ height: 16 }} />
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe:    { flex: 1, backgroundColor: HEADER_BG },
    scroll:  { flex: 1, backgroundColor: '#f5f5f5' },
    content: { padding: 16, gap: 14 },

    errorWrap:  { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 32 },
    errorTitle: { fontSize: 16, fontWeight: '700', color: '#555', textAlign: 'center' },
    errorMsg:   { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
    retryBtn:   { marginTop: 8, backgroundColor: BLUE, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
    retryText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

    card: {
        backgroundColor: '#fff', borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: '#e5e7eb',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    cardTitle:  { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 14 },
    seeAllBtn:  { backgroundColor: BLUE, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    seeAllText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    sectionLabel:   { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
    emptyText:      { color: '#bbb', fontSize: 13, textAlign: 'center', paddingVertical: 16 },

    kpiScroll: { marginHorizontal: -16, marginTop: 4 },
    kpiRow:    { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },

    pmBoxRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    pmBox: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: 14, padding: 14, borderWidth: 1,
    },
    pmBoxIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    pmBoxLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 2 },
    pmBoxValue: { fontSize: 26, fontWeight: '900', lineHeight: 30 },

    listItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    listItemBorder: { borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    listIcon:       { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    listMid:        { flex: 1 },
    listTitle:      { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 2 },
    listCode:       { fontSize: 11, color: '#aaa', fontWeight: '500' },
    listDate:       { alignItems: 'flex-end' },
    listDateDay:    { fontSize: 13, fontWeight: '700', color: '#111' },
    listDateYear:   { fontSize: 11, color: '#aaa' },

    toggleRow:       { flexDirection: 'row', gap: 4 },
    toggleBtn:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f2f2f2' },
    toggleBtnActive: { backgroundColor: BLUE },
    toggleText:      { fontSize: 12, fontWeight: '600', color: '#888' },
    toggleTextActive:{ color: '#fff' },

    legendRow:  { flexDirection: 'row', gap: 14, marginBottom: 14 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot:  { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: '#888', fontWeight: '500' },

    barsWrap:  { flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingBottom: 4, minHeight: BAR_H + 40 },
    barGroup:  { alignItems: 'center', gap: 4 },
    barValRow: { flexDirection: 'row', gap: 4, minHeight: 18 },
    barVal:    { fontSize: 11, fontWeight: '700' },
    barPair:   { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: BAR_H },
    bar:       { width: 14, borderRadius: 4 },
    barLabel:  { fontSize: 11, color: '#aaa', fontWeight: '500', marginTop: 4 },

    scoreList:     { gap: 14, marginTop: 4 },
    scoreRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
    scoreNum:      { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#e4e4e4', alignItems: 'center', justifyContent: 'center' },
    scoreNumText:  { fontSize: 12, fontWeight: '700', color: '#111' },
    scoreLabel:    { fontSize: 13, fontWeight: '600', color: '#333' },
    scoreDash:     { flex: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: '#e0e0e0' },
    scoreBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    scoreBadgeText:{ fontSize: 12, fontWeight: '700', color: '#fff' },

    woRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 6 },
    woInfo:       { flex: 1, minWidth: 0 },
    woTitle:      { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 3 },
    woAssetRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
    woAssetName:  { fontSize: 11, color: '#999', fontWeight: '500', flex: 1 },
    woFootRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
    priorityChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
    priorityChipText: { fontSize: 10, fontWeight: '700' },
    woDue:        { fontSize: 11, fontWeight: '600', color: '#bbb' },
    woDueRed:     { color: '#ff6a55' },

    statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
    statusDot:    { width: 5, height: 5, borderRadius: 3 },
    statusText:   { fontSize: 10, fontWeight: '700' },
})
