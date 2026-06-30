import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    ActivityIndicator, Pressable, Animated, TextInput,
    Alert, TouchableOpacity as RNTouchable, Modal,
    KeyboardAvoidingView, Platform,
} from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
    apiGetCalendar, apiCreateCalendarEvent, apiUpdateCalendarEvent,
    apiDeleteCalendarEvent, type CalendarEvent,
} from '@/services/CalendarService'
import { useAuthStore } from '@/store/authStore'

// ── constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
]

const EVENT_COLORS: Record<string, string> = {
    blue:   '#2563eb', green:  '#059669', red:    '#dc2626',
    yellow: '#d97706', purple: '#7c3aed', cyan:   '#0891b2',
    pink:   '#db2777',
}

const PRIORITY_COLORS: Record<string, string> = {
    low: '#9ca3af', medium: '#2563eb', high: '#d97706', critical: '#dc2626',
}

const COLOR_OPTIONS = Object.keys(EVENT_COLORS)

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDate(iso: string | null): Date | null {
    if (!iso) return null
    const d = new Date(iso)
    return isNaN(d.getTime()) ? null : d
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (Date | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
    while (days.length % 7 !== 0) days.push(null)
    return days
}

function getEventColor(ev: CalendarEvent): string {
    if (ev.type === 'work_order') return PRIORITY_COLORS[ev.priority ?? 'medium'] ?? '#d97706'
    return EVENT_COLORS[ev.color ?? 'blue'] ?? '#2563eb'
}

function formatFullDate(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CalendarScreen() {
    const insets = useSafeAreaInsets()

    const today      = new Date()
    const [year,     setYear]     = useState(today.getFullYear())
    const [month,    setMonth]    = useState(today.getMonth())
    const [selected, setSelected] = useState<string>(toDateKey(today))
    const [events,   setEvents]   = useState<CalendarEvent[]>([])
    const [loading,  setLoading]  = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    // event sheet
    const [newOpen,    setNewOpen]    = useState(false)
    const [editEvent,  setEditEvent]  = useState<CalendarEvent | null>(null)
    const [newTitle,   setNewTitle]   = useState('')
    const [newColor,   setNewColor]   = useState('blue')
    const [submitting, setSubmitting] = useState(false)
    const newSlide    = useRef(new Animated.Value(700)).current
    const newBackdrop = useRef(new Animated.Value(0)).current

    // delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)
    const [deleting,     setDeleting]     = useState(false)

    const openNew = useCallback(() => {
        newSlide.setValue(700)
        newBackdrop.setValue(0)
        setEditEvent(null)
        setNewTitle('')
        setNewColor('blue')
        setNewOpen(true)
    }, [newSlide, newBackdrop])

    const openEdit = useCallback((ev: CalendarEvent) => {
        newSlide.setValue(700)
        newBackdrop.setValue(0)
        setEditEvent(ev)
        setNewTitle(ev.title)
        setNewColor(ev.color ?? 'blue')
        setNewOpen(true)
    }, [newSlide, newBackdrop])

    const closeNew = useCallback(() => {
        Animated.parallel([
            Animated.timing(newSlide,    { toValue: 700, duration: 220, useNativeDriver: true }),
            Animated.timing(newBackdrop, { toValue: 0,   duration: 180, useNativeDriver: true }),
        ]).start(() => setNewOpen(false))
    }, [newSlide, newBackdrop])

    // ── load ──────────────────────────────────────────────────────────────────
    const load = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true)
        try {
            const res = await apiGetCalendar()
            const all = [...(res.data?.data?.custom_events ?? []), ...(res.data?.data?.wo_events ?? [])]
            setEvents(all)
        } catch {
            setEvents([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { load(true) }, [load])

    const onRefresh = useCallback(() => { setRefreshing(true); load() }, [load])

    // ── navigation ────────────────────────────────────────────────────────────
    const prevMonth = useCallback(() => {
        if (month === 0) { setYear(y => y - 1); setMonth(11) }
        else setMonth(m => m - 1)
    }, [month])

    const nextMonth = useCallback(() => {
        if (month === 11) { setYear(y => y + 1); setMonth(0) }
        else setMonth(m => m + 1)
    }, [month])

    // ── events by date ────────────────────────────────────────────────────────
    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {}
        for (const ev of events) {
            const d = parseDate(ev.start_at)
            if (!d) continue
            const key = toDateKey(d)
            if (!map[key]) map[key] = []
            map[key].push(ev)
        }
        return map
    }, [events])

    const selectedEvents = useMemo(() => eventsByDate[selected] ?? [], [eventsByDate, selected])
    const calDays        = useMemo(() => getCalendarDays(year, month), [year, month])
    const todayKey       = toDateKey(today)

    // ── submit (create or update) ─────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!newTitle.trim()) { Alert.alert('Enter a title'); return }
        setSubmitting(true)
        try {
            if (editEvent) {
                await apiUpdateCalendarEvent(editEvent.db_id, {
                    title: newTitle.trim(),
                    color: newColor,
                    start_at: selected,
                })
            } else {
                await apiCreateCalendarEvent({ title: newTitle.trim(), start_at: selected, color: newColor })
            }
            closeNew()
            load()
        } catch {
            Alert.alert('Error', editEvent ? 'Failed to update event.' : 'Failed to create event.')
        } finally {
            setSubmitting(false)
        }
    }, [newTitle, newColor, selected, editEvent, closeNew, load])

    // ── delete ────────────────────────────────────────────────────────────────
    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await apiDeleteCalendarEvent(deleteTarget.db_id)
            setDeleteTarget(null)
            closeNew()
            load()
        } catch {
            Alert.alert('Error', 'Failed to delete event.')
        } finally {
            setDeleting(false)
        }
    }, [deleteTarget, closeNew, load])

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            {/* Header */}
            <View style={s.header}>
                <Text style={s.headerTitle}>Calendar</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111" />}
            >
                {/* Month navigation */}
                <View style={s.monthNav}>
                    <TouchableOpacity style={s.navBtn} onPress={prevMonth} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={20} color="#111" />
                    </TouchableOpacity>
                    <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
                    <TouchableOpacity style={s.navBtn} onPress={nextMonth} activeOpacity={0.7}>
                        <Ionicons name="chevron-forward" size={20} color="#111" />
                    </TouchableOpacity>
                </View>

                {/* Day headers */}
                <View style={s.dayHeaders}>
                    {DAYS.map(d => (
                        <Text key={d} style={s.dayHeader}>{d}</Text>
                    ))}
                </View>

                {/* Calendar grid */}
                {loading ? (
                    <ActivityIndicator size="large" color="#111" style={{ marginTop: 40 }} />
                ) : (
                    <View style={s.grid}>
                        {calDays.map((date, idx) => {
                            if (!date) return <View key={`blank-${idx}`} style={s.dayCell} />
                            const key     = toDateKey(date)
                            const isToday = key === todayKey
                            const isSel   = key === selected
                            const dayEvs  = eventsByDate[key] ?? []

                            return (
                                <RNTouchable
                                    key={key}
                                    style={[s.dayCell, isSel && s.dayCellSel, isToday && !isSel && s.dayCellToday]}
                                    onPress={() => setSelected(key)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[s.dayNum, isSel && s.dayNumSel, isToday && !isSel && s.dayNumToday]}>
                                        {date.getDate()}
                                    </Text>
                                    {dayEvs.length > 0 && (
                                        <View style={s.dots}>
                                            {dayEvs.slice(0, 3).map((ev, i) => (
                                                <View key={i} style={[s.dot, { backgroundColor: isSel ? '#fff' : getEventColor(ev) }]} />
                                            ))}
                                            {dayEvs.length > 3 && (
                                                <Text style={[s.moreDots, isSel && { color: '#fff' }]}>+{dayEvs.length - 3}</Text>
                                            )}
                                        </View>
                                    )}
                                </RNTouchable>
                            )
                        })}
                    </View>
                )}

                {/* Selected day panel */}
                <View style={s.dayPanel}>
                    <View style={s.dayPanelHeader}>
                        <Text style={s.dayPanelTitle}>
                            {formatFullDate(new Date(selected + 'T00:00:00'))}
                        </Text>
                        <Pressable onPress={openNew} style={s.addEventBtn} hitSlop={8}>
                            <Ionicons name="add" size={16} color="#fff" />
                            <Text style={s.addEventText}>Add Event</Text>
                        </Pressable>
                    </View>

                    {selectedEvents.length === 0 ? (
                        <View style={s.dayEmpty}>
                            <Text style={s.dayEmptyText}>No events on this day</Text>
                        </View>
                    ) : (
                        selectedEvents.map(ev => (
                            <View key={ev.id} style={[s.eventRow, { borderLeftColor: getEventColor(ev) }]}>
                                <View style={s.eventInfo}>
                                    <View style={s.eventTypeBadge}>
                                        <Ionicons
                                            name={ev.type === 'work_order' ? 'construct-outline' : 'calendar-outline'}
                                            size={11}
                                            color={getEventColor(ev)}
                                        />
                                        <Text style={[s.eventTypeTxt, { color: getEventColor(ev) }]}>
                                            {ev.type === 'work_order' ? 'Work Order' : 'Event'}
                                        </Text>
                                    </View>
                                    <Text style={s.eventTitle}>{ev.title}</Text>
                                    {ev.type === 'work_order' && ev.priority && (
                                        <Text style={s.eventMeta}>Priority: {ev.priority}</Text>
                                    )}
                                </View>
                                {ev.type === 'work_order' ? (
                                    <TouchableOpacity
                                        style={s.eventAction}
                                        onPress={() => router.push(`/app/work-orders/${ev.db_id}` as never)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="arrow-forward-circle-outline" size={20} color="#0ea5e9" />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={s.eventAction} onPress={() => openEdit(ev)} activeOpacity={0.7}>
                                        <Ionicons name="create-outline" size={19} color="#6b7280" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))
                    )}
                </View>

                {/* Legend */}
                <View style={s.legend}>
                    <View style={s.legendRow}>
                        <View style={[s.legendDot, { backgroundColor: '#d97706' }]} />
                        <Text style={s.legendText}>Work Order due date</Text>
                    </View>
                    <View style={s.legendRow}>
                        <View style={[s.legendDot, { backgroundColor: '#0ea5e9' }]} />
                        <Text style={s.legendText}>Custom event</Text>
                    </View>
                </View>

            </ScrollView>

            {/* ── EVENT SHEET (create / edit) ── */}
            <Modal
                visible={newOpen}
                transparent
                statusBarTranslucent
                animationType="none"
                onRequestClose={closeNew}
                onShow={() => {
                    Animated.parallel([
                        Animated.spring(newSlide,    { toValue: 0, bounciness: 0, speed: 20, useNativeDriver: true }),
                        Animated.timing(newBackdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
                    ]).start()
                }}
            >
                <View style={{ flex: 1 }}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, s.backdrop, { opacity: newBackdrop }]}>
                        <Pressable style={StyleSheet.absoluteFillObject} onPress={closeNew} />
                    </Animated.View>

                    <KeyboardAvoidingView
                        style={{ flex: 1, justifyContent: 'flex-end' }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={0}
                    >
                        <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: newSlide }] }]}>
                            <View style={s.handle} />
                            <View style={s.sheetTitleRow}>
                                <Text style={s.sheetTitle}>{editEvent ? 'Edit Event' : 'New Event'}</Text>
                                <Pressable style={s.closeBtn} onPress={closeNew} hitSlop={10}>
                                    <Ionicons name="close" size={18} color="#555" />
                                </Pressable>
                            </View>

                            <Text style={s.sheetDate}>
                                {formatFullDate(new Date(selected + 'T00:00:00'))}
                            </Text>

                            <Text style={[s.label, { marginTop: 16 }]}>
                                Event Title <Text style={{ color: '#ef4444' }}>*</Text>
                            </Text>
                            <TextInput
                                style={s.textInput}
                                placeholder="e.g. Team meeting, PM visit…"
                                placeholderTextColor="#ccc"
                                value={newTitle}
                                onChangeText={setNewTitle}
                            />

                            <Text style={[s.label, { marginTop: 16 }]}>Color</Text>
                            <View style={s.colorRow}>
                                {COLOR_OPTIONS.map(c => (
                                    <Pressable
                                        key={c}
                                        style={[s.colorDot, { backgroundColor: EVENT_COLORS[c] }, newColor === c && s.colorDotSel]}
                                        onPress={() => setNewColor(c)}
                                    />
                                ))}
                            </View>

                            <Pressable
                                style={({ pressed }) => [s.submitBtn, submitting && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <>
                                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                        <Text style={s.submitText}>
                                            {editEvent ? 'Save Changes' : 'Save Event'}
                                        </Text>
                                      </>
                                }
                            </Pressable>

                            {editEvent && (
                                <Pressable
                                    style={({ pressed }) => [s.sheetDeleteBtn, pressed && { opacity: 0.7 }]}
                                    onPress={() => setDeleteTarget(editEvent)}
                                >
                                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                                    <Text style={s.sheetDeleteText}>Delete Event</Text>
                                </Pressable>
                            )}
                        </Animated.View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* ── DELETE CONFIRMATION MODAL ── */}
            <Modal
                visible={!!deleteTarget}
                transparent
                statusBarTranslucent
                animationType="fade"
                onRequestClose={() => setDeleteTarget(null)}
            >
                <View style={s.deleteOverlay}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setDeleteTarget(null)} />
                    <View style={s.deleteCard}>
                        <View style={s.deleteIconWrap}>
                            <Ionicons name="trash-outline" size={30} color="#ef4444" />
                        </View>
                        <Text style={s.deleteModalTitle}>Delete Event</Text>
                        <Text style={s.deleteModalName} numberOfLines={2}>
                            "{deleteTarget?.title}"
                        </Text>
                        <Text style={s.deleteModalDesc}>This action cannot be undone.</Text>
                        <View style={s.deleteModalBtns}>
                            <Pressable
                                style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.7 }]}
                                onPress={() => setDeleteTarget(null)}
                            >
                                <Text style={s.cancelBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={({ pressed }) => [s.confirmDeleteBtn, deleting && { opacity: 0.6 }, pressed && { opacity: 0.8 }]}
                                onPress={confirmDelete}
                                disabled={deleting}
                            >
                                {deleting
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <>
                                        <Ionicons name="trash-outline" size={14} color="#fff" />
                                        <Text style={s.confirmDeleteText}>Delete</Text>
                                      </>
                                }
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

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

    /* Month nav */
    monthNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff',
    },
    navBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ebebeb' },
    monthLabel: { fontSize: 17, fontWeight: '800', color: '#111' },

    /* Day headers */
    dayHeaders: { flexDirection: 'row', paddingHorizontal: 14, backgroundColor: '#fff', paddingBottom: 6 },
    dayHeader:  { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#bbb', letterSpacing: 0.5 },

    /* Grid */
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingBottom: 10, backgroundColor: '#fff' },
    dayCell: { width: '14.28%', aspectRatio: 0.85, padding: 4, alignItems: 'center', borderRadius: 10 },
    dayCellSel:   { backgroundColor: '#0ea5e9' },
    dayCellToday: { backgroundColor: '#e0f2fe' },
    dayNum:       { fontSize: 14, fontWeight: '600', color: '#111' },
    dayNumSel:    { color: '#fff', fontWeight: '800' },
    dayNumToday:  { color: '#0ea5e9', fontWeight: '800' },
    dots:     { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    dot:      { width: 5, height: 5, borderRadius: 3 },
    moreDots: { fontSize: 8, fontWeight: '700', color: '#aaa' },

    /* Day panel */
    dayPanel:       { backgroundColor: '#fff', marginTop: 8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
    dayPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    dayPanelTitle:  { fontSize: 13, fontWeight: '700', color: '#111', flex: 1 },
    addEventBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
    addEventText:   { fontSize: 12, fontWeight: '700', color: '#fff' },
    dayEmpty:       { alignItems: 'center', paddingVertical: 24 },
    dayEmptyText:   { fontSize: 14, color: '#bbb' },

    eventRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fafafa', borderRadius: 12,
        borderLeftWidth: 4, paddingLeft: 12, paddingRight: 10, paddingVertical: 10,
        marginBottom: 8,
    },
    eventInfo:      { flex: 1 },
    eventTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    eventTypeTxt:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    eventTitle:     { fontSize: 14, fontWeight: '700', color: '#111' },
    eventMeta:      { fontSize: 11, color: '#aaa', marginTop: 2 },
    eventAction:    { padding: 4 },

    /* Legend */
    legend:     { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
    legendRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot:  { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: '#aaa' },

    /* Sheet */
    backdrop: { backgroundColor: 'rgba(0,0,0,0.52)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 14, maxHeight: '90%',
    },
    handle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16 },
    sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    sheetTitle:    { fontSize: 18, fontWeight: '800', color: '#111' },
    closeBtn:      { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ebebeb' },
    sheetDate:     { fontSize: 13, color: '#6b7280', fontWeight: '500', marginBottom: 4 },
    label:         { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.8, marginBottom: 8 },
    textInput:     { borderWidth: 1, borderColor: '#ebebeb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111', backgroundColor: '#fafafa' },
    colorRow:      { flexDirection: 'row', gap: 10, marginBottom: 4 },
    colorDot:      { width: 30, height: 30, borderRadius: 15 },
    colorDotSel:   { borderWidth: 3, borderColor: '#111' },

    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 54, borderRadius: 14, backgroundColor: '#111', marginTop: 24,
    },
    submitText: { fontSize: 15, fontWeight: '800', color: '#fff' },

    sheetDeleteBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        height: 46, borderRadius: 12, marginTop: 10,
        borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fff5f5',
    },
    sheetDeleteText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },

    /* Delete confirmation modal */
    deleteOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center', justifyContent: 'center', padding: 28,
    },
    deleteCard: {
        backgroundColor: '#fff', borderRadius: 24, padding: 28,
        alignItems: 'center', width: '100%', maxWidth: 340,
    },
    deleteIconWrap: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    deleteModalTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 6 },
    deleteModalName:  { fontSize: 14, fontWeight: '600', color: '#6b7280', textAlign: 'center', marginBottom: 6, paddingHorizontal: 8 },
    deleteModalDesc:  { fontSize: 12, color: '#9ca3af', marginBottom: 26 },
    deleteModalBtns:  { flexDirection: 'row', gap: 12, width: '100%' },
    cancelBtn:        { flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
    cancelBtnText:    { fontSize: 15, fontWeight: '700', color: '#374151' },
    confirmDeleteBtn: {
        flex: 1, height: 50, borderRadius: 14, backgroundColor: '#ef4444',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
    },
    confirmDeleteText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
