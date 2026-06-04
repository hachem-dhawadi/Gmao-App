import { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react'
import {
    View, Text, StyleSheet, FlatList,
    TextInput, RefreshControl, ActivityIndicator,
    Pressable, Animated,
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
    if (wo.status === 'completed' || wo.status === 'cancelled') return false
    return new Date(wo.due_at) < new Date()
}

// ── types ─────────────────────────────────────────────────────────────────────

type FilterState = { status: string; priority: string; myOnly: boolean; showArchived: boolean }
const DEFAULT_FILTER: FilterState = { status: 'all', priority: 'all', myOnly: false, showArchived: false }
const STATUS_OPTS   = ['all', 'open', 'in_progress', 'on_hold', 'completed', 'cancelled']
const PRIORITY_OPTS = ['all', 'low', 'medium', 'high', 'critical']

// ── WO Card ───────────────────────────────────────────────────────────────────
// memo prevents re-renders when localFilter changes inside the sheet

const WOCard = memo(function WOCard({ item }: { item: WorkOrder }) {
    const sc       = StatusColors[item.status]     ?? StatusColors.open
    const pc       = PriorityColors[item.priority] ?? PriorityColors.medium
    const due      = formatDate(item.due_at)
    const overdue  = isOverdue(item)
    const assignees = item.assigned_members?.slice(0, 3) ?? []

    return (
        <TouchableOpacity
            style={[s.card, { borderTopColor: pc.text }]}
            activeOpacity={0.72}
            onPress={() => router.push(`/app/work-orders/${item.id}` as never)}
        >
            {/* Header row: code + badges */}
            <View style={s.cardHead}>
                <Text style={s.codeText}>{item.code}</Text>
                <View style={s.headRight}>
                    {overdue && (
                        <View style={s.overdueBadge}>
                            <Ionicons name="alert-circle" size={11} color="#ff6a55" />
                            <Text style={s.overdueText}>Overdue</Text>
                        </View>
                    )}
                    <View style={[s.priorityBadge, { backgroundColor: pc.bg }]}>
                        <View style={[s.priorityDot, { backgroundColor: pc.text }]} />
                        <Text style={[s.priorityText, { color: pc.text }]}>
                            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Title */}
            <Text style={s.title} numberOfLines={2}>{item.title}</Text>

            {/* Asset */}
            {item.asset && (
                <View style={s.assetRow}>
                    <Ionicons name="cube-outline" size={12} color="#bbb" />
                    <Text style={s.assetText} numberOfLines={1}>{item.asset.name}</Text>
                </View>
            )}

            {/* Footer */}
            <View style={s.cardFoot}>
                <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: sc.text }]} />
                    <Text style={[s.statusText, { color: sc.text }]}>{toLabel(item.status)}</Text>
                </View>
                <View style={s.footRight}>
                    {due && (
                        <View style={s.dueChip}>
                            <Ionicons name="calendar-outline" size={11} color={overdue ? '#ff6a55' : '#bbb'} />
                            <Text style={[s.dueText, overdue && s.dueOverdue]}>{due}</Text>
                        </View>
                    )}
                    {assignees.length > 0 && (
                        <View style={s.avatarGroup}>
                            {assignees.map((m, i) => (
                                <View key={m.id} style={[s.avatar, { marginLeft: i > 0 ? -8 : 0, zIndex: assignees.length - i }]}>
                                    <Text style={s.avatarText}>
                                        {(m.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    )
})

// ── Screen ────────────────────────────────────────────────────────────────────

export default function WorkOrdersScreen() {
    const insets      = useSafeAreaInsets()
    const user        = useAuthStore(st => st.user)
    const hasWoRead = useAuthStore(st => st.user?.permissions?.includes('work_orders.read') ?? false)

    if (!hasWoRead) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top']}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="lock-closed-outline" size={32} color="#aaa" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' }}>Access Restricted</Text>
                    <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 }}>
                        Your role does not have permission to access Work Orders.
                        Contact your company administrator to request access.
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    const [workOrders,   setWorkOrders]   = useState<WorkOrder[]>([])
    const [loading,      setLoading]      = useState(true)
    const [refreshing,   setRefreshing]   = useState(false)
    const [search,       setSearch]       = useState('')
    const [filter,       setFilter]       = useState<FilterState>(DEFAULT_FILTER)
    const [localFilter,  setLocalFilter]  = useState<FilterState>(DEFAULT_FILTER)
    const [filterOpen,   setFilterOpen]   = useState(false)

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

    const toggleFilter = useCallback(() => {
        if (filterOpen) closeFilter()
        else openFilter()
    }, [filterOpen, openFilter, closeFilter])

    const applyFilter = useCallback(() => {
        setFilter(localFilter)
        closeFilter()
    }, [localFilter, closeFilter])

    const resetFilter = useCallback(() => {
        setLocalFilter(DEFAULT_FILTER)
        setFilter(DEFAULT_FILTER)
        closeFilter()
    }, [closeFilter])

    // ── data loading ──────────────────────────────────────────────────────────
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

    // ── client-side filtering ─────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = workOrders
        if (filter.myOnly && user?.memberId)
            list = list.filter(w => w.assigned_members?.some(m => m.id === user.memberId))
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
        (filter.status !== 'all' ? 1 : 0) +
        (filter.priority !== 'all' ? 1 : 0) +
        (filter.myOnly ? 1 : 0) +
        (filter.showArchived ? 1 : 0)

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            {/* ── Header ── */}
            <View style={s.header}>
                <Text style={s.headerTitle}>Work Orders</Text>
                <TouchableOpacity style={s.addBtn} onPress={() => router.push('/app/work-orders/create' as never)}>
                    <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* ── Toolbar ── */}
            <View style={s.toolbar}>
                <View style={s.searchWrap}>
                    <Ionicons name="search-outline" size={15} color="#bbb" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search…"
                        placeholderTextColor="#c8c8c8"
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                </View>
                <TouchableOpacity
                    style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
                    onPressIn={toggleFilter}
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

            {/* ── List ── */}
            {loading ? (
                <ActivityIndicator size="large" color="#111" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111" />}
                    ListHeaderComponent={
                        <Text style={s.resultCount}>
                            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
                        </Text>
                    }
                    ListEmptyComponent={
                        <View style={s.emptyWrap}>
                            <View style={s.emptyIconWrap}>
                                <Ionicons name="clipboard-outline" size={32} color="#ccc" />
                            </View>
                            <Text style={s.emptyTitle}>No work orders found</Text>
                            <Text style={s.emptySubtitle}>Try adjusting your search or filters</Text>
                        </View>
                    }
                />
            )}

            {/* ── Filter sheet — always in tree, no Modal ── */}
            <View
                style={[StyleSheet.absoluteFillObject, { zIndex: 99 }]}
                pointerEvents={filterOpen ? 'box-none' : 'none'}
            >
                {/* Backdrop */}
                <Animated.View
                    style={[StyleSheet.absoluteFillObject, s.backdrop, { opacity: backdropAnim }]}
                    pointerEvents={filterOpen ? 'auto' : 'none'}
                >
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={closeFilter} />
                </Animated.View>

                {/* Sheet */}
                <Animated.View
                    style={[s.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: slideAnim }] }]}
                >
                    {/* Sheet header with title + close */}
                    <View style={s.sheetHeader}>
                        <View style={s.handle} />
                        <View style={s.sheetTitleRow}>
                            <Text style={s.sheetTitle}>Filters</Text>
                            <TouchableOpacity style={s.closeBtn} onPress={closeFilter} activeOpacity={0.7}>
                                <Ionicons name="close" size={18} color="#555" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* My Work Orders — full row is the button */}
                    <TouchableOpacity
                        style={[s.toggleRow, localFilter.myOnly && s.toggleRowActive]}
                        onPressIn={() => setLocalFilter(p => ({ ...p, myOnly: !p.myOnly }))}
                        activeOpacity={0.75}
                    >
                        <View style={[s.toggleIcon, { backgroundColor: localFilter.myOnly ? '#11111120' : '#f5f5f5' }]}>
                            <Ionicons name="person-outline" size={16} color={localFilter.myOnly ? '#111' : '#aaa'} />
                        </View>
                        <View style={s.toggleTexts}>
                            <Text style={[s.toggleLabel, localFilter.myOnly && s.toggleLabelActive]}>My Work Orders</Text>
                            <Text style={s.toggleSub}>Assigned to me only</Text>
                        </View>
                        <View style={[s.toggleCheck, localFilter.myOnly && s.toggleCheckActive]}>
                            {localFilter.myOnly && <Ionicons name="checkmark" size={13} color="#fff" />}
                        </View>
                    </TouchableOpacity>

                    {/* Show Archived — full row is the button */}
                    <TouchableOpacity
                        style={[s.toggleRow, { marginTop: 8 }, localFilter.showArchived && s.toggleRowArchived]}
                        onPressIn={() => setLocalFilter(p => ({ ...p, showArchived: !p.showArchived }))}
                        activeOpacity={0.75}
                    >
                        <View style={[s.toggleIcon, { backgroundColor: localFilter.showArchived ? '#f59e0b20' : '#f5f5f5' }]}>
                            <Ionicons name="archive-outline" size={16} color={localFilter.showArchived ? '#f59e0b' : '#aaa'} />
                        </View>
                        <View style={s.toggleTexts}>
                            <Text style={[s.toggleLabel, localFilter.showArchived && s.toggleLabelArchived]}>Show Archived</Text>
                            <Text style={s.toggleSub}>Include archived work orders</Text>
                        </View>
                        <View style={[s.toggleCheck, localFilter.showArchived && s.toggleCheckArchived]}>
                            {localFilter.showArchived && <Ionicons name="checkmark" size={13} color="#fff" />}
                        </View>
                    </TouchableOpacity>

                    <View style={s.sheetDivider} />

                    {/* Status */}
                    <Text style={s.sectionLabel}>STATUS</Text>
                    <View style={s.chips}>
                        {STATUS_OPTS.map(opt => (
                            <TouchableOpacity
                                key={opt}
                                style={[s.chip, localFilter.status === opt && s.chipActive]}
                                onPressIn={() => setLocalFilter(p => ({ ...p, status: opt }))}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.chipText, localFilter.status === opt && s.chipTextActive]}>
                                    {toLabel(opt)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Priority */}
                    <Text style={[s.sectionLabel, { marginTop: 18 }]}>PRIORITY</Text>
                    <View style={s.chips}>
                        {PRIORITY_OPTS.map(opt => (
                            <TouchableOpacity
                                key={opt}
                                style={[s.chip, localFilter.priority === opt && s.chipActive]}
                                onPressIn={() => setLocalFilter(p => ({ ...p, priority: opt }))}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.chipText, localFilter.priority === opt && s.chipTextActive]}>
                                    {toLabel(opt)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Actions */}
                    <View style={s.actions}>
                        <TouchableOpacity style={s.applyBtn} onPress={applyFilter} activeOpacity={0.85}>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={s.applyText}>Apply Filters</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.resetBtn} onPress={resetFilter} activeOpacity={0.7}>
                            <Ionicons name="refresh-outline" size={16} color="#888" />
                            <Text style={s.resetText}>Reset all filters</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>

        </SafeAreaView>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f5f5f5' },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
    addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },

    toolbar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    searchWrap: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#111', fontWeight: '500', padding: 0 },

    filterBtn: {
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#ebebeb',
    },
    filterBtnActive: { backgroundColor: '#111', borderColor: '#111' },
    filterBadge: {
        position: 'absolute', top: -5, right: -5,
        width: 17, height: 17, borderRadius: 9,
        backgroundColor: '#ff6a55', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    filterBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

    resultCount: { fontSize: 12, fontWeight: '600', color: '#bbb', marginBottom: 8, marginLeft: 2 },
    listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, gap: 10 },

    /* Card */
    card: {
        backgroundColor: '#fff', borderRadius: 16,
        borderWidth: 1, borderColor: '#efefef',
        borderTopWidth: 3,           // color set inline from priority
        padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardHead:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    headRight:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
    codeText:   { fontSize: 11, fontWeight: '700', color: '#c0c0c0', letterSpacing: 0.8 },
    overdueBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ff6a5512', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
    overdueText:  { fontSize: 10, fontWeight: '700', color: '#ff6a55' },
    priorityBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    priorityDot:  { width: 5, height: 5, borderRadius: 3 },
    priorityText: { fontSize: 11, fontWeight: '700' },
    title:    { fontSize: 15, fontWeight: '700', color: '#111', lineHeight: 22, marginBottom: 8 },
    assetRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
    assetText:{ fontSize: 12, color: '#bbb', fontWeight: '500', flex: 1 },
    cardFoot:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
    footRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
    statusDot:  { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    dueChip:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dueText:   { fontSize: 11, color: '#bbb', fontWeight: '500' },
    dueOverdue:{ color: '#ff6a55', fontWeight: '700' },
    avatarGroup: { flexDirection: 'row', alignItems: 'center' },
    avatar:     { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e8e8e8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    avatarText: { fontSize: 9, fontWeight: '800', color: '#555' },
    emptyWrap:    { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyIconWrap:{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    emptyTitle:   { fontSize: 15, fontWeight: '700', color: '#555' },
    emptySubtitle:{ fontSize: 13, color: '#bbb' },

    /* Filter overlay */
    backdrop: { backgroundColor: 'rgba(0,0,0,0.52)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 14,
    },
    sheetHeader:   { marginBottom: 16 },
    sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    handle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16 },
    sheetTitle:    { fontSize: 18, fontWeight: '800', color: '#111' },
    closeBtn: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#ebebeb',
    },

    /* Toggle rows (replace Switch — avoids Android touch-area bug in Animated.View) */
    toggleRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 14,
        backgroundColor: '#f9f9f9', borderWidth: 1.5, borderColor: '#f0f0f0',
    },
    toggleRowActive:   { backgroundColor: '#11111108', borderColor: '#11111130' },
    toggleRowArchived: { backgroundColor: '#f59e0b08', borderColor: '#f59e0b30' },
    toggleIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    toggleTexts: { flex: 1 },
    toggleLabel: { fontSize: 14, fontWeight: '600', color: '#888' },
    toggleLabelActive:   { color: '#111', fontWeight: '700' },
    toggleLabelArchived: { color: '#f59e0b', fontWeight: '700' },
    toggleSub:   { fontSize: 12, color: '#bbb', marginTop: 1 },
    toggleCheck: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: '#e4e4e4', alignItems: 'center', justifyContent: 'center',
    },
    toggleCheckActive:   { backgroundColor: '#111' },
    toggleCheckArchived: { backgroundColor: '#f59e0b' },

    sheetDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 18 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 10 },
    chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ebebeb' },
    chipActive:   { backgroundColor: '#111', borderColor: '#111' },
    chipText:     { fontSize: 13, fontWeight: '600', color: '#666' },
    chipTextActive: { color: '#fff' },

    actions: { gap: 10, marginTop: 24 },
    applyBtn: {
        height: 58, borderRadius: 16,
        backgroundColor: '#111',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22, shadowRadius: 10, elevation: 6,
    },
    applyText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
    resetBtn: {
        height: 48, borderRadius: 14,
        backgroundColor: '#f7f7f7', borderWidth: 1, borderColor: '#ebebeb',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    },
    resetText: { fontSize: 14, fontWeight: '600', color: '#888' },
})
