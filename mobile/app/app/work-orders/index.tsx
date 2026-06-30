import { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react'
import {
    View, Text, StyleSheet, FlatList, TextInput,
    RefreshControl, ActivityIndicator, Pressable, Animated, ScrollView,
} from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { StatusColors, PriorityColors } from '@/constants/colors'
import { useAuthStore } from '@/store/authStore'
import { apiGetWorkOrders, type WorkOrder } from '@/services/WorkOrdersService'

// ── helpers ───────────────────────────────────────────────────────────────────

function toLabel(s: string) {
    return s === 'all' ? 'All' : s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
function formatDate(d: string | null) {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function isOverdue(wo: WorkOrder) {
    if (!wo.due_at) return false
    if (['completed', 'cancelled', 'pending_approval', 'rejected'].includes(wo.status)) return false
    return new Date(wo.due_at) < new Date()
}

const AVATAR_PALETTE = ['#2a85ff', '#ff6a55', '#10b981', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899']
function avatarColor(id: number) { return AVATAR_PALETTE[id % AVATAR_PALETTE.length] }

// ── constants ─────────────────────────────────────────────────────────────────

type FilterState = { status: string; priority: string; myOnly: boolean; showArchived: boolean }
const DEFAULT_FILTER: FilterState = { status: 'all', priority: 'all', myOnly: false, showArchived: false }
const PRIORITY_OPTS  = ['all', 'low', 'medium', 'high', 'critical']
const STATUS_TABS    = [
    { key: 'all',              label: 'All'         },
    { key: 'pending_approval', label: 'Pending'     },
    { key: 'open',             label: 'Open'        },
    { key: 'in_progress',      label: 'In Progress' },
    { key: 'on_hold',          label: 'On Hold'     },
    { key: 'completed',        label: 'Completed'   },
    { key: 'cancelled',        label: 'Cancelled'   },
    { key: 'rejected',         label: 'Rejected'    },
]

// ── WO Card ───────────────────────────────────────────────────────────────────

const WOCard = memo(function WOCard({ item }: { item: WorkOrder }) {
    const sc        = StatusColors[item.status]     ?? StatusColors.open
    const pc        = PriorityColors[item.priority] ?? PriorityColors.medium
    const due       = formatDate(item.due_at)
    const overdue   = isOverdue(item)
    const assignees = item.assigned_member ? [item.assigned_member] : []
    const extra     = 0

    return (
        <TouchableOpacity
            style={[s.card, { borderLeftColor: pc.text, borderLeftWidth: 4 }]}
            activeOpacity={0.7}
            onPress={() => router.push(`/app/work-orders/${item.id}` as never)}
        >
            {/* Code + status */}
            <View style={s.cardTop}>
                <Text style={s.codeText}>{item.code}</Text>
                <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: sc.text }]} />
                    <Text style={[s.statusText, { color: sc.text }]}>{toLabel(item.status)}</Text>
                </View>
            </View>

            {/* Title */}
            <Text style={s.title} numberOfLines={2}>{item.title}</Text>

            {/* Asset */}
            {item.asset && (
                <View style={s.assetRow}>
                    <Ionicons name="hardware-chip-outline" size={11} color="#c0c8d0" />
                    <Text style={s.assetText} numberOfLines={1}>{item.asset.name}</Text>
                </View>
            )}

            {/* Footer */}
            <View style={s.cardFoot}>
                <View style={s.footMeta}>
                    {overdue ? (
                        <View style={s.overdueChip}>
                            <Ionicons name="warning" size={11} color="#ff6a55" />
                            <Text style={s.overdueText}>Overdue{due ? ` · ${due}` : ''}</Text>
                        </View>
                    ) : due ? (
                        <View style={s.dueChip}>
                            <Ionicons name="calendar-outline" size={11} color="#c0c8d0" />
                            <Text style={s.dueText}>{due}</Text>
                        </View>
                    ) : (
                        <View style={[s.priorityPill, { backgroundColor: pc.bg }]}>
                            <Text style={[s.priorityPillText, { color: pc.text }]}>
                                {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                            </Text>
                        </View>
                    )}
                </View>

                {assignees.length > 0 && (
                    <View style={s.avatarRow}>
                        {assignees.map((m, i) => (
                            <View
                                key={m.id}
                                style={[s.avatar, {
                                    backgroundColor: avatarColor(m.id),
                                    marginLeft: i > 0 ? -9 : 0,
                                    zIndex: assignees.length - i,
                                }]}
                            >
                                <Text style={s.avatarText}>
                                    {(m.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                </Text>
                            </View>
                        ))}
                        {extra > 0 && (
                            <View style={[s.avatar, s.avatarExtra, { marginLeft: -9 }]}>
                                <Text style={s.avatarExtraText}>+{extra}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    )
})

// ── Screen ────────────────────────────────────────────────────────────────────

export default function WorkOrdersScreen() {
    const insets    = useSafeAreaInsets()
    const user      = useAuthStore(st => st.user)
    const hasWoRead = useAuthStore(st => st.user?.permissions?.includes('work_orders.read') ?? false)

    if (!hasWoRead) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f8' }} edges={['top']}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="lock-closed-outline" size={32} color="#aaa" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' }}>Access Restricted</Text>
                    <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 }}>
                        Your role does not have permission to access Work Orders.
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    const [workOrders,  setWorkOrders]  = useState<WorkOrder[]>([])
    const [loading,     setLoading]     = useState(true)
    const [refreshing,  setRefreshing]  = useState(false)
    const [search,      setSearch]      = useState('')
    const [filter,      setFilter]      = useState<FilterState>(DEFAULT_FILTER)
    const [localFilter, setLocalFilter] = useState<FilterState>(DEFAULT_FILTER)
    const [filterOpen,  setFilterOpen]  = useState(false)

    const slideAnim    = useRef(new Animated.Value(700)).current
    const backdropAnim = useRef(new Animated.Value(0)).current

    const openFilter = useCallback(() => {
        setLocalFilter({ ...filter })
        slideAnim.setValue(700)
        backdropAnim.setValue(0)
        Animated.parallel([
            Animated.spring(slideAnim,    { toValue: 0, bounciness: 0, speed: 20, useNativeDriver: true }),
            Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start()
        setFilterOpen(true)
    }, [filter])

    const closeFilter = useCallback(() => {
        Animated.parallel([
            Animated.timing(slideAnim,    { toValue: 700, duration: 220, useNativeDriver: true }),
            Animated.timing(backdropAnim, { toValue: 0,   duration: 180, useNativeDriver: true }),
        ]).start(() => setFilterOpen(false))
    }, [])

    const applyFilter = useCallback(() => {
        setFilter(localFilter)
        closeFilter()
    }, [localFilter, closeFilter])

    const resetFilter = useCallback(() => {
        const reset = { ...DEFAULT_FILTER, status: filter.status }
        setLocalFilter(reset)
        setFilter(reset)
        closeFilter()
    }, [closeFilter, filter.status])

    // counts per status for tabs (with myOnly already applied)
    const statusCounts = useMemo(() => {
        let base = workOrders
        if (filter.myOnly && user?.memberId)
            base = base.filter(w => w.assigned_member?.id === user.memberId)
        const counts: Record<string, number> = { all: base.length }
        for (const wo of base) counts[wo.status] = (counts[wo.status] ?? 0) + 1
        return counts
    }, [workOrders, filter.myOnly, user?.memberId])

    const load = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true)
        try {
            const params: Record<string, unknown> = { per_page: 100 }
            if (filter.myOnly)             params.my_only       = 1
            if (filter.showArchived)       params.show_archived = 1
            if (filter.priority !== 'all') params.priority      = filter.priority
            const res = await apiGetWorkOrders(params)
            setWorkOrders(res.data?.data?.work_orders ?? [])
        } catch {
            setWorkOrders([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [filter.myOnly, filter.showArchived, filter.priority])

    useEffect(() => { load(true) }, [load])
    const onRefresh = () => { setRefreshing(true); load() }

    const filtered = useMemo(() => {
        let list = workOrders
        if (filter.myOnly && user?.memberId)
            list = list.filter(w => w.assigned_member?.id === user.memberId)
        if (filter.status !== 'all')
            list = list.filter(w => w.status === filter.status)
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(w =>
                w.title.toLowerCase().includes(q) ||
                w.code.toLowerCase().includes(q)  ||
                (w.asset?.name ?? '').toLowerCase().includes(q)
            )
        }
        return list
    }, [workOrders, filter.status, filter.myOnly, search, user?.memberId])

    const renderItem = useCallback(({ item }: { item: WorkOrder }) => <WOCard item={item} />, [])

    const activeFilterCount =
        (filter.priority !== 'all' ? 1 : 0) +
        (filter.myOnly ? 1 : 0) +
        (filter.showArchived ? 1 : 0)

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            {/* ── Header ── */}
            <View style={s.header}>
                <View>
                    <Text style={s.headerTitle}>Work Orders</Text>
                    {!loading && (
                        <Text style={s.headerSub}>
                            {filtered.length} {filter.status !== 'all' ? toLabel(filter.status) : 'total'}
                        </Text>
                    )}
                </View>
                <TouchableOpacity
                    style={s.addBtn}
                    onPress={() => router.push('/app/work-orders/create' as never)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* ── Search + Filter ── */}
            <View style={s.toolbar}>
                <View style={s.searchWrap}>
                    <Ionicons name="search-outline" size={15} color="#bbb" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search orders, assets…"
                        placeholderTextColor="#c8c8c8"
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                </View>
                <TouchableOpacity
                    style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
                    onPress={() => { if (filterOpen) closeFilter(); else openFilter() }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="options-outline" size={17} color={activeFilterCount > 0 ? '#fff' : '#666'} />
                    {activeFilterCount > 0 && (
                        <View style={s.filterBadge}>
                            <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* ── Status Tabs ── */}
            <View style={s.tabsBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsContent}>
                    {STATUS_TABS.map(tab => {
                        const count    = statusCounts[tab.key] ?? 0
                        const isActive = filter.status === tab.key
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[s.tab, isActive && s.tabActive]}
                                onPress={() => setFilter(p => ({ ...p, status: tab.key }))}
                                activeOpacity={0.75}
                            >
                                <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{tab.label}</Text>
                                {!loading && count > 0 && (
                                    <View style={[s.tabBadge, isActive && s.tabBadgeActive]}>
                                        <Text style={[s.tabBadgeText, isActive && s.tabBadgeTextActive]}>{count}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )
                    })}
                </ScrollView>
            </View>

            {/* ── List ── */}
            {loading ? (
                <View style={s.loadingWrap}>
                    <ActivityIndicator size="large" color="#111" />
                    <Text style={s.loadingText}>Loading…</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111" />}
                    ListEmptyComponent={
                        <View style={s.emptyWrap}>
                            <View style={s.emptyIconWrap}>
                                <Ionicons name="clipboard-outline" size={36} color="#d0d5dd" />
                            </View>
                            <Text style={s.emptyTitle}>No work orders</Text>
                            <Text style={s.emptySub}>
                                {search ? 'Try a different search term' : 'Try adjusting your filters'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* ── Filter sheet ── */}
            <View
                style={[StyleSheet.absoluteFillObject, { zIndex: 99 }]}
                pointerEvents={filterOpen ? 'box-none' : 'none'}
            >
                <Animated.View
                    style={[StyleSheet.absoluteFillObject, s.backdrop, { opacity: backdropAnim }]}
                    pointerEvents={filterOpen ? 'auto' : 'none'}
                >
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={closeFilter} />
                </Animated.View>

                <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: slideAnim }] }]}>
                    <View style={s.handle} />
                    <View style={s.sheetTitleRow}>
                        <Text style={s.sheetTitle}>Filters</Text>
                        <TouchableOpacity style={s.closeBtn} onPress={closeFilter} activeOpacity={0.7}>
                            <Ionicons name="close" size={18} color="#555" />
                        </TouchableOpacity>
                    </View>

                    {/* My WOs */}
                    <TouchableOpacity
                        style={[s.toggleRow, localFilter.myOnly && s.toggleRowActive]}
                        onPress={() => setLocalFilter(p => ({ ...p, myOnly: !p.myOnly }))}
                        activeOpacity={0.75}
                    >
                        <View style={[s.toggleIcon, { backgroundColor: localFilter.myOnly ? '#11111118' : '#f5f5f5' }]}>
                            <Ionicons name="person-outline" size={16} color={localFilter.myOnly ? '#111' : '#aaa'} />
                        </View>
                        <View style={s.toggleTexts}>
                            <Text style={[s.toggleLabel, localFilter.myOnly && s.toggleLabelActive]}>My Work Orders</Text>
                            <Text style={s.toggleSub}>Assigned to me only</Text>
                        </View>
                        <View style={[s.check, localFilter.myOnly && s.checkActive]}>
                            {localFilter.myOnly && <Ionicons name="checkmark" size={13} color="#fff" />}
                        </View>
                    </TouchableOpacity>

                    {/* Archived */}
                    <TouchableOpacity
                        style={[s.toggleRow, { marginTop: 8 }, localFilter.showArchived && s.toggleRowArchived]}
                        onPress={() => setLocalFilter(p => ({ ...p, showArchived: !p.showArchived }))}
                        activeOpacity={0.75}
                    >
                        <View style={[s.toggleIcon, { backgroundColor: localFilter.showArchived ? '#f59e0b18' : '#f5f5f5' }]}>
                            <Ionicons name="archive-outline" size={16} color={localFilter.showArchived ? '#f59e0b' : '#aaa'} />
                        </View>
                        <View style={s.toggleTexts}>
                            <Text style={[s.toggleLabel, localFilter.showArchived && s.toggleLabelArchived]}>Show Archived</Text>
                            <Text style={s.toggleSub}>Include archived work orders</Text>
                        </View>
                        <View style={[s.check, localFilter.showArchived && s.checkArchived]}>
                            {localFilter.showArchived && <Ionicons name="checkmark" size={13} color="#fff" />}
                        </View>
                    </TouchableOpacity>

                    <View style={s.divider} />

                    {/* Priority */}
                    <Text style={s.sectionLabel}>PRIORITY</Text>
                    <View style={s.chips}>
                        {PRIORITY_OPTS.map(opt => {
                            const pc2      = opt !== 'all' ? (PriorityColors[opt] ?? null) : null
                            const isActive = localFilter.priority === opt
                            return (
                                <TouchableOpacity
                                    key={opt}
                                    style={[
                                        s.chip,
                                        isActive && (pc2
                                            ? { backgroundColor: pc2.bg, borderColor: pc2.text + '55' }
                                            : s.chipActive),
                                    ]}
                                    onPress={() => setLocalFilter(p => ({ ...p, priority: opt }))}
                                    activeOpacity={0.7}
                                >
                                    {isActive && pc2 && <View style={[s.chipDot, { backgroundColor: pc2.text }]} />}
                                    <Text style={[
                                        s.chipText,
                                        isActive && (pc2 ? { color: pc2.text, fontWeight: '700' } : s.chipTextActive),
                                    ]}>
                                        {toLabel(opt)}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>

                    {/* Actions */}
                    <View style={s.sheetActions}>
                        <TouchableOpacity style={s.applyBtn} onPress={applyFilter} activeOpacity={0.85}>
                            <Text style={s.applyText}>Apply Filters</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.resetBtn} onPress={resetFilter} activeOpacity={0.7}>
                            <Ionicons name="refresh-outline" size={15} color="#888" />
                            <Text style={s.resetText}>Reset</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>

        </SafeAreaView>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f4f6f8' },

    /* Header */
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#111', letterSpacing: -0.3 },
    headerSub:   { fontSize: 12, color: '#aaa', fontWeight: '500', marginTop: 1 },
    addBtn: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: '#111',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
    },

    /* Toolbar */
    toolbar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    searchWrap: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#f4f6f8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#111', fontWeight: '500', padding: 0 },
    filterBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#f4f6f8', alignItems: 'center', justifyContent: 'center',
    },
    filterBtnActive: { backgroundColor: '#111' },
    filterBadge: {
        position: 'absolute', top: -4, right: -4,
        minWidth: 18, height: 18, borderRadius: 9,
        backgroundColor: '#ff6a55', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff', paddingHorizontal: 3,
    },
    filterBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

    /* Status tabs */
    tabsBar: {
        backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    tabsContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
    tab: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    },
    tabActive:         { backgroundColor: '#111' },
    tabLabel:          { fontSize: 13, fontWeight: '600', color: '#999' },
    tabLabelActive:    { color: '#fff', fontWeight: '700' },
    tabBadge: {
        minWidth: 20, height: 18, borderRadius: 9,
        backgroundColor: '#edf0f3', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
    },
    tabBadgeActive:    { backgroundColor: 'rgba(255,255,255,0.2)' },
    tabBadgeText:      { fontSize: 11, fontWeight: '700', color: '#888' },
    tabBadgeTextActive:{ color: '#fff' },

    /* Loading */
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    loadingText: { fontSize: 14, color: '#bbb', fontWeight: '500' },

    /* List */
    listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28, gap: 10 },

    /* Card */
    card: {
        backgroundColor: '#fff', borderRadius: 14,
        borderWidth: 1, borderColor: '#edf0f3',
        padding: 14,
        shadowColor: '#101828', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    cardTop: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 8,
    },
    codeText: { fontSize: 11, fontWeight: '700', color: '#b0b8c1', letterSpacing: 0.7 },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    },
    statusDot:  { width: 5, height: 5, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },

    title: { fontSize: 15, fontWeight: '700', color: '#111', lineHeight: 21, marginBottom: 7 },

    assetRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
    assetText:{ fontSize: 12, color: '#b0b8c1', fontWeight: '500', flex: 1 },

    cardFoot: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f4f6f8',
    },
    footMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },

    overdueChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#ff6a5512', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    },
    overdueText: { fontSize: 11, fontWeight: '700', color: '#ff6a55' },

    dueChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dueText: { fontSize: 12, color: '#b0b8c1', fontWeight: '500' },

    priorityPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    priorityPillText: { fontSize: 11, fontWeight: '700' },

    avatarRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
        width: 26, height: 26, borderRadius: 13,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    avatarText:      { fontSize: 9, fontWeight: '800', color: '#fff' },
    avatarExtra:     { backgroundColor: '#dde2e8' },
    avatarExtraText: { fontSize: 9, fontWeight: '800', color: '#777' },

    /* Empty */
    emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 24, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#edf0f3',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: '#444' },
    emptySub:   { fontSize: 13, color: '#b0b8c1', textAlign: 'center', lineHeight: 20 },

    /* Backdrop */
    backdrop: { backgroundColor: 'rgba(0,0,0,0.5)' },

    /* Sheet */
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 14,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 20,
    },
    sheetTitleRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 20,
    },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
    closeBtn: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#ebebeb',
    },

    toggleRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 14,
        backgroundColor: '#f9f9f9', borderWidth: 1.5, borderColor: '#f0f0f0',
    },
    toggleRowActive:   { backgroundColor: '#11111108', borderColor: '#11111128' },
    toggleRowArchived: { backgroundColor: '#f59e0b08', borderColor: '#f59e0b28' },
    toggleIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    toggleTexts:  { flex: 1 },
    toggleLabel:  { fontSize: 14, fontWeight: '600', color: '#888' },
    toggleLabelActive:   { color: '#111', fontWeight: '700' },
    toggleLabelArchived: { color: '#f59e0b', fontWeight: '700' },
    toggleSub:    { fontSize: 12, color: '#bbb', marginTop: 1 },
    check: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: '#e4e4e4', alignItems: 'center', justifyContent: 'center',
    },
    checkActive:   { backgroundColor: '#111' },
    checkArchived: { backgroundColor: '#f59e0b' },

    divider:      { height: 1, backgroundColor: '#f0f0f0', marginVertical: 18 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 12 },

    chips:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ebebeb',
    },
    chipActive:     { backgroundColor: '#111', borderColor: '#111' },
    chipText:       { fontSize: 13, fontWeight: '600', color: '#666' },
    chipTextActive: { color: '#fff' },
    chipDot:        { width: 6, height: 6, borderRadius: 3 },

    sheetActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
    applyBtn: {
        flex: 1, paddingVertical: 18, paddingHorizontal: 24, borderRadius: 14, backgroundColor: '#111',
        alignItems: 'center', justifyContent: 'center',
    },
    applyText: { fontSize: 15, fontWeight: '800', color: '#fff' },
    resetBtn: {
        paddingVertical: 18, paddingHorizontal: 24, borderRadius: 14,
        backgroundColor: '#f7f7f7', borderWidth: 1, borderColor: '#ebebeb',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    resetText: { fontSize: 14, fontWeight: '600', color: '#888' },
})
