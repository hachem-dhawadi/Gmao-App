import { useState, useMemo, useEffect, useCallback, memo } from 'react'
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { apiGetAssets, type Asset } from '@/services/AssetsService'
import { useAuthStore } from '@/store/authStore'

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { bg: string; text: string; dot: string; label: string; accent: string }> = {
    active:            { bg: '#10b98118', text: '#10b981', dot: '#10b981', label: 'Active',       accent: '#10b981' },
    under_maintenance: { bg: '#f59e0b18', text: '#f59e0b', dot: '#f59e0b', label: 'Maintenance',  accent: '#f59e0b' },
    inactive:          { bg: '#edf0f3',   text: '#9ca3af', dot: '#c0c8d0', label: 'Inactive',     accent: '#d0d5dd' },
    decommissioned:    { bg: '#ff6a5518', text: '#ff6a55', dot: '#ff6a55', label: 'Decommissioned', accent: '#ff6a55' },
}

const STATUS_TABS = [
    { key: 'all',              label: 'All'         },
    { key: 'active',           label: 'Active'      },
    { key: 'under_maintenance',label: 'Maintenance' },
    { key: 'inactive',         label: 'Inactive'    },
    { key: 'decommissioned',   label: 'Decomm.'     },
]

type FilterKey = 'all' | 'active' | 'under_maintenance' | 'inactive' | 'decommissioned'

// ── Asset Card ────────────────────────────────────────────────────────────────

const AssetCard = memo(function AssetCard({ item }: { item: Asset }) {
    const st = STATUS_META[item.status] ?? STATUS_META.inactive

    return (
        <TouchableOpacity
            style={[s.card, { borderLeftColor: st.accent, borderLeftWidth: 4 }]}
            activeOpacity={0.7}
            onPress={() => router.push(`/app/assets/${item.id}` as never)}
        >
            {/* Top: code + status */}
            <View style={s.cardTop}>
                <Text style={s.code}>{item.code}</Text>
                <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: st.dot }]} />
                    <Text style={[s.statusText, { color: st.text }]}>{st.label}</Text>
                </View>
            </View>

            {/* Name */}
            <Text style={s.name} numberOfLines={1}>{item.name}</Text>

            {/* Type */}
            {item.asset_type?.name && (
                <Text style={s.type}>{item.asset_type.name}</Text>
            )}

            {/* Location */}
            {item.location && (
                <View style={s.locationRow}>
                    <Ionicons name="location-outline" size={11} color="#c0c8d0" />
                    <Text style={s.locationText} numberOfLines={1}>{item.location}</Text>
                </View>
            )}
        </TouchableOpacity>
    )
})

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AssetsScreen() {
    const hasAssetsRead = useAuthStore(s => s.user?.permissions?.includes('assets.read') ?? false)

    if (!hasAssetsRead) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f8' }} edges={['top']}>
                <View style={s.header}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#444" />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Assets</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="lock-closed-outline" size={32} color="#aaa" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' }}>Access Restricted</Text>
                    <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 }}>
                        Your role does not have permission to access Assets.
                    </Text>
                    <TouchableOpacity
                        style={{ backgroundColor: '#111', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 }}
                        onPress={() => router.back()} activeOpacity={0.8}
                    >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const [assets,     setAssets]     = useState<Asset[]>([])
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search,     setSearch]     = useState('')
    const [filter,     setFilter]     = useState<FilterKey>('all')

    const load = useCallback(async () => {
        try {
            const res = await apiGetAssets({ per_page: 100 })
            setAssets(res.data.data?.assets ?? [])
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
        let list = assets
        if (filter !== 'all') list = list.filter(a => a.status === filter)
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(a =>
                a.name.toLowerCase().includes(q)             ||
                a.code.toLowerCase().includes(q)             ||
                (a.location ?? '').toLowerCase().includes(q) ||
                (a.asset_type?.name ?? '').toLowerCase().includes(q)
            )
        }
        return list
    }, [assets, search, filter])

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: assets.length }
        for (const a of assets) c[a.status] = (c[a.status] ?? 0) + 1
        return c
    }, [assets])

    const renderItem = useCallback(({ item }: { item: Asset }) => <AssetCard item={item} />, [])

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#444" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={s.headerTitle}>Assets</Text>
                    {!loading && (
                        <Text style={s.headerSub}>{filtered.length} of {assets.length}</Text>
                    )}
                </View>
                <View style={{ width: 36 }} />
            </View>

            {/* Search */}
            <View style={s.toolbar}>
                <View style={s.searchWrap}>
                    <Ionicons name="search-outline" size={15} color="#bbb" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search assets, types, locations…"
                        placeholderTextColor="#c8c8c8"
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                </View>
            </View>

            {/* Status tabs */}
            <View style={s.tabsBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsContent}>
                    {STATUS_TABS.map(tab => {
                        const count    = counts[tab.key] ?? 0
                        const isActive = filter === tab.key
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[s.tab, isActive && s.tabActive]}
                                onPress={() => setFilter(tab.key as FilterKey)}
                                activeOpacity={0.75}
                            >
                                <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{tab.label}</Text>
                                {!loading && (tab.key === 'all' || count > 0) && (
                                    <View style={[s.tabBadge, isActive && s.tabBadgeActive]}>
                                        <Text style={[s.tabBadgeText, isActive && s.tabBadgeTextActive]}>{count}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )
                    })}
                </ScrollView>
            </View>

            {/* List */}
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
                                <Ionicons name="cube-outline" size={36} color="#d0d5dd" />
                            </View>
                            <Text style={s.emptyTitle}>No assets found</Text>
                            <Text style={s.emptySub}>
                                {search ? 'Try a different search term' : 'Try a different filter'}
                            </Text>
                        </View>
                    }
                />
            )}

        </SafeAreaView>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f4f6f8' },

    /* Header */
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    backBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    headerTitle:{ fontSize: 18, fontWeight: '900', color: '#111', letterSpacing: -0.3 },
    headerSub:  { fontSize: 11, color: '#aaa', fontWeight: '500', marginTop: 1 },

    /* Toolbar */
    toolbar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    searchWrap: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#f4f6f8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#111', fontWeight: '500', padding: 0 },

    /* Status tabs */
    tabsBar:           { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    tabsContent:       { paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
    tab:               { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    tabActive:         { backgroundColor: '#111' },
    tabLabel:          { fontSize: 13, fontWeight: '600', color: '#999' },
    tabLabelActive:    { color: '#fff', fontWeight: '700' },
    tabBadge:          { minWidth: 20, height: 18, borderRadius: 9, backgroundColor: '#edf0f3', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    tabBadgeActive:    { backgroundColor: 'rgba(255,255,255,0.22)' },
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
    cardTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    code:       { fontSize: 11, fontWeight: '700', color: '#b0b8c1', letterSpacing: 0.7 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    statusDot:  { width: 5, height: 5, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },

    name:        { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 4 },
    type:        { fontSize: 12, color: '#b0b8c1', fontWeight: '500', marginBottom: 6 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationText:{ fontSize: 12, color: '#b0b8c1', fontWeight: '500', flex: 1 },

    /* Empty */
    emptyWrap:    { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
    emptyIconWrap:{
        width: 80, height: 80, borderRadius: 24, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#edf0f3',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    emptyTitle:   { fontSize: 16, fontWeight: '800', color: '#444' },
    emptySub:     { fontSize: 13, color: '#b0b8c1', textAlign: 'center', lineHeight: 20 },
})
