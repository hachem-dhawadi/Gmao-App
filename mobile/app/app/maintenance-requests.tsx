import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react'
import {
    View, Text, StyleSheet, FlatList, TextInput,
    RefreshControl, ActivityIndicator, Pressable,
    Animated, ScrollView, Alert, Modal, Keyboard, Platform,
    useWindowDimensions,
} from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
    apiGetRequests, apiCreateRequest,
    type MaintenanceRequest,
} from '@/services/RequestsService'
import { apiGetAssets, type Asset } from '@/services/AssetsService'

// ── constants ─────────────────────────────────────────────────────────────────

type StatusKey = 'all' | 'pending' | 'converted' | 'rejected'

const STATUS_TABS: { key: StatusKey; label: string }[] = [
    { key: 'all',       label: 'All'       },
    { key: 'pending',   label: 'Pending'   },
    { key: 'converted', label: 'Converted' },
    { key: 'rejected',  label: 'Rejected'  },
]

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const

const STATUS_META: Record<string, { bg: string; dot: string; text: string; accent: string; label: string }> = {
    pending:   { bg: '#fef3c7', dot: '#f59e0b', text: '#d97706', accent: '#f59e0b', label: 'Pending'   },
    converted: { bg: '#d1fae5', dot: '#10b981', text: '#059669', accent: '#10b981', label: 'Converted' },
    rejected:  { bg: '#fee2e2', dot: '#ef4444', text: '#dc2626', accent: '#ef4444', label: 'Rejected'  },
}

const PRIORITY_META: Record<string, { bg: string; text: string; label: string }> = {
    low:      { bg: '#f3f4f6', text: '#9ca3af', label: 'Low'      },
    medium:   { bg: '#dbeafe', text: '#2563eb', label: 'Medium'   },
    high:     { bg: '#fef3c7', text: '#d97706', label: 'High'     },
    critical: { bg: '#fee2e2', text: '#dc2626', label: 'Critical' },
}

function formatDate(d: string | null) {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Request Card ──────────────────────────────────────────────────────────────

const RequestCard = memo(function RequestCard({
    item,
    onPress,
}: {
    item: MaintenanceRequest
    onPress: (item: MaintenanceRequest) => void
}) {
    const sm = STATUS_META[item.status]     ?? STATUS_META.pending
    const pm = PRIORITY_META[item.priority] ?? PRIORITY_META.medium

    return (
        <TouchableOpacity
            style={[s.card, { borderLeftColor: sm.accent, borderLeftWidth: 4 }]}
            activeOpacity={0.72}
            onPress={() => onPress(item)}
        >
            <View style={s.cardHead}>
                <Text style={s.codeText}>{item.code}</Text>
                <View style={[s.priorityBadge, { backgroundColor: pm.bg }]}>
                    <Text style={[s.priorityText, { color: pm.text }]}>{pm.label}</Text>
                </View>
            </View>

            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>

            {(item.asset || item.location) && (
                <View style={s.assetRow}>
                    <Ionicons
                        name={item.asset ? 'cube-outline' : 'location-outline'}
                        size={12} color="#b0b8c1"
                    />
                    <Text style={s.assetText} numberOfLines={1}>
                        {item.asset ? item.asset.name : item.location}
                    </Text>
                </View>
            )}

            <View style={s.cardFoot}>
                <View style={[s.statusPill, { backgroundColor: sm.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: sm.dot }]} />
                    <Text style={[s.statusText, { color: sm.text }]}>{sm.label}</Text>
                </View>
                {item.created_at && (
                    <Text style={s.dateText}>{formatDate(item.created_at)}</Text>
                )}
            </View>

            {item.work_order && (
                <View style={s.woChip}>
                    <Ionicons name="construct-outline" size={11} color="#059669" />
                    <Text style={s.woChipText}>WO: {item.work_order.code}</Text>
                </View>
            )}
        </TouchableOpacity>
    )
})

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MaintenanceRequestsScreen() {
    const insets  = useSafeAreaInsets()
    const { height: SCREEN_H } = useWindowDimensions()

    const [requests,   setRequests]   = useState<MaintenanceRequest[]>([])
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search,     setSearch]     = useState('')
    const [activeTab,  setActiveTab]  = useState<StatusKey>('all')

    // ── create sheet state ────────────────────────────────────────────────────
    const [createOpen,      setCreateOpen]      = useState(false)
    const [newTitle,        setNewTitle]        = useState('')
    const [newDesc,         setNewDesc]         = useState('')
    const [newPriority,     setNewPriority]     = useState<string>('medium')
    const [newAssetId,      setNewAssetId]      = useState<number | null>(null)
    const [newLocation,     setNewLocation]     = useState('')
    const [submitting,      setSubmitting]      = useState(false)
    const [assets,          setAssets]          = useState<Asset[]>([])
    const [assetSearch,     setAssetSearch]     = useState('')
    const [showAssetPicker, setShowAssetPicker] = useState(false)

    // ── detail sheet state ────────────────────────────────────────────────────
    const [selectedReq, setSelectedReq] = useState<MaintenanceRequest | null>(null)
    const [detailOpen,  setDetailOpen]  = useState(false)

    const createSlide    = useRef(new Animated.Value(900)).current
    const createBackdrop = useRef(new Animated.Value(0)).current
    const detailSlide    = useRef(new Animated.Value(900)).current
    const detailBackdrop = useRef(new Animated.Value(0)).current
    const [kbHeight, setKbHeight] = useState(0)

    // Lift sheet above keyboard when create form is open
    useEffect(() => {
        if (!createOpen) { setKbHeight(0); return }
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
        const onShow = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height))
        const onHide = Keyboard.addListener(hideEvent, () => setKbHeight(0))
        return () => { onShow.remove(); onHide.remove() }
    }, [createOpen])

    // ── open/close helpers ────────────────────────────────────────────────────
    const openCreate = useCallback(() => {
        createSlide.setValue(900); createBackdrop.setValue(0); setCreateOpen(true)
    }, [])

    const closeCreate = useCallback(() => {
        Animated.parallel([
            Animated.timing(createSlide,    { toValue: 900, duration: 220, useNativeDriver: true }),
            Animated.timing(createBackdrop, { toValue: 0,   duration: 180, useNativeDriver: true }),
        ]).start(() => {
            setCreateOpen(false)
            setNewTitle(''); setNewDesc(''); setNewPriority('medium')
            setNewAssetId(null); setNewLocation(''); setAssetSearch(''); setShowAssetPicker(false)
        })
    }, [])

    const openDetail = useCallback((req: MaintenanceRequest) => {
        setSelectedReq(req)
        detailSlide.setValue(900); detailBackdrop.setValue(0); setDetailOpen(true)
    }, [])

    const closeDetail = useCallback(() => {
        Animated.parallel([
            Animated.timing(detailSlide,    { toValue: 900, duration: 220, useNativeDriver: true }),
            Animated.timing(detailBackdrop, { toValue: 0,   duration: 180, useNativeDriver: true }),
        ]).start(() => { setDetailOpen(false); setSelectedReq(null) })
    }, [])

    // ── load ──────────────────────────────────────────────────────────────────
    const load = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true)
        try {
            const res = await apiGetRequests({ per_page: 200 })
            setRequests(res.data?.data?.requests ?? [])
        } catch {
            setRequests([])
        } finally {
            setLoading(false); setRefreshing(false)
        }
    }, [])

    useEffect(() => { load(true) }, [load])
    const onRefresh = useCallback(() => { setRefreshing(true); load() }, [load])

    useEffect(() => {
        apiGetAssets({ per_page: 200 })
            .then(r => setAssets(r.data?.data?.assets ?? []))
            .catch(() => setAssets([]))
    }, [])

    // ── counts ────────────────────────────────────────────────────────────────
    const counts = useMemo(() => {
        const c: Record<StatusKey, number> = { all: requests.length, pending: 0, converted: 0, rejected: 0 }
        for (const r of requests) {
            if (r.status in c) c[r.status as StatusKey] = (c[r.status as StatusKey] ?? 0) + 1
        }
        return c
    }, [requests])

    // ── filter ────────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = requests
        if (activeTab !== 'all') list = list.filter(r => r.status === activeTab)
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(r =>
                r.title.toLowerCase().includes(q) ||
                r.code.toLowerCase().includes(q)  ||
                (r.asset?.name ?? '').toLowerCase().includes(q)
            )
        }
        return list
    }, [requests, search, activeTab])

    const filteredAssets = useMemo(() => {
        if (!assetSearch.trim()) return assets.slice(0, 30)
        const q = assetSearch.toLowerCase()
        return assets.filter(a =>
            a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
        ).slice(0, 30)
    }, [assets, assetSearch])

    // ── submit ────────────────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!newTitle.trim()) { Alert.alert('Required', 'Please enter a title.'); return }
        setSubmitting(true)
        try {
            await apiCreateRequest({
                title:       newTitle.trim(),
                description: newDesc.trim() || null,
                priority:    newPriority,
                asset_id:    newAssetId ?? null,
                location:    !newAssetId ? (newLocation.trim() || null) : null,
            })
            closeCreate(); load(false)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            Alert.alert('Error', msg ?? 'Failed to submit request.')
        } finally {
            setSubmitting(false)
        }
    }, [newTitle, newDesc, newPriority, newAssetId, newLocation, closeCreate, load])

    const selectedAsset = assets.find(a => a.id === newAssetId)

    const renderItem = useCallback(({ item }: { item: MaintenanceRequest }) => (
        <RequestCard item={item} onPress={openDetail} />
    ), [openDetail])

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            {/* Header */}
            <View style={s.header}>
                <View>
                    <Text style={s.headerTitle}>Requests</Text>
                    {!loading && (
                        <Text style={s.headerSub}>{filtered.length} of {requests.length}</Text>
                    )}
                </View>
                <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.8}>
                    <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Search toolbar */}
            <View style={s.toolbar}>
                <View style={s.searchWrap}>
                    <Ionicons name="search-outline" size={15} color="#bbb" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search requests…"
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111" />}
                    ListEmptyComponent={
                        <View style={s.emptyWrap}>
                            <View style={s.emptyIconWrap}>
                                <Ionicons name="clipboard-outline" size={36} color="#d0d5dd" />
                            </View>
                            <Text style={s.emptyTitle}>No requests found</Text>
                            <Text style={s.emptySub}>
                                {search ? 'Try a different search term' : 'Submit your first maintenance request'}
                            </Text>
                            {!search && (
                                <TouchableOpacity style={s.emptyBtn} onPress={openCreate} activeOpacity={0.8}>
                                    <Ionicons name="add-circle-outline" size={16} color="#fff" />
                                    <Text style={s.emptyBtnText}>New Request</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}

            {/* ── CREATE SHEET ── */}
            <Modal
                visible={createOpen}
                transparent
                statusBarTranslucent
                animationType="none"
                onRequestClose={closeCreate}
                onShow={() => {
                    Animated.parallel([
                        Animated.spring(createSlide,    { toValue: 0, bounciness: 0, speed: 20, useNativeDriver: true }),
                        Animated.timing(createBackdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
                    ]).start()
                }}
            >
                <View style={{ flex: 1 }}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, s.backdrop, { opacity: createBackdrop }]}>
                        <Pressable style={StyleSheet.absoluteFillObject} onPress={closeCreate} />
                    </Animated.View>

                    <Animated.View style={[
                        s.sheet,
                        {
                            paddingBottom: insets.bottom + 20,
                            bottom: kbHeight,
                            transform: [{ translateY: createSlide }],
                            ...(kbHeight > 0 && {
                                maxHeight: SCREEN_H - kbHeight - insets.top - 10,
                            }),
                        },
                    ]}>
                        <View style={s.handle} />
                        <View style={s.sheetTitleRow}>
                            <Text style={s.sheetTitle}>New Request</Text>
                            <Pressable style={s.closeBtn} onPress={closeCreate} hitSlop={10}>
                                <Ionicons name="close" size={18} color="#555" />
                            </Pressable>
                        </View>

                        <ScrollView
                            style={{ flex: 1 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            automaticallyAdjustKeyboardInsets={true}
                        >

                            <Text style={s.label}>Issue Title <Text style={{ color: '#ef4444' }}>*</Text></Text>
                            <TextInput
                                style={s.textInput}
                                placeholder="e.g. Machine is making a noise"
                                placeholderTextColor="#ccc"
                                value={newTitle}
                                onChangeText={setNewTitle}
                            />

                            <Text style={[s.label, { marginTop: 16 }]}>Priority</Text>
                            <View style={s.chips}>
                                {PRIORITIES.map(p => {
                                    const pm     = PRIORITY_META[p]
                                    const active = newPriority === p
                                    return (
                                        <Pressable
                                            key={p}
                                            style={({ pressed }) => [s.chip, active && { backgroundColor: pm.bg, borderColor: pm.text }, pressed && { opacity: 0.7 }]}
                                            onPress={() => setNewPriority(p)}
                                        >
                                            <Text style={[s.chipText, active && { color: pm.text, fontWeight: '700' }]}>
                                                {capitalize(p)}
                                            </Text>
                                        </Pressable>
                                    )
                                })}
                            </View>

                            <Text style={[s.label, { marginTop: 16 }]}>Asset (optional)</Text>
                            <Pressable
                                style={({ pressed }) => [s.pickerBtn, pressed && { opacity: 0.7 }]}
                                onPress={() => setShowAssetPicker(v => !v)}
                            >
                                <Ionicons name="cube-outline" size={15} color="#aaa" />
                                <Text style={[s.pickerBtnText, selectedAsset && { color: '#111' }]}>
                                    {selectedAsset ? `${selectedAsset.code} — ${selectedAsset.name}` : 'Select asset…'}
                                </Text>
                                {newAssetId ? (
                                    <Pressable onPress={() => { setNewAssetId(null); setShowAssetPicker(false) }} hitSlop={10}>
                                        <Ionicons name="close-circle" size={16} color="#aaa" />
                                    </Pressable>
                                ) : (
                                    <Ionicons name={showAssetPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#aaa" />
                                )}
                            </Pressable>

                            {showAssetPicker && (
                                <View style={s.assetPicker}>
                                    <TextInput
                                        style={s.assetSearch}
                                        placeholder="Search assets…"
                                        placeholderTextColor="#ccc"
                                        value={assetSearch}
                                        onChangeText={setAssetSearch}
                                    />
                                    {filteredAssets.map(a => (
                                        <Pressable
                                            key={a.id}
                                            style={({ pressed }) => [s.assetOption, newAssetId === a.id && s.assetOptionActive, pressed && { opacity: 0.7 }]}
                                            onPress={() => { setNewAssetId(a.id); setShowAssetPicker(false) }}
                                        >
                                            <Text style={s.assetOptionCode}>{a.code}</Text>
                                            <Text style={s.assetOptionName} numberOfLines={1}>{a.name}</Text>
                                        </Pressable>
                                    ))}
                                    {filteredAssets.length === 0 && (
                                        <Text style={s.assetNoResult}>No assets found</Text>
                                    )}
                                </View>
                            )}

                            {!newAssetId && (
                                <>
                                    <Text style={[s.label, { marginTop: 16 }]}>Location (if no asset)</Text>
                                    <TextInput
                                        style={s.textInput}
                                        placeholder="e.g. Building B, Floor 2"
                                        placeholderTextColor="#ccc"
                                        value={newLocation}
                                        onChangeText={setNewLocation}
                                    />
                                </>
                            )}

                            <Text style={[s.label, { marginTop: 16 }]}>Description (optional)</Text>
                            <TextInput
                                style={[s.textInput, s.textArea]}
                                placeholder="Describe the issue in detail…"
                                placeholderTextColor="#ccc"
                                value={newDesc}
                                onChangeText={setNewDesc}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />

                            <Pressable
                                style={({ pressed }) => [s.submitBtn, submitting && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <>
                                        <Ionicons name="send-outline" size={18} color="#fff" />
                                        <Text style={s.submitText}>Submit Request</Text>
                                      </>
                                }
                            </Pressable>

                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>

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
                        {selectedReq && <DetailContent req={selectedReq} onClose={closeDetail} />}
                    </Animated.View>
                </View>
            </Modal>

        </SafeAreaView>
    )
}

// ── Detail Content ────────────────────────────────────────────────────────────

function DetailContent({ req, onClose }: { req: MaintenanceRequest; onClose: () => void }) {
    const sm = STATUS_META[req.status]     ?? STATUS_META.pending
    const pm = PRIORITY_META[req.priority] ?? PRIORITY_META.medium

    return (
        <>
            <View style={s.handle} />
            <View style={s.sheetTitleRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={s.sheetCode}>{req.code}</Text>
                    <Text style={s.sheetTitle} numberOfLines={2}>{req.title}</Text>
                </View>
                <Pressable style={s.closeBtn} onPress={onClose} hitSlop={10}>
                    <Ionicons name="close" size={18} color="#555" />
                </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <View style={[s.statusPill, { backgroundColor: sm.bg }]}>
                        <View style={[s.statusDot, { backgroundColor: sm.dot }]} />
                        <Text style={[s.statusText, { color: sm.text }]}>{sm.label}</Text>
                    </View>
                    <View style={[s.priorityBadge, { backgroundColor: pm.bg }]}>
                        <Text style={[s.priorityText, { color: pm.text }]}>{pm.label}</Text>
                    </View>
                </View>

                {req.description && (
                    <Text style={s.detailDesc}>{req.description}</Text>
                )}

                <View style={s.divider} />

                <DetailRow icon="calendar-outline" label="Submitted"
                    value={new Date(req.created_at ?? '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                {req.asset     && <DetailRow icon="cube-outline"              label="Asset"        value={`${req.asset.code} — ${req.asset.name}`} />}
                {!req.asset && req.location && <DetailRow icon="location-outline" label="Location" value={req.location} />}
                {req.requested_by && <DetailRow icon="person-outline"         label="Requested by" value={req.requested_by.name ?? '—'} />}
                {req.reviewed_by  && <DetailRow icon="shield-checkmark-outline" label="Reviewed by" value={req.reviewed_by.name ?? '—'} />}
                {req.work_order   && <DetailRow icon="construct-outline"      label="Work Order"   value={req.work_order.code} accent="#059669" />}

                {req.review_note && (
                    <View style={s.reviewNote}>
                        <Text style={s.reviewNoteLabel}>Review Note</Text>
                        <Text style={s.reviewNoteText}>{req.review_note}</Text>
                    </View>
                )}
            </ScrollView>
        </>
    )
}

function DetailRow({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: string }) {
    return (
        <View style={s.detailRow}>
            <Ionicons name={icon as never} size={16} color={accent ?? '#bbb'} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
                <Text style={s.detailRowLabel}>{label}</Text>
                <Text style={[s.detailRowValue, accent ? { color: accent, fontWeight: '700' } : {}]}>{value}</Text>
            </View>
        </View>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f4f6f8' },

    /* Header */
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
    headerSub:   { fontSize: 11, color: '#aaa', fontWeight: '500', marginTop: 2 },
    addBtn: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
    },

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
        padding: 14, overflow: 'hidden',
        shadowColor: '#101828', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    cardHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    codeText:     { fontSize: 11, fontWeight: '700', color: '#b0b8c1', letterSpacing: 0.8 },
    priorityBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    priorityText: { fontSize: 11, fontWeight: '700' },
    cardTitle:    { fontSize: 15, fontWeight: '700', color: '#111', lineHeight: 22, marginBottom: 8 },
    assetRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
    assetText:    { fontSize: 12, color: '#b0b8c1', fontWeight: '500', flex: 1 },
    cardFoot:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    statusPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    statusDot:    { width: 5, height: 5, borderRadius: 3 },
    statusText:   { fontSize: 11, fontWeight: '700' },
    dateText:     { fontSize: 11, color: '#b0b8c1', fontWeight: '500' },
    woChip:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
    woChipText:   { fontSize: 11, fontWeight: '700', color: '#059669' },

    /* Empty */
    emptyWrap:    { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
    emptyIconWrap:{
        width: 80, height: 80, borderRadius: 24, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#edf0f3',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    emptyTitle:  { fontSize: 16, fontWeight: '800', color: '#444' },
    emptySub:    { fontSize: 13, color: '#b0b8c1', textAlign: 'center', lineHeight: 20 },
    emptyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
    emptyBtnText:{ fontSize: 14, fontWeight: '700', color: '#fff' },

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

    /* Form */
    label:    { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.8, marginBottom: 8 },
    textInput:{ borderWidth: 1, borderColor: '#ebebeb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111', backgroundColor: '#fafafa' },
    textArea: { minHeight: 100, paddingTop: 12 },
    chips:    { flexDirection: 'row', gap: 8 },
    chip:     { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1.5, borderColor: '#ebebeb' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#888' },
    pickerBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: '#ebebeb', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fafafa',
    },
    pickerBtnText: { flex: 1, fontSize: 15, color: '#bbb' },
    assetPicker:       { marginTop: 8, borderWidth: 1, borderColor: '#ebebeb', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
    assetSearch:       { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111' },
    assetOption:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    assetOptionActive: { backgroundColor: '#f0fdf4' },
    assetOptionCode:   { fontSize: 11, fontWeight: '700', color: '#bbb', letterSpacing: 0.8, width: 60 },
    assetOptionName:   { flex: 1, fontSize: 14, color: '#111', fontWeight: '500' },
    assetNoResult:     { padding: 16, textAlign: 'center', color: '#bbb', fontSize: 14 },
    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 56, borderRadius: 16, backgroundColor: '#111', marginTop: 20, marginBottom: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
    },
    submitText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

    /* Detail */
    divider:        { height: 1, backgroundColor: '#f0f0f0', marginVertical: 16 },
    detailDesc:     { fontSize: 14, color: '#666', lineHeight: 22 },
    detailRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
    detailRowLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
    detailRowValue: { fontSize: 14, color: '#111', fontWeight: '500' },
    reviewNote:     { backgroundColor: '#fef9c3', borderRadius: 12, padding: 14, marginTop: 4, marginBottom: 8 },
    reviewNoteLabel:{ fontSize: 11, fontWeight: '700', color: '#a16207', marginBottom: 6, letterSpacing: 0.5 },
    reviewNoteText: { fontSize: 14, color: '#713f12', lineHeight: 20 },
})
