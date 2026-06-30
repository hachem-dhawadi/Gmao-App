import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react'
import {
    View, Text, StyleSheet, FlatList, TextInput,
    RefreshControl, ActivityIndicator, Pressable,
    Animated, ScrollView, Image, Modal,
} from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { apiGetItems, apiGetItem, type InventoryItem } from '@/services/InventoryService'
import { useAuthStore } from '@/store/authStore'

// ── URL helper ────────────────────────────────────────────────────────────────
// Images stored before APP_URL was fixed may have http://localhost as host.
// Replace that with the actual server origin so they load on real devices.
const SERVER_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/api\/.*$/, '')
function resolveUrl(url: string | undefined): string | undefined {
    if (!url || !SERVER_ORIGIN) return url
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, SERVER_ORIGIN)
}

// ── constants ─────────────────────────────────────────────────────────────────

type StockTab = 'all' | 'in_stock' | 'low_stock' | 'unstocked'

const STOCK_TABS: { key: StockTab; label: string }[] = [
    { key: 'all',       label: 'All'       },
    { key: 'in_stock',  label: 'In Stock'  },
    { key: 'low_stock', label: 'Low Stock' },
    { key: 'unstocked', label: 'Unstocked' },
]

type StockByWarehouse = { warehouse_id: number; warehouse_code: string | null; warehouse_name: string | null; stock_qty: number }
type DetailFull = { item: InventoryItem; stock_by_warehouse: StockByWarehouse[] } | null

// ── helpers ───────────────────────────────────────────────────────────────────

function isLowStock(item: InventoryItem) {
    return item.is_stocked && item.min_stock !== null && item.min_stock > 0 && item.total_stock <= item.min_stock
}

function getStockTab(item: InventoryItem): StockTab {
    if (!item.is_stocked) return 'unstocked'
    if (isLowStock(item)) return 'low_stock'
    return 'in_stock'
}

function formatStock(item: InventoryItem) {
    const qty = item.total_stock.toFixed(2).replace(/\.?0+$/, '') || '0'
    return item.unit ? `${qty} ${item.unit}` : qty
}

function formatCost(cost: number | null) {
    if (cost === null) return null
    return cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function accentColor(item: InventoryItem) {
    if (!item.is_stocked) return '#d1d5db'
    if (isLowStock(item)) return '#ef4444'
    return '#10b981'
}

// ── Item Card ─────────────────────────────────────────────────────────────────

const ItemCard = memo(function ItemCard({
    item,
    onPress,
}: {
    item: InventoryItem
    onPress: (item: InventoryItem) => void
}) {
    const low      = isLowStock(item)
    const accent   = accentColor(item)
    const firstImg = resolveUrl(item.images?.[0])

    return (
        <TouchableOpacity
            style={[s.card, { borderLeftColor: accent, borderLeftWidth: 4 }]}
            activeOpacity={0.72}
            onPress={() => onPress(item)}
        >
            <View style={s.cardInner}>
                {/* Thumbnail */}
                <View style={s.thumb}>
                    {firstImg ? (
                        <Image source={{ uri: firstImg }} style={s.thumbImg} resizeMode="cover" />
                    ) : (
                        <Ionicons name="cube-outline" size={22} color="#ccc" />
                    )}
                </View>

                {/* Info */}
                <View style={s.cardInfo}>
                    <View style={s.cardHead}>
                        <Text style={s.codeText}>{item.code}</Text>
                        {item.is_stocked && (
                            <View style={[s.badge, low ? s.badgeLow : s.badgeOk]}>
                                <View style={[s.badgeDot, { backgroundColor: accent }]} />
                                <Text style={[s.badgeText, { color: accent }]}>
                                    {low ? 'Low Stock' : 'In Stock'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                    <View style={s.cardFoot}>
                        <View style={s.stockChip}>
                            <Ionicons name="layers-outline" size={12} color="#9ca3af" />
                            <Text style={[s.stockText, low && { color: '#dc2626', fontWeight: '700' }]}>
                                {formatStock(item)}
                            </Text>
                        </View>
                        {item.unit_cost !== null && (
                            <Text style={s.costText}>${formatCost(item.unit_cost)}</Text>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    )
})

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function InventoryScreen() {
    const insets  = useSafeAreaInsets()
    const hasRead = useAuthStore(st => st.user?.permissions?.includes('inventory.read') ?? false)

    if (!hasRead) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f8' }} edges={['top']}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="lock-closed-outline" size={32} color="#aaa" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' }}>Access Restricted</Text>
                    <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 }}>
                        Your role does not have permission to access Inventory.
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    const [items,      setItems]      = useState<InventoryItem[]>([])
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search,     setSearch]     = useState('')
    const [tab,        setTab]        = useState<StockTab>('all')

    // ── detail sheet ──────────────────────────────────────────────────────────
    const [selectedItem,  setSelectedItem]  = useState<InventoryItem | null>(null)
    const [detailFull,    setDetailFull]    = useState<DetailFull>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailOpen,    setDetailOpen]    = useState(false)
    const detailSlide    = useRef(new Animated.Value(900)).current
    const detailBackdrop = useRef(new Animated.Value(0)).current

    const openDetail = useCallback(async (item: InventoryItem) => {
        setSelectedItem(item)
        setDetailFull(null)
        detailSlide.setValue(900)
        detailBackdrop.setValue(0)
        setDetailOpen(true)
        setDetailLoading(true)
        try {
            const res = await apiGetItem(item.id)
            setDetailFull(res.data?.data ?? null)
        } catch {
            setDetailFull(null)
        } finally {
            setDetailLoading(false)
        }
    }, [])

    const closeDetail = useCallback(() => {
        Animated.parallel([
            Animated.timing(detailSlide,    { toValue: 900, duration: 220, useNativeDriver: true }),
            Animated.timing(detailBackdrop, { toValue: 0,   duration: 180, useNativeDriver: true }),
        ]).start(() => { setDetailOpen(false); setSelectedItem(null) })
    }, [])

    // ── load items ────────────────────────────────────────────────────────────
    const load = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true)
        try {
            const res = await apiGetItems({ per_page: 200 })
            setItems(res.data?.data?.items ?? [])
        } catch {
            setItems([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { load(true) }, [load])
    const onRefresh = useCallback(() => { setRefreshing(true); load() }, [load])

    // ── counts ────────────────────────────────────────────────────────────────
    const counts = useMemo(() => {
        const c: Record<StockTab, number> = { all: items.length, in_stock: 0, low_stock: 0, unstocked: 0 }
        for (const i of items) c[getStockTab(i)] = (c[getStockTab(i)] ?? 0) + 1
        return c
    }, [items])

    // ── filter ────────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = items
        if (tab !== 'all') list = list.filter(i => getStockTab(i) === tab)
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(i =>
                i.name.toLowerCase().includes(q) ||
                i.code.toLowerCase().includes(q)  ||
                (i.barcode ?? '').toLowerCase().includes(q)
            )
        }
        return list
    }, [items, search, tab])

    const renderItem = useCallback(({ item }: { item: InventoryItem }) => (
        <ItemCard item={item} onPress={openDetail} />
    ), [openDetail])

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            {/* Header */}
            <View style={s.header}>
                <Text style={s.headerTitle}>Inventory</Text>
                {!loading && (
                    <Text style={s.headerSub}>{filtered.length} of {items.length} items</Text>
                )}
            </View>

            {/* Search toolbar */}
            <View style={s.toolbar}>
                <View style={s.searchWrap}>
                    <Ionicons name="search-outline" size={15} color="#bbb" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search items, codes, barcodes…"
                        placeholderTextColor="#c8c8c8"
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                            <Ionicons name="close-circle" size={16} color="#bbb" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Stock tabs */}
            <View style={s.tabsBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsContent}>
                    {STOCK_TABS.map(t => {
                        const count    = counts[t.key] ?? 0
                        const isActive = tab === t.key
                        return (
                            <TouchableOpacity
                                key={t.key}
                                style={[s.tab, isActive && s.tabActive]}
                                onPress={() => setTab(t.key)}
                                activeOpacity={0.75}
                            >
                                <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{t.label}</Text>
                                {!loading && (t.key === 'all' || count > 0) && (
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
                            <Text style={s.emptyTitle}>No items found</Text>
                            <Text style={s.emptySub}>
                                {search ? 'Try a different search term' : 'Try a different filter'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* ── DETAIL SHEET ── */}
            <Modal
                visible={detailOpen}
                transparent
                statusBarTranslucent
                animationType="none"
                onRequestClose={closeDetail}
                onShow={() => {
                    Animated.parallel([
                        Animated.spring(detailSlide,    { toValue: 0, bounciness: 0, speed: 20, useNativeDriver: true }),
                        Animated.timing(detailBackdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
                    ]).start()
                }}
            >
                <View style={{ flex: 1 }}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, s.backdrop, { opacity: detailBackdrop }]}>
                        <Pressable style={StyleSheet.absoluteFillObject} onPress={closeDetail} />
                    </Animated.View>

                    <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: detailSlide }] }]}>
                        {selectedItem && (
                            <ItemDetailContent
                                item={selectedItem}
                                detail={detailFull}
                                loading={detailLoading}
                                onClose={closeDetail}
                            />
                        )}
                    </Animated.View>
                </View>
            </Modal>

        </SafeAreaView>
    )
}

// ── Detail Content ────────────────────────────────────────────────────────────

function ItemDetailContent({
    item,
    detail,
    loading,
    onClose,
}: {
    item: InventoryItem
    detail: DetailFull
    loading: boolean
    onClose: () => void
}) {
    const low      = isLowStock(item)
    const firstImg = resolveUrl(item.images?.[0])

    return (
        <>
            <View style={s.handle} />
            <View style={s.sheetTitleRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={s.sheetCode}>{item.code}</Text>
                    <Text style={s.sheetTitle} numberOfLines={2}>{item.name}</Text>
                </View>
                <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color="#555" />
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {firstImg ? (
                    <Image source={{ uri: firstImg }} style={s.detailImg} resizeMode="cover" />
                ) : null}

                {item.description ? (
                    <Text style={s.detailDesc}>{item.description}</Text>
                ) : null}

                <View style={s.divider} />

                {/* Key metrics */}
                <View style={s.metricsRow}>
                    <View style={[s.metricCard, low && { borderColor: '#fca5a5' }]}>
                        <Ionicons name="layers-outline" size={20} color={low ? '#dc2626' : '#10b981'} />
                        <Text style={[s.metricVal, low && { color: '#dc2626' }]}>{formatStock(item)}</Text>
                        <Text style={s.metricLabel}>Total Stock</Text>
                        {low && <Text style={s.lowAlert}>Below Min!</Text>}
                    </View>
                    {item.min_stock !== null && (
                        <View style={s.metricCard}>
                            <Ionicons name="alert-circle-outline" size={20} color="#f59e0b" />
                            <Text style={s.metricVal}>
                                {item.min_stock}{item.unit ? ` ${item.unit}` : ''}
                            </Text>
                            <Text style={s.metricLabel}>Min Stock</Text>
                        </View>
                    )}
                    {item.unit_cost !== null && (
                        <View style={s.metricCard}>
                            <Ionicons name="pricetag-outline" size={20} color="#6366f1" />
                            <Text style={s.metricVal}>${formatCost(item.unit_cost)}</Text>
                            <Text style={s.metricLabel}>Unit Cost</Text>
                        </View>
                    )}
                </View>

                {item.barcode && <DetailRow icon="barcode-outline" label="Barcode" value={item.barcode} />}
                {item.unit    && <DetailRow icon="scale-outline"   label="Unit"    value={item.unit}    />}

                {loading && (
                    <ActivityIndicator size="small" color="#111" style={{ marginVertical: 20 }} />
                )}
                {!loading && detail?.stock_by_warehouse && detail.stock_by_warehouse.length > 0 && (
                    <>
                        <View style={s.divider} />
                        <Text style={s.sectionLabel}>STOCK BY WAREHOUSE</Text>
                        {detail.stock_by_warehouse.map(w => (
                            <View key={w.warehouse_id} style={s.warehouseRow}>
                                <View style={s.warehouseIcon}>
                                    <Ionicons name="business-outline" size={14} color="#6b7280" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.warehouseName}>{w.warehouse_name ?? '—'}</Text>
                                    <Text style={s.warehouseCode}>{w.warehouse_code ?? ''}</Text>
                                </View>
                                <Text style={s.warehouseQty}>
                                    {Number(w.stock_qty).toFixed(2).replace(/\.?0+$/, '') || '0'}
                                    {item.unit ? ` ${item.unit}` : ''}
                                </Text>
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>
        </>
    )
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={s.detailRow}>
            <Ionicons name={icon as never} size={16} color="#bbb" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
                <Text style={s.detailRowLabel}>{label}</Text>
                <Text style={s.detailRowValue}>{value}</Text>
            </View>
        </View>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f4f6f8' },

    /* Header */
    header: {
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
    headerSub:   { fontSize: 11, color: '#aaa', fontWeight: '500', marginTop: 2 },

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

    /* Tabs */
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
        overflow: 'hidden',
    },
    cardInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    thumb: {
        width: 52, height: 52, borderRadius: 12,
        backgroundColor: '#f4f6f8', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
    },
    thumbImg:  { width: 52, height: 52 },
    cardInfo:  { flex: 1 },
    cardHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    codeText:  { fontSize: 11, fontWeight: '700', color: '#b0b8c1', letterSpacing: 0.8 },

    badge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    badgeOk:  { backgroundColor: '#d1fae5' },
    badgeLow: { backgroundColor: '#fee2e2' },
    badgeDot: { width: 5, height: 5, borderRadius: 3 },
    badgeText:{ fontSize: 10, fontWeight: '700' },

    cardName:  { fontSize: 15, fontWeight: '700', color: '#111', lineHeight: 20, marginBottom: 8 },
    cardFoot:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stockChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stockText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
    costText:  { fontSize: 13, fontWeight: '600', color: '#6366f1' },

    /* Empty */
    emptyWrap:    { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
    emptyIconWrap:{
        width: 80, height: 80, borderRadius: 24, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#edf0f3',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: '#444' },
    emptySub:   { fontSize: 13, color: '#b0b8c1', textAlign: 'center', lineHeight: 20 },

    /* Sheet */
    backdrop: { backgroundColor: 'rgba(0,0,0,0.52)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 14,
        maxHeight: '90%',
    },
    handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16 },
    sheetTitleRow:{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
    sheetCode:    { fontSize: 11, fontWeight: '700', color: '#b0b8c1', letterSpacing: 0.8, marginBottom: 4 },
    sheetTitle:   { fontSize: 18, fontWeight: '800', color: '#111', lineHeight: 24 },
    closeBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ebebeb' },

    /* Detail */
    detailImg:  { width: '100%', height: 180, borderRadius: 16, marginBottom: 16, backgroundColor: '#f5f5f5' },
    detailDesc: { fontSize: 14, color: '#888', lineHeight: 20, marginBottom: 4 },
    divider:    { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },

    metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
    metricCard: {
        flex: 1, backgroundColor: '#f9f9f9', borderRadius: 14,
        padding: 12, alignItems: 'center', gap: 4,
        borderWidth: 1, borderColor: '#f0f0f0',
    },
    metricVal:   { fontSize: 16, fontWeight: '800', color: '#111' },
    metricLabel: { fontSize: 10, fontWeight: '600', color: '#aaa', letterSpacing: 0.5 },
    lowAlert:    { fontSize: 10, fontWeight: '700', color: '#dc2626' },

    detailRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
    detailRowLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
    detailRowValue: { fontSize: 14, color: '#111', fontWeight: '500' },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 12 },
    warehouseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    warehouseIcon:{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    warehouseName:{ fontSize: 14, fontWeight: '600', color: '#111' },
    warehouseCode:{ fontSize: 11, color: '#bbb', fontWeight: '500', letterSpacing: 0.5 },
    warehouseQty: { fontSize: 14, fontWeight: '700', color: '#10b981' },
})
