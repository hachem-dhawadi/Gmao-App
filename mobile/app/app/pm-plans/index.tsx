import { useState, useMemo, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { apiGetPmPlans, pmFrequencyLabel, pmIsOverdue, type PmPlan } from '@/services/PmService'
import { useAuthStore } from '@/store/authStore'

const FREQ_COLORS: Record<string, string> = {
    Weekly: '#2a85ff', Monthly: '#f59e0b', Quarterly: '#10b981',
    'Bi-Annual': '#8b5cf6', Annual: '#ef4444',
}

function effectiveStatus(plan: PmPlan): 'active' | 'inactive' | 'draft' | 'overdue' {
    if (pmIsOverdue(plan) && plan.status === 'active') return 'overdue'
    return plan.status as 'active' | 'inactive' | 'draft'
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    active:   { bg: '#05eb7624', text: '#10b981', dot: '#10b981', label: 'Active'   },
    inactive: { bg: '#f5f5f5',   text: '#737373', dot: '#a3a3a3', label: 'Inactive' },
    draft:    { bg: '#f5f5f5',   text: '#737373', dot: '#a3a3a3', label: 'Draft'    },
    overdue:  { bg: '#ff6a551a', text: '#ff6a55', dot: '#ff6a55', label: 'Overdue'  },
}

function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PMCard({ item }: { item: PmPlan }) {
    const eff  = effectiveStatus(item)
    const st   = STATUS_STYLE[eff]
    const freq = pmFrequencyLabel(item.trigger)
    const fc   = FREQ_COLORS[freq] ?? Colors.primary
    const due  = formatDate(item.trigger?.next_run_at ?? null)

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => router.push(`/app/pm-plans/${item.id}` as never)}
        >
            <View style={styles.cardTop}>
                <View>
                    <Text style={styles.code}>{item.code}</Text>
                    <Text style={styles.priority}>{item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}</Text>
                </View>
                <View style={[styles.freqBadge, { backgroundColor: fc + '20' }]}>
                    <Text style={[styles.freqText, { color: fc }]}>{freq}</Text>
                </View>
            </View>

            <Text style={styles.title} numberOfLines={2}>{item.name}</Text>

            {item.asset && (
                <View style={styles.assetRow}>
                    <Ionicons name="cube-outline" size={13} color={Colors.gray400} />
                    <Text style={styles.assetText} numberOfLines={1}>{item.asset.name}</Text>
                </View>
            )}

            <View style={styles.cardBottom}>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
                    <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
                </View>
                {item.trigger?.next_run_at && (
                    <View style={styles.dueRow}>
                        <Ionicons
                            name="calendar-outline"
                            size={12}
                            color={eff === 'overdue' ? Colors.error : Colors.gray400}
                        />
                        <Text style={[styles.dueText, eff === 'overdue' && styles.dueOverdue]}>{due}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    )
}

export default function PMPlansScreen() {
    const hasPmRead = useAuthStore(s => s.user?.permissions?.includes('pm_plans.read') ?? false)

    if (!hasPmRead) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={Colors.gray700} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>PM Plans</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={noAccess.wrap}>
                    <View style={noAccess.iconBox}>
                        <Ionicons name="lock-closed-outline" size={32} color={Colors.gray400} />
                    </View>
                    <Text style={noAccess.title}>Access Restricted</Text>
                    <Text style={noAccess.body}>
                        Your role does not have permission to access Preventive Maintenance Plans.
                        Contact your company administrator to request access.
                    </Text>
                    <TouchableOpacity style={noAccess.btn} onPress={() => router.back()} activeOpacity={0.8}>
                        <Text style={noAccess.btnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const [plans,      setPlans]      = useState<PmPlan[]>([])
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search,     setSearch]     = useState('')
    const [filter,     setFilter]     = useState<'all' | 'active' | 'overdue' | 'inactive'>('all')

    const load = useCallback(async () => {
        try {
            const res = await apiGetPmPlans({ per_page: 100 })
            setPlans(res.data.data?.pm_plans ?? [])
        } catch {
            // silent
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const onRefresh = () => { setRefreshing(true); load() }

    const filtered = useMemo(() => {
        let list = plans
        if (filter !== 'all') {
            list = list.filter(p => {
                const eff = effectiveStatus(p)
                return eff === filter
            })
        }
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.code.toLowerCase().includes(q) ||
                (p.asset?.name ?? '').toLowerCase().includes(q)
            )
        }
        return list
    }, [plans, search, filter])

    const counts = {
        all:      plans.length,
        active:   plans.filter(p => effectiveStatus(p) === 'active').length,
        overdue:  plans.filter(p => effectiveStatus(p) === 'overdue').length,
        inactive: plans.filter(p => p.status === 'inactive' || p.status === 'draft').length,
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={Colors.gray700} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>PM Plans</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={17} color={Colors.gray400} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search PM plans…"
                    placeholderTextColor={Colors.gray400}
                    value={search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                />
            </View>

            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow} style={styles.filtersScroll}>
                {(['all', 'active', 'overdue', 'inactive'] as const).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        onPress={() => setFilter(f)}
                        activeOpacity={0.75}
                    >
                        <Text style={[styles.filterLabel, filter === f && styles.filterLabelActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => <PMCard item={item} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="calendar-outline" size={40} color={Colors.gray300} />
                            <Text style={styles.emptyTitle}>No PM plans found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.gray100 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray200,
    },
    backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.gray900 },

    searchWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12, marginBottom: 8,
        borderRadius: 12, borderWidth: 1, borderColor: Colors.gray200, paddingHorizontal: 12,
    },
    searchIcon:  { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: Colors.gray900, paddingVertical: 11 },

    filtersScroll: { flexGrow: 0, marginBottom: 8 },
    filtersRow:    { paddingHorizontal: 16, gap: 8 },
    filterTab: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
    },
    filterTabActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterLabel:       { fontSize: 13, fontWeight: '600', color: Colors.gray600 },
    filterLabelActive: { color: Colors.white },

    listContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },

    card: {
        backgroundColor: Colors.white, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: Colors.gray200,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    code:     { fontSize: 11, fontWeight: '700', color: Colors.gray500, letterSpacing: 0.5 },
    priority: { fontSize: 11, color: Colors.gray400, marginTop: 1 },

    freqBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    freqText:  { fontSize: 11, fontWeight: '700' },

    title:    { fontSize: 15, fontWeight: '600', color: Colors.gray900, marginBottom: 8, lineHeight: 20 },

    assetRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
    assetText: { fontSize: 12, color: Colors.gray500, flex: 1 },

    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    statusDot:   { width: 6, height: 6, borderRadius: 3 },
    statusText:  { fontSize: 12, fontWeight: '600' },

    dueRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dueText:    { fontSize: 12, color: Colors.gray400 },
    dueOverdue: { color: Colors.error, fontWeight: '600' },

    emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.gray700 },
})

const noAccess = StyleSheet.create({
    wrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
    iconBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
    title:   { fontSize: 18, fontWeight: '800', color: Colors.gray900, textAlign: 'center' },
    body:    { fontSize: 14, color: Colors.gray500, textAlign: 'center', lineHeight: 22 },
    btn:     { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
