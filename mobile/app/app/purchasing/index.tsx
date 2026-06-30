import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react'
import {
    View, Text, StyleSheet, FlatList, TextInput,
    RefreshControl, ActivityIndicator, Pressable,
    Animated, ScrollView, Modal,
} from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
    apiGetPurchaseOrders, apiGetPurchaseOrderById,
    type PurchaseOrder, type PoLine,
} from '@/services/PurchasingService'
import { useAuthStore } from '@/store/authStore'

// ── constants ─────────────────────────────────────────────────────────────────

type Status = 'all' | 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled'

const STATUS_TABS: { key: Status; label: string }[] = [
    { key: 'all',               label: 'All'        },
    { key: 'draft',             label: 'Draft'      },
    { key: 'ordered',           label: 'Ordered'    },
    { key: 'partially_received',label: 'Partial'    },
    { key: 'received',          label: 'Received'   },
    { key: 'cancelled',         label: 'Cancelled'  },
]

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
    draft:              { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
    ordered:            { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
    partially_received: { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
    received:           { bg: '#d1fae5', text: '#059669', border: '#a7f3d0' },
    cancelled:          { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
}

const PAYMENT_COLOR: Record<string, { bg: string; text: string }> = {
    pending:  { bg: '#fef9c3', text: '#ca8a04' },
    paid:     { bg: '#d1fae5', text: '#059669' },
    disputed: { bg: '#fee2e2', text: '#dc2626' },
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    paypal:        'PayPal',
    check:         'Check',
    cash:          'Cash',
    credit_card:   'Credit Card',
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatAmount(n: number | null) {
    if (n === null || n === undefined) return '—'
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusLabel(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── PO Card ───────────────────────────────────────────────────────────────────

const PoCard = memo(function PoCard({
    po,
    onPress,
}: {
    po: PurchaseOrder
    onPress: (po: PurchaseOrder) => void
}) {
    const sc = STATUS_COLOR[po.status] ?? STATUS_COLOR.draft
    const pc = po.payment_status ? PAYMENT_COLOR[po.payment_status] : null
    const itemCount = po.lines?.length ?? 0

    return (
        <TouchableOpacity style={[s.card, { borderLeftColor: sc.border, borderLeftWidth: 4 }]} activeOpacity={0.72} onPress={() => onPress(po)}>
            {/* Top row */}
            <View style={s.cardTop}>
                <View style={s.cardCodeWrap}>
                    <View style={s.cartIcon}>
                        <Ionicons name="cart-outline" size={16} color="#ef4444" />
                    </View>
                    <Text style={s.cardCode}>{po.code}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <Text style={[s.statusBadgeText, { color: sc.text }]}>{statusLabel(po.status)}</Text>
                </View>
            </View>

            {/* Supplier */}
            <Text style={s.cardSupplier} numberOfLines={1}>
                {po.supplier?.name ?? 'No supplier'}
            </Text>

            {/* Bottom row */}
            <View style={s.cardBot}>
                <View style={s.cardMeta}>
                    <Ionicons name="layers-outline" size={11} color="#bbb" />
                    <Text style={s.cardMetaText}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
                </View>
                {po.ordered_at && (
                    <View style={s.cardMeta}>
                        <Ionicons name="calendar-outline" size={11} color="#bbb" />
                        <Text style={s.cardMetaText}>{formatDate(po.ordered_at)}</Text>
                    </View>
                )}
                <View style={{ flex: 1 }} />
                {pc && (
                    <View style={[s.payBadge, { backgroundColor: pc.bg }]}>
                        <Text style={[s.payBadgeText, { color: pc.text }]}>
                            {po.payment_status}
                        </Text>
                    </View>
                )}
                <Text style={s.cardAmount}>${formatAmount(po.total_amount)}</Text>
            </View>
        </TouchableOpacity>
    )
})

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PurchasingScreen() {
    const insets = useSafeAreaInsets()
    const hasRead = useAuthStore(st => st.user?.permissions?.includes('purchasing.read') ?? false)

    if (!hasRead) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top']}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="lock-closed-outline" size={32} color="#ef4444" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' }}>Access Restricted</Text>
                    <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 }}>
                        Your role does not have permission to access Purchasing.
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    const [orders,     setOrders]     = useState<PurchaseOrder[]>([])
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search,     setSearch]     = useState('')
    const [activeTab,  setActiveTab]  = useState<Status>('all')

    // ── detail sheet ──────────────────────────────────────────────────────────
    const [selectedPo,    setSelectedPo]    = useState<PurchaseOrder | null>(null)
    const [detailFull,    setDetailFull]    = useState<PurchaseOrder | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailOpen,    setDetailOpen]    = useState(false)
    const detailSlide    = useRef(new Animated.Value(900)).current
    const detailBackdrop = useRef(new Animated.Value(0)).current

    const openDetail = useCallback(async (po: PurchaseOrder) => {
        setSelectedPo(po)
        setDetailFull(null)
        detailSlide.setValue(900)
        detailBackdrop.setValue(0)
        setDetailOpen(true)
        setDetailLoading(true)
        try {
            const res = await apiGetPurchaseOrderById(po.id)
            setDetailFull(res.data?.data?.purchase_order ?? null)
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
        ]).start(() => { setDetailOpen(false); setSelectedPo(null) })
    }, [])

    // ── load orders ───────────────────────────────────────────────────────────
    const load = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true)
        try {
            const res = await apiGetPurchaseOrders({ per_page: 200 })
            setOrders(res.data?.data?.purchase_orders ?? [])
        } catch {
            setOrders([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { load(true) }, [load])

    const onRefresh = useCallback(() => { setRefreshing(true); load() }, [load])

    // ── counts ────────────────────────────────────────────────────────────────
    const counts = useMemo(() => {
        const c: Record<string, number> = { all: orders.length }
        for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1
        return c
    }, [orders])

    // ── filter ────────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = orders
        if (activeTab !== 'all') list = list.filter(o => o.status === activeTab)
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(o =>
                o.code.toLowerCase().includes(q) ||
                (o.supplier?.name ?? '').toLowerCase().includes(q) ||
                (o.supplier_reference ?? '').toLowerCase().includes(q)
            )
        }
        return list
    }, [orders, search, activeTab])

    const renderItem = useCallback(({ item }: { item: PurchaseOrder }) => (
        <PoCard po={item} onPress={openDetail} />
    ), [openDetail])

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            {/* Header */}
            <View style={s.header}>
                <Text style={s.headerTitle}>Purchasing</Text>
                {!loading && (
                    <Text style={s.headerSub}>{filtered.length} of {orders.length} orders</Text>
                )}
            </View>

            {/* Search toolbar */}
            <View style={s.toolbar}>
                <View style={s.searchWrap}>
                    <Ionicons name="search-outline" size={15} color="#bbb" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search orders, suppliers, references…"
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
                        const isActive = activeTab === tab.key
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[s.tab, isActive && s.tabActive]}
                                onPress={() => setActiveTab(tab.key)}
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
                    ListEmptyComponent={
                        <View style={s.emptyWrap}>
                            <View style={s.emptyIcon}>
                                <Ionicons name="cart-outline" size={32} color="#ef4444" style={{ opacity: 0.4 }} />
                            </View>
                            <Text style={s.emptyTitle}>No orders found</Text>
                            <Text style={s.emptySub}>
                                {search ? 'Try adjusting your search' : 'No purchase orders for this status'}
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
                        {selectedPo && (
                            <PoDetailContent
                                po={selectedPo}
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

function PoDetailContent({
    po,
    detail,
    loading,
    onClose,
}: {
    po: PurchaseOrder
    detail: PurchaseOrder | null
    loading: boolean
    onClose: () => void
}) {
    const data = detail ?? po
    const sc = STATUS_COLOR[data.status] ?? STATUS_COLOR.draft
    const pc = data.payment_status ? PAYMENT_COLOR[data.payment_status] : null

    return (
        <>
            <View style={s.handle} />
            <View style={s.sheetTitleRow}>
                <Text style={s.sheetTitle} numberOfLines={1}>{data.code}</Text>
                <Pressable style={s.closeBtn} onPress={onClose} hitSlop={10}>
                    <Ionicons name="close" size={18} color="#555" />
                </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>

                {/* Status badges */}
                <View style={s.badgeRow}>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                        <Text style={[s.statusBadgeText, { color: sc.text }]}>{statusLabel(data.status)}</Text>
                    </View>
                    {pc && (
                        <View style={[s.payBadge, { backgroundColor: pc.bg }]}>
                            <Text style={[s.payBadgeText, { color: pc.text }]}>
                                {data.payment_status}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Total amount */}
                <View style={s.totalCard}>
                    <Text style={s.totalLabel}>TOTAL AMOUNT</Text>
                    <Text style={s.totalValue}>${formatAmount(data.total_amount)}</Text>
                    {data.receipts_count > 0 && (
                        <Text style={s.receiptsHint}>{data.receipts_count} receipt{data.receipts_count > 1 ? 's' : ''} recorded</Text>
                    )}
                </View>

                {/* Key dates */}
                <View style={s.datesRow}>
                    <DateChip label="Created"   value={formatDate(data.created_at)}           icon="time-outline" />
                    <DateChip label="Ordered"   value={formatDate(data.ordered_at)}            icon="checkmark-circle-outline" />
                    <DateChip label="Expected"  value={formatDate(data.expected_delivery_at)}  icon="calendar-outline" />
                </View>

                <View style={s.divider} />

                {/* Supplier */}
                {data.supplier && (
                    <>
                        <Text style={s.sectionLabel}>SUPPLIER</Text>
                        <View style={s.supplierCard}>
                            <View style={s.supplierIconWrap}>
                                <Ionicons name="business-outline" size={20} color="#ef4444" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.supplierName}>{data.supplier.name}</Text>
                                {data.supplier.contact_name && (
                                    <Text style={s.supplierMeta}>{data.supplier.contact_name}</Text>
                                )}
                                {data.supplier.email && (
                                    <Text style={s.supplierMeta}>{data.supplier.email}</Text>
                                )}
                                {data.supplier.phone && (
                                    <Text style={s.supplierMeta}>{data.supplier.phone}</Text>
                                )}
                            </View>
                        </View>
                        {data.supplier_reference && (
                            <InfoRow icon="document-text-outline" label="Supplier Ref" value={data.supplier_reference} />
                        )}
                        {data.supplier_note && (
                            <InfoRow icon="chatbubble-outline" label="Note" value={data.supplier_note} />
                        )}
                        <View style={s.divider} />
                    </>
                )}

                {/* Order lines */}
                {loading ? (
                    <ActivityIndicator size="small" color="#ef4444" style={{ marginVertical: 20 }} />
                ) : (
                    data.lines && data.lines.length > 0 && (
                        <>
                            <Text style={s.sectionLabel}>ORDER LINES ({data.lines.length})</Text>
                            {data.lines.map(line => (
                                <LineRow key={line.id} line={line} />
                            ))}
                            <View style={s.divider} />
                        </>
                    )
                )}

                {/* Invoice info */}
                {data.invoice_number && (
                    <>
                        <Text style={s.sectionLabel}>INVOICE</Text>
                        <InfoRow icon="receipt-outline"   label="Invoice #"  value={data.invoice_number} />
                        {data.invoice_date   && <InfoRow icon="calendar-outline" label="Invoice Date" value={formatDate(data.invoice_date)} />}
                        {data.invoice_amount !== null && (
                            <InfoRow icon="cash-outline" label="Invoice Amount" value={`$${formatAmount(data.invoice_amount)}`} />
                        )}
                        <View style={s.divider} />
                    </>
                )}

                {/* Payment info */}
                {data.payment_status === 'paid' && (
                    <>
                        <Text style={s.sectionLabel}>PAYMENT</Text>
                        {data.payment_method && (
                            <InfoRow icon="card-outline" label="Method" value={PAYMENT_METHOD_LABEL[data.payment_method] ?? data.payment_method} />
                        )}
                        {data.paid_at && <InfoRow icon="checkmark-circle-outline" label="Paid At" value={formatDate(data.paid_at)} />}
                        {data.payment_reference && <InfoRow icon="barcode-outline" label="Reference" value={data.payment_reference} />}
                        {data.payment_note && <InfoRow icon="chatbubble-outline" label="Note" value={data.payment_note} />}
                        <View style={s.divider} />
                    </>
                )}

                {/* Approved by */}
                {data.approved_by && (
                    <InfoRow icon="person-circle-outline" label="Approved by" value={data.approved_by.name ?? '—'} />
                )}
                {data.created_by && (
                    <InfoRow icon="person-outline" label="Created by" value={data.created_by.name ?? '—'} />
                )}

            </ScrollView>
        </>
    )
}

function LineRow({ line }: { line: PoLine }) {
    const received = line.qty_received > 0
    const pending  = line.qty_pending > 0

    return (
        <View style={s.lineRow}>
            <View style={s.lineIconWrap}>
                <Ionicons name="cube-outline" size={14} color="#6b7280" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={s.lineName} numberOfLines={1}>
                    {line.item?.name ?? `Item #${line.item?.id ?? '?'}`}
                </Text>
                <Text style={s.lineCode}>{line.item?.code ?? ''}</Text>
                <View style={s.lineQtyRow}>
                    <Text style={s.lineQtyLabel}>Ordered: </Text>
                    <Text style={s.lineQtyVal}>{line.qty_ordered}{line.item?.unit ? ` ${line.item.unit}` : ''}</Text>
                    {received && (
                        <>
                            <Text style={s.lineQtyLabel}>  Rcvd: </Text>
                            <Text style={[s.lineQtyVal, { color: '#059669' }]}>{line.qty_received}</Text>
                        </>
                    )}
                    {pending && (
                        <>
                            <Text style={s.lineQtyLabel}>  Pending: </Text>
                            <Text style={[s.lineQtyVal, { color: '#d97706' }]}>{line.qty_pending}</Text>
                        </>
                    )}
                </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.lineTotal}>${formatAmount(line.line_total)}</Text>
                <Text style={s.lineUnit}>${formatAmount(line.unit_price)} ea</Text>
            </View>
        </View>
    )
}

function DateChip({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <View style={s.dateChip}>
            <Ionicons name={icon as never} size={14} color="#aaa" />
            <Text style={s.dateChipLabel}>{label}</Text>
            <Text style={s.dateChipVal}>{value}</Text>
        </View>
    )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={s.infoRow}>
            <Ionicons name={icon as never} size={15} color="#bbb" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoValue}>{value}</Text>
            </View>
        </View>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f4f6f8' },

    header: {
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
    headerSub:   { fontSize: 11, color: '#aaa', fontWeight: '500', marginTop: 2 },

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

    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    loadingText: { fontSize: 14, color: '#bbb', fontWeight: '500' },

    listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28, gap: 10 },

    /* Card */
    card: {
        backgroundColor: '#fff', borderRadius: 14,
        borderWidth: 1, borderColor: '#edf0f3', padding: 14,
        shadowColor: '#101828', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
        overflow: 'hidden',
    },
    cardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    cardCodeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cartIcon: {
        width: 30, height: 30, borderRadius: 8,
        backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
    },
    cardCode:     { fontSize: 13, fontWeight: '800', color: '#111', letterSpacing: 0.3 },
    cardSupplier: { fontSize: 13, color: '#6b7280', fontWeight: '500', marginBottom: 10 },
    cardBot:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
    cardMetaText: { fontSize: 11, color: '#bbb', fontWeight: '500' },
    cardAmount:   { fontSize: 14, fontWeight: '800', color: '#111' },

    statusBadge: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20, borderWidth: 1,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '700' },

    payBadge: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 20,
    },
    payBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

    /* Empty */
    emptyWrap:  { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
    emptyIcon:  {
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
        maxHeight: '92%',
    },
    handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16 },
    sheetTitleRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    sheetTitle:   { fontSize: 18, fontWeight: '800', color: '#111', flex: 1, marginRight: 12 },
    closeBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ebebeb' },

    /* Detail */
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },

    totalCard: {
        backgroundColor: '#fef2f2', borderRadius: 16, padding: 16,
        alignItems: 'center', marginBottom: 14,
        borderWidth: 1, borderColor: '#fecaca',
    },
    totalLabel:   { fontSize: 11, fontWeight: '700', color: '#f87171', letterSpacing: 1, marginBottom: 4 },
    totalValue:   { fontSize: 28, fontWeight: '900', color: '#111' },
    receiptsHint: { fontSize: 12, color: '#aaa', marginTop: 4 },

    datesRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    dateChip: {
        flex: 1, backgroundColor: '#f9f9f9', borderRadius: 12,
        padding: 10, alignItems: 'center', gap: 3,
        borderWidth: 1, borderColor: '#f0f0f0',
    },
    dateChipLabel: { fontSize: 10, fontWeight: '600', color: '#bbb', letterSpacing: 0.5 },
    dateChipVal:   { fontSize: 11, fontWeight: '700', color: '#555', textAlign: 'center' },

    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 12 },

    supplierCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        backgroundColor: '#fff5f5', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#fecaca', marginBottom: 12,
    },
    supplierIconWrap: {
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    supplierName: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 3 },
    supplierMeta: { fontSize: 12, color: '#888', lineHeight: 18 },

    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
    infoLabel:{ fontSize: 11, color: '#aaa', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
    infoValue:{ fontSize: 14, color: '#111', fontWeight: '500' },

    lineRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
    },
    lineIconWrap: {
        width: 28, height: 28, borderRadius: 7,
        backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    lineName:    { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 1 },
    lineCode:    { fontSize: 10, fontWeight: '600', color: '#ccc', letterSpacing: 0.5, marginBottom: 3 },
    lineQtyRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    lineQtyLabel:{ fontSize: 11, color: '#aaa' },
    lineQtyVal:  { fontSize: 11, fontWeight: '700', color: '#555' },
    lineTotal:   { fontSize: 14, fontWeight: '800', color: '#111' },
    lineUnit:    { fontSize: 11, color: '#bbb', marginTop: 2 },
})
