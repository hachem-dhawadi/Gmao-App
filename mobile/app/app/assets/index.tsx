import { useState, useMemo, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { apiGetAssets, type Asset } from '@/services/AssetsService'
import { useAuthStore } from '@/store/authStore'

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    active:             { bg: '#05eb7624', text: '#10b981', dot: '#10b981', label: 'Active'            },
    inactive:           { bg: '#f5f5f5',   text: '#737373', dot: '#a3a3a3', label: 'Inactive'          },
    under_maintenance:  { bg: '#ffd40045', text: '#f59e0b', dot: '#f59e0b', label: 'Under Maintenance' },
    decommissioned:     { bg: '#ff6a551a', text: '#ff6a55', dot: '#ff6a55', label: 'Decommissioned'    },
}

function AssetCard({ item }: { item: Asset }) {
    const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.inactive
    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => router.push(`/app/assets/${item.id}` as never)}
        >
            <View style={styles.cardLeft}>
                <View style={styles.assetIcon}>
                    <Ionicons name="cube-outline" size={22} color={Colors.primary} />
                </View>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                    <Text style={styles.code}>{item.code}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <View style={[styles.dot, { backgroundColor: st.dot }]} />
                        <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
                    </View>
                </View>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.category}>{item.asset_type?.name ?? '—'}</Text>
                {item.location && (
                    <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={12} color={Colors.gray400} />
                        <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
                    </View>
                )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.gray300} style={styles.arrow} />
        </TouchableOpacity>
    )
}

export default function AssetsScreen() {
    const hasAssetsRead = useAuthStore(s => s.user?.permissions?.includes('assets.read') ?? false)

    if (!hasAssetsRead) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={Colors.gray700} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Assets</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={noAccess.wrap}>
                    <View style={noAccess.iconBox}>
                        <Ionicons name="lock-closed-outline" size={32} color={Colors.gray400} />
                    </View>
                    <Text style={noAccess.title}>Access Restricted</Text>
                    <Text style={noAccess.body}>
                        Your role does not have permission to access Assets.
                        Contact your company administrator to request access.
                    </Text>
                    <TouchableOpacity style={noAccess.btn} onPress={() => router.back()} activeOpacity={0.8}>
                        <Text style={noAccess.btnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const [assets,     setAssets]     = useState<Asset[]>([])
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search,     setSearch]     = useState('')
    const [filter,     setFilter]     = useState<'all' | 'active' | 'inactive' | 'under_maintenance'>('all')

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
                a.name.toLowerCase().includes(q)                          ||
                a.code.toLowerCase().includes(q)                          ||
                (a.location ?? '').toLowerCase().includes(q)              ||
                (a.asset_type?.name ?? '').toLowerCase().includes(q)
            )
        }
        return list
    }, [assets, search, filter])

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={Colors.gray700} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Assets</Text>
                <View style={{ width: 36 }} />
            </View>

            <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={17} color={Colors.gray400} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search assets…"
                    placeholderTextColor={Colors.gray400}
                    value={search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow} style={styles.filtersScroll}>
                {(['all', 'active', 'under_maintenance', 'inactive'] as const).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterLabel, filter === f && styles.filterLabelActive]}>
                            {f === 'all' ? 'All' : f === 'under_maintenance' ? 'Maintenance' : f.charAt(0).toUpperCase() + f.slice(1)}
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
                    renderItem={({ item }) => <AssetCard item={item} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="cube-outline" size={40} color={Colors.gray300} />
                            <Text style={styles.emptyTitle}>No assets found</Text>
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
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.gray900 },

    searchWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12, marginBottom: 8,
        borderRadius: 12, borderWidth: 1, borderColor: Colors.gray200, paddingHorizontal: 12,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: Colors.gray900, paddingVertical: 11 },

    filtersScroll: { flexGrow: 0, marginBottom: 8 },
    filtersRow:    { paddingHorizontal: 16, gap: 8 },
    filterTab: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
    },
    filterTabActive:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterLabel:      { fontSize: 13, fontWeight: '600', color: Colors.gray600 },
    filterLabelActive:{ color: Colors.white },

    listContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },

    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.white, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: Colors.gray200,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    cardLeft:  { marginRight: 12 },
    assetIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    cardBody:  { flex: 1 },
    cardTopRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },

    code:       { fontSize: 11, fontWeight: '700', color: Colors.gray500, letterSpacing: 0.5 },
    statusBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
    dot:        { width: 5, height: 5, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '600' },

    name:     { fontSize: 15, fontWeight: '700', color: Colors.gray900, marginBottom: 2 },
    category: { fontSize: 12, color: Colors.gray400, marginBottom: 6 },
    metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: Colors.gray500, flex: 1 },

    arrow: { marginLeft: 4 },

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
