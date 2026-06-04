import { useState, useCallback, useEffect } from 'react'
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { StatusColors } from '@/constants/colors'
import { useAuthStore } from '@/store/authStore'
import { apiGetTechDashboard, type TechDashboard } from '@/services/DashboardService'
import { apiUpdateWorkOrder } from '@/services/WorkOrdersService'

type WO = TechDashboard['my_recent_work_orders'][0]

// ── Grow/shrink indicator ────────────────────────────────────────────────────

function GrowShrink({ value }: { value: number }) {
    if (value > 0) return (
        <View style={gs.row}>
            <Ionicons name="arrow-up" size={10} color="#10b981" />
            <Text style={[gs.txt, { color: '#10b981' }]}>+{value}%</Text>
            <Text style={gs.dim}>vs last month</Text>
        </View>
    )
    if (value < 0) return (
        <View style={gs.row}>
            <Ionicons name="arrow-down" size={10} color="#ff6a55" />
            <Text style={[gs.txt, { color: '#ff6a55' }]}>{value}%</Text>
            <Text style={gs.dim}>vs last month</Text>
        </View>
    )
    return (
        <View style={gs.row}>
            <Ionicons name="remove" size={10} color="#bbb" />
            <Text style={gs.dim}>0% vs last month</Text>
        </View>
    )
}
const gs = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    txt: { fontSize: 11, fontWeight: '700' },
    dim: { fontSize: 11, color: '#bbb' },
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(s: string) {
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatDate(d: string | null) {
    if (!d) return null
    const date = new Date(d)
    return {
        day:  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        year: String(date.getFullYear()),
    }
}

function isOverdue(wo: WO) {
    if (!wo.due_at) return false
    if (wo.status === 'completed' || wo.status === 'cancelled') return false
    return new Date(wo.due_at) < new Date()
}

function scoreBadgeColor(v: number) {
    if (v > 75) return '#10b981'
    if (v > 30) return '#f59e0b'
    return '#ff6a55'
}

const SCORE_LABELS: { key: keyof TechDashboard['performance_scores']; label: string }[] = [
    { key: 'completion', label: 'Completion Rate' },
    { key: 'on_time',    label: 'On-Time Rate'    },
    { key: 'response',   label: 'Response Time'   },
    { key: 'workload',   label: 'Workload'         },
    { key: 'efficiency', label: 'Efficiency'       },
]

const BAR_MAX_H = 90

// ── Screen ───────────────────────────────────────────────────────────────────

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
            const res = await apiGetTechDashboard()
            const payload = res.data?.data ?? res.data
            setData(payload)
        } catch (err: any) {
            const status = err?.response?.status
            const msg = status === 400 || status === 401
                ? 'Session expired. Please sign out and sign in again.'
                : 'Unable to load dashboard. Check your connection and try again.'
            setFetchError(msg)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const onRefresh = () => { setRefreshing(true); load() }

    const handleToggle = async (checked: boolean, woId: number, currentStatus: string) => {
        const newStatus = checked ? 'in_progress' : 'open'
        setData(prev => prev ? {
            ...prev,
            my_recent_work_orders: prev.my_recent_work_orders.map(wo =>
                wo.id === woId ? { ...wo, status: newStatus } : wo
            ),
        } : prev)
        try {
            await apiUpdateWorkOrder(String(woId), { status: newStatus } as never)
        } catch {
            setData(prev => prev ? {
                ...prev,
                my_recent_work_orders: prev.my_recent_work_orders.map(wo =>
                    wo.id === woId ? { ...wo, status: currentStatus } : wo
                ),
            } : prev)
        }
    }

    // chart data
    const chartMonths = data?.monthly_stats?.slice(-6) ?? []
    const maxVal      = Math.max(...chartMonths.flatMap(s => [s.active, s.completed]), 1)

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111" />}
                contentContainerStyle={s.scroll}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#111" style={{ marginTop: 60 }} />
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

                        {/* ── 1. KPI Summary ──────────────────────────────────── */}
                        <View style={s.card}>
                            <Text style={s.cardTitle}>My Work Orders</Text>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={s.kpiScroll}
                                contentContainerStyle={s.kpiRow}
                            >
                                <View style={[s.kpiCard, { backgroundColor: '#ff6a5512' }]}>
                                    <View style={[s.kpiIcon, { backgroundColor: '#ff6a5525' }]}>
                                        <Ionicons name="clipboard-outline" size={20} color="#ff6a55" />
                                    </View>
                                    <Text style={[s.kpiValue, { color: '#ff6a55' }]}>{data.my_work_orders.open}</Text>
                                    <Text style={s.kpiLabel}>Open WOs</Text>
                                    <GrowShrink value={data.my_work_orders.open_grow_shrink} />
                                </View>

                                <View style={[s.kpiCard, { backgroundColor: '#2a85ff12' }]}>
                                    <View style={[s.kpiIcon, { backgroundColor: '#2a85ff25' }]}>
                                        <Ionicons name="reload-outline" size={20} color="#2a85ff" />
                                    </View>
                                    <Text style={[s.kpiValue, { color: '#2a85ff' }]}>{data.my_work_orders.in_progress}</Text>
                                    <Text style={s.kpiLabel}>In Progress</Text>
                                    <GrowShrink value={data.my_work_orders.in_progress_grow_shrink} />
                                </View>

                                <View style={[s.kpiCard, { backgroundColor: '#10b98112' }]}>
                                    <View style={[s.kpiIcon, { backgroundColor: '#10b98125' }]}>
                                        <Ionicons name="stats-chart-outline" size={20} color="#10b981" />
                                    </View>
                                    <Text style={[s.kpiValue, { color: '#10b981' }]}>{data.performance_scores?.completion ?? 0}%</Text>
                                    <Text style={s.kpiLabel}>Completion Rate</Text>
                                    <GrowShrink value={data.my_work_orders.completion_grow_shrink} />
                                </View>

                                <View style={[s.kpiCard, { backgroundColor: '#a855f712' }]}>
                                    <View style={[s.kpiIcon, { backgroundColor: '#a855f725' }]}>
                                        <Ionicons name="checkmark-circle-outline" size={20} color="#a855f7" />
                                    </View>
                                    <Text style={[s.kpiValue, { color: '#a855f7' }]}>{data.my_work_orders.completed_week}</Text>
                                    <Text style={s.kpiLabel}>Done (week)</Text>
                                    <GrowShrink value={data.my_work_orders.done_week_grow_shrink} />
                                </View>
                            </ScrollView>
                        </View>

                        {/* ── 2. Preventive Maintenance ───────────────────────── */}
                        {hasPmRead && <View style={s.card}>
                            <View style={s.cardHeader}>
                                <Text style={s.cardTitle}>My Preventive Maintenance</Text>
                                <TouchableOpacity style={s.seeAllBtn} onPress={() => router.push('/app/pm-plans' as never)} activeOpacity={0.85}>
                                    <Text style={s.seeAllText}>See all</Text>
                                </TouchableOpacity>
                            </View>


                            {/* Due this week / month boxes */}
                            <View style={s.pmBoxRow}>
                                <View style={[s.pmBox, { backgroundColor: '#f59e0b12' }]}>
                                    <View style={[s.pmBoxIcon, { backgroundColor: '#f59e0b28' }]}>
                                        <Ionicons name="calendar-outline" size={20} color="#f59e0b" />
                                    </View>
                                    <View>
                                        <Text style={s.pmBoxLabel}>Due this week</Text>
                                        <Text style={[s.pmBoxValue, { color: '#f59e0b' }]}>{data.my_pm.due_week}</Text>
                                    </View>
                                </View>
                                <View style={[s.pmBox, { backgroundColor: '#2a85ff12' }]}>
                                    <View style={[s.pmBoxIcon, { backgroundColor: '#2a85ff28' }]}>
                                        <Ionicons name="calendar-clear-outline" size={20} color="#2a85ff" />
                                    </View>
                                    <View>
                                        <Text style={s.pmBoxLabel}>Due this month</Text>
                                        <Text style={[s.pmBoxValue, { color: '#2a85ff' }]}>{data.my_pm.due_month}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Upcoming PM list */}
                            {data.my_pm_due_soon?.length > 0 ? (
                                <>
                                    <Text style={s.sectionLabel}>UPCOMING</Text>
                                    {data.my_pm_due_soon.map((pm, i) => {
                                        const d = formatDate(pm.next_run_at)
                                        return (
                                            <View key={pm.id} style={[s.listItem, i > 0 && s.listItemBorder]}>
                                                <View style={[s.listIcon, { backgroundColor: '#a855f715' }]}>
                                                    <Ionicons name="calendar-outline" size={16} color="#a855f7" />
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
                        </View>}

                        {/* ── 3. WO Performance (bar chart) ───────────────────── */}
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

                                {/* Legend */}
                                <View style={s.legendRow}>
                                    {(chartView === 'all' || chartView === 'active') && (
                                        <View style={s.legendItem}>
                                            <View style={[s.legendDot, { backgroundColor: '#f59e0b' }]} />
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

                                {/* Bars */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={s.barsWrap}>
                                        {chartMonths.map((stat, i) => {
                                            const activeH    = Math.max((stat.active    / maxVal) * BAR_MAX_H, 4)
                                            const completedH = Math.max((stat.completed / maxVal) * BAR_MAX_H, 4)
                                            return (
                                                <View key={i} style={s.barGroup}>
                                                    {/* Value labels above bars */}
                                                    <View style={s.barValRow}>
                                                        {(chartView === 'all' || chartView === 'active') && (
                                                            <Text style={[s.barVal, { color: '#f59e0b' }]}>{stat.active}</Text>
                                                        )}
                                                        {(chartView === 'all' || chartView === 'completed') && (
                                                            <Text style={[s.barVal, { color: '#10b981' }]}>{stat.completed}</Text>
                                                        )}
                                                    </View>
                                                    {/* Bars aligned to bottom */}
                                                    <View style={s.barPair}>
                                                        {(chartView === 'all' || chartView === 'active') && (
                                                            <View style={[s.bar, { height: activeH, backgroundColor: '#f59e0b' }]} />
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

                        {/* ── 4. Performance Score ────────────────────────────── */}
                        {data.performance_scores && (
                            <View style={s.card}>
                                <Text style={s.cardTitle}>Performance Score</Text>
                                <View style={s.scoreList}>
                                    {SCORE_LABELS.map((item, idx) => {
                                        const val   = data.performance_scores[item.key]
                                        const color = scoreBadgeColor(val)
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

                        {/* ── 5. Recent Work Orders ───────────────────────────── */}
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
                                    const sc           = StatusColors[wo.status] ?? StatusColors.open
                                    const isToggleable = wo.status === 'open' || wo.status === 'in_progress'
                                    const overdue      = isOverdue(wo)
                                    const due          = formatDate(wo.due_at)
                                    return (
                                        <TouchableOpacity
                                            key={wo.id}
                                            style={[s.woRow, i > 0 && s.listItemBorder]}
                                            activeOpacity={0.75}
                                            onPress={() => router.push(`/app/work-orders/${wo.id}` as never)}
                                        >
                                            {/* Active toggle */}
                                            <Switch
                                                value={wo.status === 'in_progress'}
                                                disabled={!isToggleable}
                                                onValueChange={v => handleToggle(v, wo.id, wo.status)}
                                                trackColor={{ false: '#e4e4e4', true: '#111' }}
                                                thumbColor="#fff"
                                                ios_backgroundColor="#e4e4e4"
                                                style={{ transform: [{ scale: 0.78 }], marginRight: 4 }}
                                            />

                                            {/* Title + code */}
                                            <View style={s.woInfo}>
                                                <Text style={s.woTitle} numberOfLines={1}>{wo.title}</Text>
                                                <Text style={s.woCode}>{wo.code}</Text>
                                            </View>

                                            {/* Status badge */}
                                            <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                                                <View style={[s.statusDot, { backgroundColor: sc.text }]} />
                                                <Text style={[s.statusText, { color: sc.text }]}>{statusLabel(wo.status)}</Text>
                                            </View>

                                            {/* Due date */}
                                            {due && (
                                                <Text style={[s.woDue, overdue && s.woDueOverdue]}>{due.day}</Text>
                                            )}
                                        </TouchableOpacity>
                                    )
                                })
                            )}
                        </View>

                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: '#f5f5f5' },
    scroll: { padding: 16, gap: 16 },

    errorWrap:  { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 32 },
    errorTitle: { fontSize: 16, fontWeight: '700', color: '#555', textAlign: 'center' },
    errorMsg:   { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
    retryBtn:   { marginTop: 8, backgroundColor: '#111', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
    retryText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

    /* White card */
    card: {
        backgroundColor: '#fff',
        borderRadius:    20,
        padding:         16,
        borderWidth:     1,
        borderColor:     '#f0f0f0',
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 2 },
        shadowOpacity:   0.05,
        shadowRadius:    8,
        elevation:       3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    cardTitle:  { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 14 },

    seeAllBtn:  { backgroundColor: '#111', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    seeAllText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
    emptyText:    { color: '#bbb', fontSize: 13, textAlign: 'center', paddingVertical: 16 },

    /* KPI cards — horizontal scroll */
    kpiScroll: { marginHorizontal: -16, marginTop: 4 },
    kpiRow:    { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
    kpiCard:   { width: 150, borderRadius: 14, padding: 14, gap: 6 },
    kpiIcon:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    kpiValue:  { fontSize: 28, fontWeight: '900', lineHeight: 32, marginTop: 4 },
    kpiLabel:  { fontSize: 12, color: '#888', fontWeight: '600' },

    /* PM boxes */
    pmBoxRow:  { flexDirection: 'row', gap: 10, marginBottom: 16 },
    pmBox: {
        flex:          1,
        flexDirection: 'row',
        alignItems:    'center',
        gap:           12,
        borderRadius:  14,
        padding:       14,
    },
    pmBoxIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    pmBoxLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 2 },
    pmBoxValue: { fontSize: 26, fontWeight: '900', lineHeight: 30 },

    /* List rows (PM upcoming) */
    listItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    listItemBorder: { borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    listIcon:       { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    listMid:        { flex: 1 },
    listTitle:      { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 2 },
    listCode:       { fontSize: 11, color: '#aaa', fontWeight: '500' },
    listDate:       { alignItems: 'flex-end' },
    listDateDay:    { fontSize: 13, fontWeight: '700', color: '#111' },
    listDateYear:   { fontSize: 11, color: '#aaa' },

    /* Chart toggle */
    toggleRow:       { flexDirection: 'row', gap: 4 },
    toggleBtn:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f2f2f2' },
    toggleBtnActive: { backgroundColor: '#111' },
    toggleText:      { fontSize: 12, fontWeight: '600', color: '#888' },
    toggleTextActive:{ color: '#fff' },

    /* Legend */
    legendRow:  { flexDirection: 'row', gap: 14, marginBottom: 14 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot:  { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: '#888', fontWeight: '500' },

    /* Bar chart */
    barsWrap:  { flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingBottom: 4, minHeight: BAR_MAX_H + 40 },
    barGroup:  { alignItems: 'center', gap: 4 },
    barValRow: { flexDirection: 'row', gap: 4, minHeight: 18 },
    barVal:    { fontSize: 11, fontWeight: '700' },
    barPair:   { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: BAR_MAX_H },
    bar:       { width: 14, borderRadius: 4 },
    barLabel:  { fontSize: 11, color: '#aaa', fontWeight: '500', marginTop: 4 },

    /* Performance score */
    scoreList: { gap: 14, marginTop: 4 },
    scoreRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    scoreNum:  {
        width:           28,
        height:          28,
        borderRadius:    14,
        borderWidth:     1.5,
        borderColor:     '#e4e4e4',
        alignItems:      'center',
        justifyContent:  'center',
    },
    scoreNumText:    { fontSize: 12, fontWeight: '700', color: '#111' },
    scoreLabel:      { fontSize: 13, fontWeight: '600', color: '#333' },
    scoreDash:       { flex: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: '#ddd' },
    scoreBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    scoreBadgeText:  { fontSize: 12, fontWeight: '700', color: '#fff' },

    /* Recent WO rows */
    woRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 6 },
    woInfo:  { flex: 1 },
    woTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 2 },
    woCode:  { fontSize: 11, color: '#aaa', fontWeight: '500' },

    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
    statusDot:   { width: 5, height: 5, borderRadius: 3 },
    statusText:  { fontSize: 10, fontWeight: '700' },

    woDue:        { fontSize: 11, fontWeight: '600', color: '#aaa', marginLeft: 4, minWidth: 42, textAlign: 'right' },
    woDueOverdue: { color: '#ff6a55' },
})
