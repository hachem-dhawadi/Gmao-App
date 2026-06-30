import { useState, useCallback, useEffect } from 'react'
import {
    View, Text, StyleSheet, TextInput,
    Pressable, ActivityIndicator, Modal, FlatList,
    Keyboard, Platform,
} from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { apiCreateWorkOrder } from '@/services/WorkOrdersService'
import { apiGetAssets, type Asset } from '@/services/AssetsService'
import { apiGetMembers, type Member } from '@/services/MembersService'
import { useAuthStore } from '@/store/authStore'

// ── constants ─────────────────────────────────────────────────────────────────

type Priority = 'low' | 'medium' | 'high' | 'critical'
type Section  = 'title' | 'priority' | 'asset' | 'datetime' | 'assignee' | 'description' | 'submit'

const PRIORITIES: { key: Priority; label: string; color: string }[] = [
    { key: 'low',      label: 'Low',      color: '#6b7280' },
    { key: 'medium',   label: 'Medium',   color: '#2563eb' },
    { key: 'high',     label: 'High',     color: '#d97706' },
    { key: 'critical', label: 'Critical', color: '#dc2626' },
]

const CAL_DAYS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const FULL_MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
]

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(h: number, m: number): string {
    if (h === 0 && m === 0) return 'Not set'
    const parts: string[] = []
    if (h > 0) parts.push(`${h}h`)
    parts.push(`${String(m).padStart(2, '0')}m`)
    return parts.join(' ')
}

function memberDisplayName(m: Member): string {
    return m.user?.name ?? `Member #${m.id}`
}
function memberInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function memberHue(id: number): number {
    return (id * 47) % 360
}

// ── Date Picker Modal ─────────────────────────────────────────────────────────

function DatePickerModal({ visible, value, onClose, onConfirm }: {
    visible: boolean
    value: Date | null
    onClose: () => void
    onConfirm: (d: Date) => void
}) {
    const insets = useSafeAreaInsets()
    const today  = new Date()
    const [viewYear,  setViewYear]  = useState(value?.getFullYear()  ?? today.getFullYear())
    const [viewMonth, setViewMonth] = useState(value?.getMonth()     ?? today.getMonth())
    const [selected,  setSelected]  = useState<Date | null>(value)

    useEffect(() => {
        if (!visible) return
        const ref = value ?? today
        setViewYear(ref.getFullYear())
        setViewMonth(ref.getMonth())
        setSelected(value)
    }, [visible])

    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

    function prevMonth() {
        if (isCurrentMonth) return
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
        else setViewMonth(m => m - 1)
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
        else setViewMonth(m => m + 1)
    }

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <View style={dp.overlay}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[dp.sheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={dp.handle} />

                    {/* Month / Year nav */}
                    <View style={dp.navRow}>
                        <Pressable onPress={prevMonth} style={dp.navBtn} hitSlop={10} disabled={isCurrentMonth}>
                            <Ionicons name="chevron-back" size={20} color={isCurrentMonth ? '#ccc' : '#111'} />
                        </Pressable>
                        <Text style={dp.navTitle}>{FULL_MONTHS[viewMonth]} {viewYear}</Text>
                        <Pressable onPress={nextMonth} style={dp.navBtn} hitSlop={10}>
                            <Ionicons name="chevron-forward" size={20} color="#111" />
                        </Pressable>
                    </View>

                    {/* Day headers */}
                    <View style={dp.dayRow}>
                        {CAL_DAYS.map(d => (
                            <Text key={d} style={dp.dayHdr}>{d}</Text>
                        ))}
                    </View>

                    {/* Calendar grid */}
                    <View style={dp.grid}>
                        {cells.map((day, i) => {
                            if (!day) return <View key={i} style={dp.cell} />
                            const isSel = selected &&
                                selected.getDate() === day &&
                                selected.getMonth() === viewMonth &&
                                selected.getFullYear() === viewYear
                            const isToday =
                                today.getDate() === day &&
                                today.getMonth() === viewMonth &&
                                today.getFullYear() === viewYear
                            const isPast = (
                                viewYear < today.getFullYear() ||
                                (viewYear === today.getFullYear() && viewMonth < today.getMonth()) ||
                                (viewYear === today.getFullYear() && viewMonth === today.getMonth() && day < today.getDate())
                            )
                            return (
                                <Pressable
                                    key={i}
                                    style={[dp.cell, isSel && dp.cellSel, !isSel && isToday && dp.cellToday, isPast && dp.cellPast]}
                                    onPress={() => !isPast && setSelected(new Date(viewYear, viewMonth, day))}
                                    disabled={isPast}
                                >
                                    <Text style={[dp.cellTxt, isSel && dp.cellTxtSel, !isSel && isToday && dp.cellTxtToday, isPast && dp.cellTxtPast]}>
                                        {day}
                                    </Text>
                                </Pressable>
                            )
                        })}
                    </View>

                    {/* Actions */}
                    <View style={dp.actions}>
                        <Pressable style={dp.cancelBtn} onPress={onClose}>
                            <Text style={dp.cancelTxt}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[dp.confirmBtn, !selected && { opacity: 0.4 }]}
                            disabled={!selected}
                            onPress={() => { if (selected) { onConfirm(selected); onClose() } }}
                        >
                            <Text style={dp.confirmTxt}>Confirm</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

// ── Duration Picker Modal ─────────────────────────────────────────────────────

function DurationPickerModal({ visible, hours, minutes, onClose, onConfirm }: {
    visible: boolean
    hours: number
    minutes: number
    onClose: () => void
    onConfirm: (h: number, m: number) => void
}) {
    const insets = useSafeAreaInsets()
    const [h, setH] = useState(hours)
    const [m, setM] = useState(minutes)

    useEffect(() => {
        if (visible) { setH(hours); setM(minutes) }
    }, [visible])

    const addH = () => setH(v => Math.min(47, v + 1))
    const subH = () => setH(v => Math.max(0, v - 1))
    const addM = () => setM(v => (v >= 55 ? 0 : v + 5))
    const subM = () => setM(v => (v <= 0 ? 55 : v - 5))

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <View style={dur.overlay}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[dur.sheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={dur.handle} />
                    <Text style={dur.title}>Estimated Duration</Text>

                    <View style={dur.steppers}>
                        {/* Hours */}
                        <View style={dur.col}>
                            <Text style={dur.colLabel}>Hours</Text>
                            <Pressable style={dur.stepBtn} onPress={addH} hitSlop={8}>
                                <Ionicons name="chevron-up" size={22} color="#111" />
                            </Pressable>
                            <View style={dur.valBox}>
                                <Text style={dur.valTxt}>{String(h).padStart(2, '0')}</Text>
                            </View>
                            <Pressable style={dur.stepBtn} onPress={subH} hitSlop={8}>
                                <Ionicons name="chevron-down" size={22} color="#111" />
                            </Pressable>
                        </View>

                        <Text style={dur.colon}>:</Text>

                        {/* Minutes */}
                        <View style={dur.col}>
                            <Text style={dur.colLabel}>Minutes</Text>
                            <Pressable style={dur.stepBtn} onPress={addM} hitSlop={8}>
                                <Ionicons name="chevron-up" size={22} color="#111" />
                            </Pressable>
                            <View style={dur.valBox}>
                                <Text style={dur.valTxt}>{String(m).padStart(2, '0')}</Text>
                            </View>
                            <Pressable style={dur.stepBtn} onPress={subM} hitSlop={8}>
                                <Ionicons name="chevron-down" size={22} color="#111" />
                            </Pressable>
                        </View>
                    </View>

                    {/* Preview */}
                    <Text style={dur.preview}>
                        {h === 0 && m === 0 ? 'No time set' : formatDuration(h, m)}
                    </Text>

                    <View style={dur.actions}>
                        <Pressable style={dur.cancelBtn} onPress={onClose}>
                            <Text style={dur.cancelTxt}>Cancel</Text>
                        </Pressable>
                        <Pressable style={dur.confirmBtn} onPress={() => { onConfirm(h, m); onClose() }}>
                            <Text style={dur.confirmTxt}>Confirm</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

// ── Asset Picker Modal ────────────────────────────────────────────────────────

function AssetPickerModal({ visible, onClose, onSelect }: {
    visible: boolean
    onClose: () => void
    onSelect: (a: Asset) => void
}) {
    const insets = useSafeAreaInsets()
    const [assets,  setAssets]  = useState<Asset[]>([])
    const [loading, setLoading] = useState(false)
    const [search,  setSearch]  = useState('')

    useEffect(() => {
        if (!visible) { setSearch(''); return }
        setLoading(true)
        apiGetAssets({ per_page: 300 })
            .then(r => setAssets(r.data?.data?.assets ?? []))
            .catch(() => setAssets([]))
            .finally(() => setLoading(false))
    }, [visible])

    const filtered = search.trim()
        ? assets.filter(a =>
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.code.toLowerCase().includes(search.toLowerCase())
          )
        : assets

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <View style={pm.overlay}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[pm.sheet, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={pm.handle} />
                    <View style={pm.titleRow}>
                        <Text style={pm.title}>Select Asset</Text>
                        <Pressable onPress={onClose} hitSlop={10} style={pm.closeBtn}>
                            <Ionicons name="close" size={18} color="#555" />
                        </Pressable>
                    </View>
                    <View style={pm.searchBar}>
                        <Ionicons name="search-outline" size={15} color="#bbb" />
                        <TextInput
                            style={pm.searchInput}
                            placeholder="Search assets…"
                            placeholderTextColor="#c8c8c8"
                            value={search}
                            onChangeText={setSearch}
                            returnKeyType="search"
                        />
                        {search.length > 0 && (
                            <Pressable onPress={() => setSearch('')} hitSlop={8}>
                                <Ionicons name="close-circle" size={16} color="#ccc" />
                            </Pressable>
                        )}
                    </View>
                    {loading ? (
                        <ActivityIndicator size="small" color="#111" style={{ marginTop: 32 }} />
                    ) : (
                        <FlatList
                            data={filtered}
                            keyExtractor={a => String(a.id)}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <Pressable
                                    style={pm.row}
                                    onPress={() => { onSelect(item); onClose() }}
                                    android_ripple={{ color: '#f3f4f6' }}
                                >
                                    <View style={pm.rowIcon}>
                                        <Ionicons name="cube-outline" size={16} color="#6b7280" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={pm.rowName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={pm.rowSub} numberOfLines={1}>
                                            {item.code}{item.location ? ` · ${item.location}` : ''}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color="#ddd" />
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <Text style={pm.empty}>{search ? 'No assets match your search' : 'No assets found'}</Text>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    )
}

// ── Member Picker Modal ───────────────────────────────────────────────────────

function MemberPickerModal({ visible, onClose, onSelect }: {
    visible: boolean
    onClose: () => void
    onSelect: (m: Member) => void
}) {
    const insets = useSafeAreaInsets()
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(false)
    const [search,  setSearch]  = useState('')

    useEffect(() => {
        if (!visible) { setSearch(''); return }
        setLoading(true)
        apiGetMembers({ per_page: 300 })
            .then(r => setMembers(r.data?.data?.members ?? []))
            .catch(() => setMembers([]))
            .finally(() => setLoading(false))
    }, [visible])

    const filtered = search.trim()
        ? members.filter(m =>
            memberDisplayName(m).toLowerCase().includes(search.toLowerCase()) ||
            (m.user?.email ?? '').toLowerCase().includes(search.toLowerCase())
          )
        : members

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <View style={pm.overlay}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[pm.sheet, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={pm.handle} />
                    <View style={pm.titleRow}>
                        <Text style={pm.title}>Assign To</Text>
                        <Pressable onPress={onClose} hitSlop={10} style={pm.closeBtn}>
                            <Ionicons name="close" size={18} color="#555" />
                        </Pressable>
                    </View>
                    <View style={pm.searchBar}>
                        <Ionicons name="search-outline" size={15} color="#bbb" />
                        <TextInput
                            style={pm.searchInput}
                            placeholder="Search members…"
                            placeholderTextColor="#c8c8c8"
                            value={search}
                            onChangeText={setSearch}
                            autoFocus
                            returnKeyType="search"
                        />
                        {search.length > 0 && (
                            <Pressable onPress={() => setSearch('')} hitSlop={8}>
                                <Ionicons name="close-circle" size={16} color="#ccc" />
                            </Pressable>
                        )}
                    </View>
                    {loading ? (
                        <ActivityIndicator size="small" color="#111" style={{ marginTop: 32 }} />
                    ) : (
                        <FlatList
                            data={filtered}
                            keyExtractor={m => String(m.id)}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => {
                                const name = memberDisplayName(item)
                                const hue  = memberHue(item.id)
                                return (
                                    <Pressable
                                        style={pm.row}
                                        onPress={() => { onSelect(item); onClose() }}
                                        android_ripple={{ color: '#f3f4f6' }}
                                    >
                                        <View style={[pm.avatar, { backgroundColor: `hsl(${hue},55%,55%)` }]}>
                                            <Text style={pm.avatarText}>{memberInitials(name)}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={pm.rowName} numberOfLines={1}>{name}</Text>
                                            {item.roles[0] && (
                                                <Text style={pm.rowSub}>{item.roles[0].label}</Text>
                                            )}
                                        </View>
                                        <Ionicons name="chevron-forward" size={14} color="#ddd" />
                                    </Pressable>
                                )
                            }}
                            ListEmptyComponent={
                                <Text style={pm.empty}>{search ? 'No members match your search' : 'No members found'}</Text>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    )
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CreateWorkOrderScreen() {
    const insets    = useSafeAreaInsets()
    const canAssign = useAuthStore(st => st.user?.permissions?.includes('work_orders.assign') ?? false)
    const SECTIONS: Section[] = [
        'title', 'priority', 'asset', 'datetime',
        ...(canAssign ? ['assignee' as Section] : []),
        'description', 'submit',
    ]

    // form state
    const [title,          setTitle]         = useState('')
    const [priority,       setPriority]      = useState<Priority>('medium')
    const [selectedAsset,  setSelectedAsset] = useState<Asset | null>(null)
    const [dueDate,        setDueDate]       = useState<Date | null>(null)
    const [estHours,       setEstHours]      = useState(0)
    const [estMins,        setEstMins]       = useState(0)
    const [selectedMember, setSelectedMember]= useState<Member | null>(null)
    const [description,    setDescription]   = useState('')
    const [submitting,     setSubmitting]    = useState(false)
    const [error,          setError]         = useState<string | null>(null)

    // picker visibility
    const [assetModal,      setAssetModal]     = useState(false)
    const [memberModal,     setMemberModal]    = useState(false)
    const [showDatePicker,  setShowDatePicker] = useState(false)
    const [showDuration,    setShowDuration]   = useState(false)

    // keyboard lift
    const [kbHeight, setKbHeight] = useState(0)
    useEffect(() => {
        const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
        const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
        const onShow = Keyboard.addListener(show, e => setKbHeight(e.endCoordinates.height))
        const onHide = Keyboard.addListener(hide, () => setKbHeight(0))
        return () => { onShow.remove(); onHide.remove() }
    }, [])

    const handleSubmit = useCallback(async () => {
        setError(null)
        if (!title.trim())   { setError('Title is required.'); return }
        if (!selectedAsset)  { setError('Asset is required.'); return }

        const est = estHours * 60 + estMins
        setSubmitting(true)
        try {
            await apiCreateWorkOrder({
                title:              title.trim(),
                priority,
                asset_id:           selectedAsset.id,
                due_at:             dueDate ? dueDate.toISOString().slice(0, 10) : null,
                estimated_minutes:  est > 0 ? est : null,
                assigned_member_id: canAssign ? (selectedMember?.id ?? null) : null,
                description:        description.trim() || null,
            })
            router.back()
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Failed to create work order.')
            setSubmitting(false)
        }
    }, [title, priority, selectedAsset, dueDate, estHours, estMins, selectedMember, description, canAssign])

    // ── section renderer ──────────────────────────────────────────────────────

    const renderSection = useCallback((section: Section) => {
        switch (section) {

            case 'title':
                return (
                    <View style={s.card}>
                        <Text style={s.label}>TITLE <Text style={s.req}>*</Text></Text>
                        <TextInput
                            style={s.input}
                            placeholder="Enter work order title…"
                            placeholderTextColor="#c8c8c8"
                            value={title}
                            onChangeText={v => { setTitle(v); setError(null) }}
                            returnKeyType="next"
                            autoCorrect={false}
                        />
                    </View>
                )

            case 'priority':
                return (
                    <View style={s.card}>
                        <Text style={s.label}>PRIORITY</Text>
                        <View style={s.chips}>
                            {PRIORITIES.map(p => {
                                const active = priority === p.key
                                return (
                                    <TouchableOpacity
                                        key={p.key}
                                        style={[s.chip, { borderColor: p.color }, active && { backgroundColor: p.color }]}
                                        onPress={() => setPriority(p.key)}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[s.chipText, { color: active ? '#fff' : p.color }]}>
                                            {p.label}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </View>
                )

            case 'asset':
                return (
                    <View style={s.card}>
                        <Text style={s.label}>ASSET <Text style={s.req}>*</Text></Text>
                        {selectedAsset ? (
                            <View style={s.selectedRow}>
                                <View style={s.selectedIcon}>
                                    <Ionicons name="cube-outline" size={16} color="#6b7280" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.selectedName} numberOfLines={1}>{selectedAsset.name}</Text>
                                    <Text style={s.selectedSub} numberOfLines={1}>
                                        {selectedAsset.code}{selectedAsset.location ? ` · ${selectedAsset.location}` : ''}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedAsset(null)} hitSlop={10} activeOpacity={0.7}>
                                    <Ionicons name="close-circle" size={20} color="#ccc" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={s.pickerBtn} onPress={() => setAssetModal(true)} activeOpacity={0.75}>
                                <Ionicons name="cube-outline" size={16} color="#bbb" />
                                <Text style={s.pickerBtnText}>Select asset…</Text>
                                <Ionicons name="chevron-forward" size={14} color="#ccc" />
                            </TouchableOpacity>
                        )}
                    </View>
                )

            case 'datetime':
                return (
                    <View style={s.rowCards}>
                        {/* Due Date */}
                        <View style={[s.card, s.halfCard]}>
                            <Text style={s.label}>DUE DATE</Text>
                            {dueDate ? (
                                <View style={s.selectedRow}>
                                    <Ionicons name="calendar-outline" size={15} color="#2563eb" />
                                    <Text style={[s.selectedName, { flex: 1, fontSize: 13 }]} numberOfLines={1}>
                                        {formatDate(dueDate)}
                                    </Text>
                                    <TouchableOpacity onPress={() => setDueDate(null)} hitSlop={10} activeOpacity={0.7}>
                                        <Ionicons name="close-circle" size={18} color="#ccc" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.75}>
                                    <Ionicons name="calendar-outline" size={15} color="#bbb" />
                                    <Text style={s.pickerBtnText}>Pick date…</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Est. Time */}
                        <View style={[s.card, s.halfCard]}>
                            <Text style={s.label}>EST. TIME</Text>
                            {estHours > 0 || estMins > 0 ? (
                                <View style={s.selectedRow}>
                                    <Ionicons name="time-outline" size={15} color="#2563eb" />
                                    <Text style={[s.selectedName, { flex: 1, fontSize: 13 }]}>
                                        {formatDuration(estHours, estMins)}
                                    </Text>
                                    <TouchableOpacity onPress={() => { setEstHours(0); setEstMins(0) }} hitSlop={10} activeOpacity={0.7}>
                                        <Ionicons name="close-circle" size={18} color="#ccc" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDuration(true)} activeOpacity={0.75}>
                                    <Ionicons name="time-outline" size={15} color="#bbb" />
                                    <Text style={s.pickerBtnText}>Set time…</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )

            case 'assignee':
                return (
                    <View style={s.card}>
                        <Text style={s.label}>ASSIGN TO</Text>
                        {selectedMember ? (
                            <View style={s.selectedRow}>
                                {(() => {
                                    const name = memberDisplayName(selectedMember)
                                    const hue  = memberHue(selectedMember.id)
                                    return (
                                        <>
                                            <View style={[s.avatar, { backgroundColor: `hsl(${hue},55%,55%)` }]}>
                                                <Text style={s.avatarText}>{memberInitials(name)}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.selectedName} numberOfLines={1}>{name}</Text>
                                                {selectedMember.roles[0] && (
                                                    <Text style={s.selectedSub}>{selectedMember.roles[0].label}</Text>
                                                )}
                                            </View>
                                        </>
                                    )
                                })()}
                                <TouchableOpacity onPress={() => setSelectedMember(null)} hitSlop={10} activeOpacity={0.7}>
                                    <Ionicons name="close-circle" size={20} color="#ccc" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={s.pickerBtn} onPress={() => setMemberModal(true)} activeOpacity={0.75}>
                                <Ionicons name="person-outline" size={16} color="#bbb" />
                                <Text style={s.pickerBtnText}>Assign a member…</Text>
                                <Ionicons name="chevron-forward" size={14} color="#ccc" />
                            </TouchableOpacity>
                        )}
                    </View>
                )

            case 'description':
                return (
                    <View style={s.card}>
                        <Text style={s.label}>DESCRIPTION</Text>
                        <TextInput
                            style={[s.input, s.textarea]}
                            placeholder="Add details about this work order…"
                            placeholderTextColor="#c8c8c8"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                        />
                    </View>
                )

            case 'submit':
                return (
                    <TouchableOpacity
                        style={[s.submitBtn, submitting && s.submitBtnDisabled]}
                        onPress={handleSubmit}
                        activeOpacity={0.85}
                        disabled={submitting}
                    >
                        {submitting
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <>
                                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                <Text style={s.submitBtnText}>Save Work Order</Text>
                              </>
                        }
                    </TouchableOpacity>
                )

            default:
                return null
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, priority, selectedAsset, dueDate, estHours, estMins, selectedMember, description, submitting])

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            {/* ── Header ── */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color="#111" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>New Work Order</Text>
            </View>

            {/* ── Error banner ── */}
            {error && (
                <View style={s.errorBar}>
                    <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                    <Text style={s.errorText}>{error}</Text>
                </View>
            )}

            {/* ── Form ── */}
            <FlatList
                data={SECTIONS}
                keyExtractor={item => item}
                renderItem={({ item }) => renderSection(item)}
                extraData={[title, priority, selectedAsset, dueDate, estHours, estMins, selectedMember, description, submitting]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={false}
                contentContainerStyle={[s.listContent, { paddingBottom: kbHeight + insets.bottom + 16 }]}
            />

            {/* ── Pickers ── */}
            <DatePickerModal
                visible={showDatePicker}
                value={dueDate}
                onClose={() => setShowDatePicker(false)}
                onConfirm={setDueDate}
            />
            <DurationPickerModal
                visible={showDuration}
                hours={estHours}
                minutes={estMins}
                onClose={() => setShowDuration(false)}
                onConfirm={(h, m) => { setEstHours(h); setEstMins(m) }}
            />
            <AssetPickerModal
                visible={assetModal}
                onClose={() => setAssetModal(false)}
                onSelect={setSelectedAsset}
            />
            <MemberPickerModal
                visible={memberModal}
                onClose={() => setMemberModal(false)}
                onSelect={setSelectedMember}
            />
        </SafeAreaView>
    )
}

// ── Date Picker styles ────────────────────────────────────────────────────────

const CELL_SIZE = 42

const dp = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 20, paddingTop: 12,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 20,
    },
    navRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
    },
    navBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#f4f6f8', alignItems: 'center', justifyContent: 'center',
    },
    navTitle: { fontSize: 16, fontWeight: '800', color: '#111' },

    dayRow: { flexDirection: 'row', marginBottom: 8 },
    dayHdr: { width: CELL_SIZE, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#bbb' },

    grid:    { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
    cell: {
        width: CELL_SIZE, height: CELL_SIZE,
        alignItems: 'center', justifyContent: 'center',
        borderRadius: CELL_SIZE / 2,
    },
    cellSel:   { backgroundColor: '#111' },
    cellToday: { backgroundColor: '#f0f0f0' },
    cellPast:  { opacity: 0.3 },
    cellTxt:        { fontSize: 14, fontWeight: '500', color: '#333' },
    cellTxtSel:     { color: '#fff', fontWeight: '700' },
    cellTxtToday:   { fontWeight: '700', color: '#111' },
    cellTxtPast:    { color: '#aaa' },

    actions: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        backgroundColor: '#f4f6f8', alignItems: 'center',
    },
    cancelTxt:  { fontSize: 15, fontWeight: '600', color: '#555' },
    confirmBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        backgroundColor: '#111', alignItems: 'center',
    },
    confirmTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
})

// ── Duration Picker styles ────────────────────────────────────────────────────

const dur = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 12,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 20,
    },
    title: { fontSize: 17, fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: 24 },

    steppers: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8, marginBottom: 16,
    },
    col: { alignItems: 'center', gap: 6 },
    colLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.5 },
    stepBtn: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: '#f4f6f8', alignItems: 'center', justifyContent: 'center',
    },
    valBox: {
        width: 80, height: 64, borderRadius: 16,
        backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
    },
    valTxt: { fontSize: 30, fontWeight: '800', color: '#fff' },
    colon:  { fontSize: 32, fontWeight: '800', color: '#ccc', marginTop: 28 },

    preview: {
        textAlign: 'center', fontSize: 15, fontWeight: '600',
        color: '#888', marginBottom: 24,
    },

    actions: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        backgroundColor: '#f4f6f8', alignItems: 'center',
    },
    cancelTxt:  { fontSize: 15, fontWeight: '600', color: '#555' },
    confirmBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        backgroundColor: '#111', alignItems: 'center',
    },
    confirmTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
})

// ── Picker list styles ────────────────────────────────────────────────────────

const pm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 20, paddingTop: 12,
        maxHeight: '80%',
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 14,
    },
    title:    { fontSize: 17, fontWeight: '800', color: '#111' },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
    },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#f4f6f8', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#111', fontWeight: '500', padding: 0 },
    row: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: 4,
        borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
    },
    rowIcon: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#f4f6f8', alignItems: 'center', justifyContent: 'center',
    },
    rowName: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 2 },
    rowSub:  { fontSize: 12, color: '#aaa', fontWeight: '500' },
    avatar: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    empty: {
        textAlign: 'center', color: '#bbb',
        fontSize: 14, marginTop: 40, fontWeight: '500',
    },
})

// ── Form styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f4f6f8' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
        gap: 10,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: '#f4f6f8', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#111' },

    errorBar: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#fef2f2', borderBottomWidth: 1, borderBottomColor: '#fecaca',
        paddingHorizontal: 16, paddingVertical: 10,
    },
    errorText: { fontSize: 13, color: '#dc2626', fontWeight: '500', flex: 1 },

    listContent: { padding: 16 },

    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        shadowColor: '#101828', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
        borderWidth: 1, borderColor: '#f0f0f2',
        marginBottom: 12,
    },
    label: { fontSize: 10, fontWeight: '700', color: '#aaa', letterSpacing: 0.8, marginBottom: 10 },
    req:   { color: '#ef4444' },
    input: { fontSize: 15, color: '#111', fontWeight: '500', paddingVertical: 0 },
    textarea: { minHeight: 110, lineHeight: 22 },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5,
    },
    chipText: { fontSize: 13, fontWeight: '700' },

    pickerBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#f9f9f9', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 12,
        borderWidth: 1, borderColor: '#f0f0f0',
    },
    pickerBtnText: { flex: 1, fontSize: 13, color: '#bbb', fontWeight: '500' },

    selectedRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#f9f9f9', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 10,
        borderWidth: 1, borderColor: '#f0f0f0',
    },
    selectedIcon: {
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
    },
    selectedName: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 1 },
    selectedSub:  { fontSize: 12, color: '#aaa', fontWeight: '500' },

    avatar: {
        width: 34, height: 34, borderRadius: 17,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },

    rowCards: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    halfCard: { flex: 1, marginBottom: 0 },

    submitBtn: {
        backgroundColor: '#111', borderRadius: 16,
        paddingVertical: 16, marginBottom: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14, shadowRadius: 6, elevation: 4,
    },
    submitBtnDisabled: { opacity: 0.55 },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
