import { useState, useRef, useCallback, useEffect } from 'react'
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Dimensions, Animated, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { apiGetAssets, type Asset } from '@/services/AssetsService'

const { width: SW, height: SH } = Dimensions.get('window')
const FRAME = SW * 0.7
const OVERLAY = 'rgba(0,0,0,0.72)'

const STATUS_COLOR: Record<string, { bg: string; dot: string }> = {
    active:            { bg: '#10b98120', dot: '#10b981' },
    inactive:          { bg: '#9ca3af20', dot: '#9ca3af' },
    under_maintenance: { bg: '#f59e0b20', dot: '#f59e0b' },
    decommissioned:    { bg: '#ff6a5520', dot: '#ff6a55' },
}
const STATUS_LABEL: Record<string, string> = {
    active: 'Active', inactive: 'Inactive',
    under_maintenance: 'Under Maintenance', decommissioned: 'Decommissioned',
}

export default function ScanScreen() {
    const [permission, requestPermission] = useCameraPermissions()
    const [torch,      setTorch]      = useState(false)
    const [scanning,   setScanning]   = useState(true)
    const [searching,  setSearching]  = useState(false)
    const [result,     setResult]     = useState<Asset | null>(null)
    const [notFound,   setNotFound]   = useState(false)
    const [foundCode,  setFoundCode]  = useState('')
    const [manual,     setManual]     = useState(false)
    const [manualCode, setManualCode] = useState('')

    const cooldown  = useRef(false)
    const slideAnim = useRef(new Animated.Value(500)).current
    const lineAnim  = useRef(new Animated.Value(0)).current

    // Reset scan state on every focus
    useFocusEffect(
        useCallback(() => {
            setScanning(true)
            setResult(null)
            setNotFound(false)
            cooldown.current = false
            return () => setTorch(false)
        }, [])
    )

    // Auto-request permission
    useEffect(() => {
        if (permission && !permission.granted && permission.canAskAgain) {
            requestPermission()
        }
    }, [permission])

    // Scan line loop
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(lineAnim, { toValue: FRAME - 3, duration: 1900, useNativeDriver: true }),
                Animated.timing(lineAnim, { toValue: 0,          duration: 1900, useNativeDriver: true }),
            ])
        )
        loop.start()
        return () => loop.stop()
    }, [])

    const openSheet = useCallback((asset?: Asset, code?: string) => {
        if (asset) { setResult(asset); setNotFound(false) }
        else       { setResult(null); setNotFound(true); setFoundCode(code ?? '') }
        slideAnim.setValue(500)
        Animated.spring(slideAnim, { toValue: 0, bounciness: 5, speed: 14, useNativeDriver: true }).start()
    }, [])

    const closeSheet = useCallback(() => {
        Animated.timing(slideAnim, { toValue: 500, duration: 220, useNativeDriver: true }).start(() => {
            setResult(null)
            setNotFound(false)
            setScanning(true)
            cooldown.current = false
        })
    }, [])

    const lookup = useCallback(async (code: string) => {
        const q = code.trim()
        if (!q) return
        setSearching(true)
        try {
            const res    = await apiGetAssets({ search: q, per_page: 1 })
            const assets = res.data?.data?.assets ?? []
            if (assets.length > 0) openSheet(assets[0])
            else                    openSheet(undefined, q)
        } catch {
            openSheet(undefined, q)
        } finally {
            setSearching(false)
        }
    }, [openSheet])

    const onBarcodeScanned = useCallback(({ data }: { data: string }) => {
        if (cooldown.current || !scanning) return
        cooldown.current = true
        setScanning(false)
        lookup(data)
    }, [scanning, lookup])

    // ── Permission loading ────────────────────────────────────────────────────
    if (!permission) {
        return <View style={st.fill}><ActivityIndicator color="#fff" size="large" /></View>
    }

    // ── Permission denied ─────────────────────────────────────────────────────
    if (!permission.granted) {
        return (
            <SafeAreaView style={st.permScreen} edges={['top', 'bottom']}>
                <View style={st.permContent}>
                    <View style={st.permIcon}><Ionicons name="camera-outline" size={44} color="#fff" /></View>
                    <Text style={st.permTitle}>Camera Access Needed</Text>
                    <Text style={st.permSub}>Allow camera to scan asset QR codes and barcodes.</Text>
                    <TouchableOpacity style={st.permBtn} onPress={requestPermission} activeOpacity={0.85}>
                        <Text style={st.permBtnText}>Allow Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 14 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    // ── Main screen ───────────────────────────────────────────────────────────
    return (
        <View style={st.root}>

            {/* Camera fills screen */}
            <CameraView
                style={st.camera}
                facing="back"
                enableTorch={torch}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'datamatrix'],
                }}
                onBarcodeScanned={scanning ? onBarcodeScanned : undefined}
            />

            {/* Overlay with transparent cutout */}
            <View style={{ position: 'absolute', top: 0, left: 0, width: SW, height: SH }} pointerEvents="none">
                <View style={st.ovTop} />
                <View style={st.ovRow}>
                    <View style={st.ovSide} />
                    <View style={st.frame}>
                        <View style={[st.corner, st.cTL]} />
                        <View style={[st.corner, st.cTR]} />
                        <View style={[st.corner, st.cBL]} />
                        <View style={[st.corner, st.cBR]} />
                        <Animated.View style={[st.scanLine, { transform: [{ translateY: lineAnim }] }]} />
                    </View>
                    <View style={st.ovSide} />
                </View>
                <View style={st.ovBottom} />
            </View>

            {/* Top bar */}
            <SafeAreaView edges={['top']} style={st.topBar} pointerEvents="box-none">
                <TouchableOpacity style={st.circleBtn} onPress={() => router.back()} activeOpacity={0.8}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>

                <View style={st.topCenter}>
                    <Text style={st.topTitle}>Scan Asset</Text>
                    <Text style={st.topSub}>
                        {scanning ? 'Point at a QR code or barcode' : 'Searching…'}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[st.circleBtn, torch && st.circleBtnActive]}
                    onPress={() => setTorch(v => !v)}
                    activeOpacity={0.8}
                >
                    <Ionicons name={torch ? 'flash' : 'flash-off-outline'} size={20} color={torch ? '#fbbf24' : '#fff'} />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Searching spinner */}
            {searching && (
                <View style={st.searchingOverlay}>
                    <ActivityIndicator color="#fff" size="large" />
                    <Text style={st.searchingText}>Looking up asset…</Text>
                </View>
            )}

            {/* Bottom controls */}
            {!result && !notFound && !searching && (
                <SafeAreaView edges={['bottom']} style={st.bottomBar} pointerEvents="box-none">
                    {manual ? (
                        <View style={st.manualRow}>
                            <TextInput
                                style={st.manualInput}
                                placeholder="Asset code or serial…"
                                placeholderTextColor="rgba(255,255,255,0.35)"
                                value={manualCode}
                                onChangeText={setManualCode}
                                autoCapitalize="characters"
                                returnKeyType="search"
                                onSubmitEditing={() => { lookup(manualCode); setManual(false) }}
                                autoFocus
                            />
                            <TouchableOpacity
                                style={[st.manualGo, !manualCode.trim() && { opacity: 0.35 }]}
                                disabled={!manualCode.trim()}
                                onPress={() => { lookup(manualCode); setManual(false) }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="arrow-forward" size={20} color="#111" />
                            </TouchableOpacity>
                            <TouchableOpacity style={st.manualClose} onPress={() => { setManual(false); setManualCode('') }}>
                                <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={st.manualBtn} onPress={() => setManual(true)} activeOpacity={0.8}>
                            <Ionicons name="keypad-outline" size={17} color="rgba(255,255,255,0.85)" />
                            <Text style={st.manualBtnText}>Enter Code Manually</Text>
                        </TouchableOpacity>
                    )}
                </SafeAreaView>
            )}

            {/* Result bottom sheet */}
            {(result || notFound) && (
                <Animated.View style={[st.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={st.sheetHandle} />
                    {result
                        ? <AssetCard asset={result} onDismiss={closeSheet} />
                        : <NotFoundCard code={foundCode} onDismiss={closeSheet} />
                    }
                </Animated.View>
            )}
        </View>
    )
}

// ── Asset result card ─────────────────────────────────────────────────────────

function AssetCard({ asset, onDismiss }: { asset: Asset; onDismiss: () => void }) {
    const sc = STATUS_COLOR[asset.status] ?? STATUS_COLOR.inactive
    return (
        <>
            <View style={st.sheetHeader}>
                <View style={st.sheetIconWrap}>
                    <Ionicons name="checkmark-circle" size={26} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={st.sheetLabel}>Asset Found</Text>
                    <Text style={st.sheetCode}>{asset.code}</Text>
                </View>
                <TouchableOpacity style={st.sheetClose} onPress={onDismiss}>
                    <Ionicons name="close" size={20} color="#aaa" />
                </TouchableOpacity>
            </View>

            <Text style={st.assetName}>{asset.name}</Text>

            <View style={st.metaRow}>
                <View style={[st.statusPill, { backgroundColor: sc.bg }]}>
                    <View style={[st.statusDot, { backgroundColor: sc.dot }]} />
                    <Text style={[st.statusText, { color: sc.dot }]}>
                        {STATUS_LABEL[asset.status] ?? asset.status}
                    </Text>
                </View>
                {asset.asset_type && (
                    <View style={st.metaChip}>
                        <Ionicons name="layers-outline" size={12} color="#999" />
                        <Text style={st.metaChipText}>{asset.asset_type.name}</Text>
                    </View>
                )}
            </View>

            {asset.location && (
                <View style={st.locationRow}>
                    <Ionicons name="location-outline" size={15} color="#bbb" />
                    <Text style={st.locationText}>{asset.location}</Text>
                </View>
            )}

            <View style={st.sheetActions}>
                <TouchableOpacity style={st.btnSecondary} onPress={onDismiss} activeOpacity={0.75}>
                    <Ionicons name="scan-outline" size={17} color="#555" />
                    <Text style={st.btnSecondaryText}>Scan Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={st.btnPrimary}
                    onPress={() => router.push(`/app/assets/${asset.id}` as never)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="cube-outline" size={17} color="#fff" />
                    <Text style={st.btnPrimaryText}>View Asset</Text>
                </TouchableOpacity>
            </View>
        </>
    )
}

// ── Not found card ────────────────────────────────────────────────────────────

function NotFoundCard({ code, onDismiss }: { code: string; onDismiss: () => void }) {
    return (
        <>
            <View style={st.sheetHeader}>
                <View style={[st.sheetIconWrap, { backgroundColor: '#ff6a5512' }]}>
                    <Ionicons name="alert-circle" size={26} color="#ff6a55" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[st.sheetLabel, { color: '#ff6a55' }]}>No Asset Found</Text>
                    <Text style={st.sheetCode}>"{code}"</Text>
                </View>
                <TouchableOpacity style={st.sheetClose} onPress={onDismiss}>
                    <Ionicons name="close" size={20} color="#aaa" />
                </TouchableOpacity>
            </View>
            <Text style={st.notFoundSub}>
                No asset matched this code. Check the label and try again.
            </Text>
            <TouchableOpacity style={[st.btnSecondary, { marginTop: 20 }]} onPress={onDismiss} activeOpacity={0.75}>
                <Ionicons name="refresh-outline" size={17} color="#555" />
                <Text style={st.btnSecondaryText}>Try Again</Text>
            </TouchableOpacity>
        </>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CORNER_SIZE = 22
const CORNER_W    = 3

const st = StyleSheet.create({
    fill:       { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    root:       { flex: 1, backgroundColor: '#000' },
    camera:     { position: 'absolute', top: 0, left: 0, width: SW, height: SH },

    // Overlay cutout — fixed top so frame sits at true vertical center
    ovTop:    { height: (SH - FRAME) / 2, backgroundColor: OVERLAY },
    ovRow:    { flexDirection: 'row', height: FRAME },
    ovSide:   { flex: 1, backgroundColor: OVERLAY },
    ovBottom: { flex: 1, backgroundColor: OVERLAY },
    frame:    { width: FRAME, height: FRAME },

    corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
    cTL: { top: 0,    left: 0,    borderTopWidth: CORNER_W,    borderLeftWidth: CORNER_W,   borderColor: '#fff', borderTopLeftRadius: 6 },
    cTR: { top: 0,    right: 0,   borderTopWidth: CORNER_W,    borderRightWidth: CORNER_W,  borderColor: '#fff', borderTopRightRadius: 6 },
    cBL: { bottom: 0, left: 0,    borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W,   borderColor: '#fff', borderBottomLeftRadius: 6 },
    cBR: { bottom: 0, right: 0,   borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W,  borderColor: '#fff', borderBottomRightRadius: 6 },

    scanLine: {
        position: 'absolute', left: 10, right: 10, height: 2,
        backgroundColor: '#2a85ff',
        shadowColor: '#2a85ff', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1, shadowRadius: 8, elevation: 6,
    },

    // Top bar
    topBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 12, gap: 12,
    },
    topCenter:  { flex: 1, alignItems: 'center' },
    topTitle:   { fontSize: 17, fontWeight: '800', color: '#fff' },
    topSub:     { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

    circleBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },
    circleBtnActive: { backgroundColor: 'rgba(251,191,36,0.2)' },

    // Searching
    searchingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center', justifyContent: 'center', gap: 14,
    },
    searchingText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    // Bottom bar
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingBottom: 8,
        alignItems: 'center',
    },
    manualBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 22, paddingVertical: 13,
        borderRadius: 30,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    manualBtnText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

    manualRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    manualInput:    { flex: 1, fontSize: 15, color: '#fff', paddingVertical: 10 },
    manualGo:       { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    manualClose:    { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

    // Bottom sheet
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 10, paddingBottom: 36,
    },
    sheetHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 20,
    },
    sheetHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    sheetIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10b98112', alignItems: 'center', justifyContent: 'center' },
    sheetLabel:    { fontSize: 13, fontWeight: '700', color: '#10b981', marginBottom: 2 },
    sheetCode:     { fontSize: 12, color: '#bbb', fontWeight: '600', letterSpacing: 0.5 },
    sheetClose:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

    assetName: { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 12 },

    metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    statusDot:  { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: '700' },
    metaChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 },
    metaChipText: { fontSize: 12, color: '#888', fontWeight: '600' },

    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    locationText: { fontSize: 13, color: '#aaa' },

    sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    btnSecondary: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#e8e8e8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    btnSecondaryText: { fontSize: 14, fontWeight: '700', color: '#444' },
    btnPrimary:   { flex: 2, height: 52, borderRadius: 14, backgroundColor: '#111', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },

    notFoundSub: { fontSize: 14, color: '#aaa', lineHeight: 21 },

    // Permission screen
    permScreen:  { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
    permContent: { alignItems: 'center', paddingHorizontal: 32 },
    permIcon:    { width: 88, height: 88, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    permTitle:   { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 10, textAlign: 'center' },
    permSub:     { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    permBtn:     { backgroundColor: '#fff', paddingHorizontal: 36, paddingVertical: 15, borderRadius: 16 },
    permBtnText: { fontSize: 15, fontWeight: '800', color: '#111' },
})
