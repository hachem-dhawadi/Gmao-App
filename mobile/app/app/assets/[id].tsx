import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { apiGetAsset, type Asset } from '@/services/AssetsService'
import { apiGetWorkOrders, type WorkOrder } from '@/services/WorkOrdersService'
import { StatusColors } from '@/constants/colors'

const STATUS_LABELS: Record<string, string> = {
    active:            'Active',
    inactive:          'Inactive',
    under_maintenance: 'Under Maintenance',
    decommissioned:    'Decommissioned',
}
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    active:            { bg: '#05eb7624', text: '#10b981' },
    inactive:          { bg: '#f5f5f5',   text: '#737373' },
    under_maintenance: { bg: '#ffd40045', text: '#f59e0b' },
    decommissioned:    { bg: '#ff6a551a', text: '#ff6a55' },
}

function fmt(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={s.infoRow}>
            <View style={s.infoIcon}>
                <Ionicons name={icon as never} size={16} color={Colors.primary} />
            </View>
            <View style={s.infoTexts}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoValue}>{value}</Text>
            </View>
        </View>
    )
}

export default function AssetDetail() {
    const { id } = useLocalSearchParams<{ id: string }>()

    const [asset,      setAsset]      = useState<Asset | null>(null)
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [tab,        setTab]        = useState<'details' | 'work-orders'>('details')

    const load = useCallback(async () => {
        try {
            const [aRes, wRes] = await Promise.all([
                apiGetAsset(id),
                apiGetWorkOrders({ asset_id: id, per_page: 20 }),
            ])
            setAsset(aRes.data.data.asset)
            setWorkOrders(wRes.data.data?.work_orders ?? [])
        } catch {
            // silent
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [id])

    useEffect(() => { load() }, [load])

    const onRefresh = () => { setRefreshing(true); load() }

    if (loading) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.loadingWrap}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        )
    }

    if (!asset) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.notFound}>
                    <Text style={s.notFoundText}>Asset not found.</Text>
                    <TouchableOpacity onPress={() => router.back()}><Text style={s.backLink}>Go back</Text></TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const st = STATUS_COLORS[asset.status] ?? STATUS_COLORS.inactive

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={Colors.gray700} />
                </TouchableOpacity>
                <Text style={s.headerCode}>{asset.code}</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                style={s.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* Title */}
                <View style={s.titleBlock}>
                    <View style={s.assetIconLarge}>
                        <Ionicons name="cube-outline" size={30} color={Colors.primary} />
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[s.statusText, { color: st.text }]}>{STATUS_LABELS[asset.status] ?? asset.status}</Text>
                    </View>
                    <Text style={s.name}>{asset.name}</Text>
                    <Text style={s.category}>{asset.asset_type?.name ?? '—'}</Text>
                </View>

                {/* Tabs */}
                <View style={s.tabsRow}>
                    {(['details', 'work-orders'] as const).map(t => (
                        <TouchableOpacity
                            key={t}
                            style={[s.tab, tab === t && s.tabActive]}
                            onPress={() => setTab(t)}
                        >
                            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                                {t === 'work-orders' ? `Work Orders (${workOrders.length})` : 'Details'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {tab === 'details' && (
                    <View style={s.card}>
                        {asset.serial_number && (
                            <><InfoRow icon="barcode-outline"  label="Serial Number"  value={asset.serial_number} /><View style={s.div} /></>
                        )}
                        {asset.manufacturer && (
                            <><InfoRow icon="business-outline" label="Manufacturer"   value={asset.manufacturer} /><View style={s.div} /></>
                        )}
                        {asset.model && (
                            <><InfoRow icon="settings-outline" label="Model"          value={asset.model} /><View style={s.div} /></>
                        )}
                        {asset.location && (
                            <><InfoRow icon="location-outline" label="Location"       value={asset.location} /><View style={s.div} /></>
                        )}
                        {asset.installed_at && (
                            <><InfoRow icon="calendar-outline" label="Install Date"   value={fmt(asset.installed_at)} /><View style={s.div} /></>
                        )}
                        <InfoRow icon="shield-checkmark-outline" label="Warranty Until" value={fmt(asset.warranty_end_at)} />

                        {asset.notes ? (
                            <>
                                <View style={[s.div, { marginVertical: 14 }]} />
                                <Text style={s.descLabel}>Notes</Text>
                                <Text style={s.descText}>{asset.notes}</Text>
                            </>
                        ) : null}
                    </View>
                )}

                {tab === 'work-orders' && (
                    <View style={s.woListWrap}>
                        {workOrders.length === 0 ? (
                            <View style={s.emptyTab}>
                                <Ionicons name="construct-outline" size={36} color={Colors.gray300} />
                                <Text style={s.emptyTabText}>No work orders for this asset</Text>
                            </View>
                        ) : (
                            workOrders.map(wo => {
                                const sc = StatusColors[wo.status] ?? StatusColors.open
                                return (
                                    <TouchableOpacity
                                        key={wo.id}
                                        style={s.woCard}
                                        activeOpacity={0.75}
                                        onPress={() => router.push(`/app/work-orders/${wo.id}` as never)}
                                    >
                                        <View style={s.woBody}>
                                            <Text style={s.woCode}>{wo.code}</Text>
                                            <Text style={s.woTitle} numberOfLines={1}>{wo.title}</Text>
                                            <Text style={s.woDate}>{fmt(wo.created_at)}</Text>
                                        </View>
                                        <View style={[s.woBadge, { backgroundColor: sc.bg }]}>
                                            <Text style={[s.woBadgeText, { color: sc.text }]}>
                                                {wo.status.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )
                            })
                        )}
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    safe:        { flex: 1, backgroundColor: Colors.gray100 },
    scroll:      { flex: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray200,
    },
    backBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
    headerCode: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },

    titleBlock: { backgroundColor: Colors.white, padding: 20, alignItems: 'center', marginBottom: 0 },
    assetIconLarge: {
        width: 64, height: 64, borderRadius: 18, backgroundColor: Colors.primarySubtle,
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
    statusText:  { fontSize: 12, fontWeight: '700' },
    name:     { fontSize: 20, fontWeight: '800', color: Colors.gray900, textAlign: 'center', marginBottom: 4 },
    category: { fontSize: 13, color: Colors.gray500 },

    tabsRow: {
        flexDirection: 'row', backgroundColor: Colors.white,
        marginBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.gray200,
    },
    tab:          { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive:    { borderBottomColor: Colors.primary },
    tabText:      { fontSize: 13, fontWeight: '600', color: Colors.gray500 },
    tabTextActive:{ color: Colors.primary },

    card: {
        backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: Colors.gray200,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    infoRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    infoIcon:  { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    infoTexts: { flex: 1 },
    infoLabel: { fontSize: 11, color: Colors.gray400, fontWeight: '600', marginBottom: 1 },
    infoValue: { fontSize: 14, color: Colors.gray900, fontWeight: '600' },
    div:       { height: 1, backgroundColor: Colors.gray100, marginVertical: 8 },
    descLabel: { fontSize: 13, fontWeight: '700', color: Colors.gray700, marginBottom: 8 },
    descText:  { fontSize: 14, color: Colors.gray600, lineHeight: 22 },

    woListWrap: { paddingHorizontal: 16, gap: 8 },
    woCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.white, borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: Colors.gray200,
    },
    woBody:      { flex: 1 },
    woCode:      { fontSize: 11, fontWeight: '700', color: Colors.gray500, marginBottom: 2 },
    woTitle:     { fontSize: 14, fontWeight: '600', color: Colors.gray900, marginBottom: 3 },
    woDate:      { fontSize: 12, color: Colors.gray400 },
    woBadge:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    woBadgeText: { fontSize: 11, fontWeight: '700' },

    emptyTab:     { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyTabText: { fontSize: 15, color: Colors.gray400, fontWeight: '600' },

    notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    notFoundText: { fontSize: 16, color: Colors.gray600 },
    backLink:     { fontSize: 14, color: Colors.primary, fontWeight: '600' },
})
