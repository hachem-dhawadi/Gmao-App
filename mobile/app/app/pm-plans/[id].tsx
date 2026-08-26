import { useEffect, useState, useCallback } from 'react'
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, StatusColors } from '@/constants/colors'
import {
    apiGetPmPlan, apiUpdatePmTasks, apiTriggerNow,
    pmFrequencyLabel, pmIsOverdue,
    type PmPlan,
} from '@/services/PmService'
import AlertModal from '@/components/ui/AlertModal'
import { useAuthStore } from '@/store/authStore'

const FREQ_COLORS: Record<string, string> = {
    Weekly: '#2a85ff', Monthly: '#f59e0b', Quarterly: '#10b981',
    'Bi-Annual': '#8b5cf6', Annual: '#ef4444',
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
    active:   { bg: '#05eb7624', text: '#10b981' },
    inactive: { bg: '#f5f5f5',   text: '#737373' },
    draft:    { bg: '#f5f5f5',   text: '#737373' },
    overdue:  { bg: '#ff6a551a', text: '#ff6a55' },
}

function fmt(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusLabel(s: string) {
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
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

export default function PMPlanDetail() {
    const { id } = useLocalSearchParams<{ id: string }>()

    const userPerms  = useAuthStore(s => s.user?.permissions ?? [])
    const userRoles  = useAuthStore(s => s.user?.roles ?? [])
    const canEdit    = userPerms.includes('pm_plans.write') ||
                       userRoles.some(r => ['admin', 'manager'].includes(r))

    const [plan,       setPlan]       = useState<PmPlan | null>(null)
    const [loading,    setLoading]    = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [modal, setModal] = useState<{
        title: string; message: string; type: 'error' | 'success' | 'info'; onClose?: () => void
    } | null>(null)

    // Checklist
    const [taskInput,  setTaskInput]  = useState('')
    const [addingTask, setAddingTask] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    // Trigger Now
    const [triggering, setTriggering] = useState(false)

    const load = useCallback(async () => {
        try {
            const res = await apiGetPmPlan(id)
            setPlan(res.data.data.pm_plan)
        } catch {
            // silent
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [id])

    useEffect(() => { load() }, [load])

    const onRefresh = () => { setRefreshing(true); load() }

    const handleAddTask = async () => {
        if (!taskInput.trim() || !plan) return
        setAddingTask(true)
        try {
            const newTasks = [
                ...(plan.tasks ?? []).map(t => ({ id: t.id, title: t.title })),
                { title: taskInput.trim() },
            ]
            const res = await apiUpdatePmTasks(id, newTasks)
            setPlan(prev => prev ? { ...prev, tasks: res.data.data.tasks } : prev)
            setTaskInput('')
        } catch {
            setModal({ title: 'Error', message: 'Could not add task.', type: 'error' })
        } finally {
            setAddingTask(false)
        }
    }

    const handleDeleteTask = (taskId: number) => {
        setModal({
            title:   'Remove Task',
            message: 'Remove this task from the checklist?',
            type:    'info',
            onClose: async () => {
                setModal(null)
                setDeletingId(taskId)
                try {
                    const newTasks = (plan?.tasks ?? [])
                        .filter(t => t.id !== taskId)
                        .map(t => ({ id: t.id, title: t.title }))
                    const res = await apiUpdatePmTasks(id, newTasks)
                    setPlan(prev => prev ? { ...prev, tasks: res.data.data.tasks } : prev)
                } catch {
                    setModal({ title: 'Error', message: 'Could not remove task.', type: 'error' })
                } finally {
                    setDeletingId(null)
                }
            },
        })
    }

    const handleTriggerNow = () => {
        setModal({
            title:   'Trigger Now',
            message: 'Generate a work order from this PM plan immediately?',
            type:    'info',
            onClose: async () => {
                setModal(null)
                setTriggering(true)
                try {
                    const res = await apiTriggerNow(id)
                    setPlan(res.data.data.pm_plan)
                    setModal({
                        title:   'Work Order Created',
                        message: `Work order ${res.data.data.work_order.code} has been generated successfully.`,
                        type:    'success',
                    })
                } catch (e: unknown) {
                    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
                        ?? 'Could not generate work order.'
                    setModal({ title: 'Error', message: msg, type: 'error' })
                } finally {
                    setTriggering(false)
                }
            },
        })
    }

    if (loading) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.loadingWrap}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        )
    }

    if (!plan) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.notFound}>
                    <Text style={s.notFoundText}>PM plan not found.</Text>
                    <TouchableOpacity onPress={() => router.back()}><Text style={s.backLink}>Go back</Text></TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const overdue    = pmIsOverdue(plan)
    const effStatus  = overdue && plan.status === 'active' ? 'overdue' : plan.status
    const st         = STATUS_STYLE[effStatus] ?? STATUS_STYLE.inactive
    const freq       = pmFrequencyLabel(plan.trigger)
    const fc         = FREQ_COLORS[freq] ?? Colors.primary
    const estHours   = plan.estimated_minutes ? (plan.estimated_minutes / 60).toFixed(1) + 'h' : '—'
    const woHistory  = (plan.pm_work_orders ?? []).filter(e => e.work_order).reverse()

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            <AlertModal
                visible={!!modal}
                title={modal?.title ?? ''}
                message={modal?.message ?? ''}
                type={modal?.type ?? 'info'}
                btnLabel={modal?.title === 'Trigger Now' || modal?.title === 'Remove Task' ? 'Confirm' : 'OK'}
                onClose={() => { modal?.onClose ? modal.onClose() : setModal(null) }}
            />

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={Colors.gray700} />
                </TouchableOpacity>
                <Text style={s.headerCode}>{plan.code}</Text>
                {canEdit && plan.status === 'active' ? (
                    <TouchableOpacity
                        style={[s.triggerBtn, triggering && { opacity: 0.6 }]}
                        onPress={handleTriggerNow}
                        disabled={triggering}
                        activeOpacity={0.8}
                    >
                        {triggering
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <>
                                <Ionicons name="play" size={13} color="#fff" />
                                <Text style={s.triggerBtnText}>Trigger</Text>
                            </>
                        }
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 72 }} />
                )}
            </View>

            <ScrollView
                style={s.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* Title block */}
                <View style={s.titleBlock}>
                    <View style={s.badgeRow}>
                        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                            <Text style={[s.statusText, { color: st.text }]}>
                                {effStatus.charAt(0).toUpperCase() + effStatus.slice(1)}
                            </Text>
                        </View>
                        {freq !== '—' && (
                            <View style={[s.freqBadge, { backgroundColor: fc + '20' }]}>
                                <Text style={[s.freqText, { color: fc }]}>{freq}</Text>
                            </View>
                        )}
                        <View style={s.priorityBadge}>
                            <Text style={s.priorityText}>{plan.priority.charAt(0).toUpperCase() + plan.priority.slice(1)}</Text>
                        </View>
                    </View>
                    <Text style={s.title}>{plan.name}</Text>
                </View>

                {/* Info card */}
                <View style={s.card}>
                    {plan.asset && (
                        <><InfoRow icon="cube-outline"      label="Asset"        value={plan.asset.name} /><View style={s.div} /></>
                    )}
                    {plan.assigned_to && (
                        <><InfoRow icon="person-outline"    label="Assigned to"  value={plan.assigned_to.name ?? '—'} /><View style={s.div} /></>
                    )}
                    <InfoRow icon="calendar-outline"  label="Next due"     value={fmt(plan.trigger?.next_run_at ?? null)} />
                    <View style={s.div} />
                    <InfoRow icon="time-outline"      label="Last run"     value={fmt(plan.trigger?.last_run_at ?? null)} />
                    {estHours !== '—' && (
                        <><View style={s.div} /><InfoRow icon="hourglass-outline" label="Est. duration" value={estHours} /></>
                    )}
                    {plan.description ? (
                        <>
                            <View style={[s.div, { marginVertical: 14 }]} />
                            <Text style={s.descLabel}>Description</Text>
                            <Text style={s.descText}>{plan.description}</Text>
                        </>
                    ) : null}
                </View>

                {/* Checklist */}
                <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>
                        Checklist{plan.tasks.length > 0 ? ` (${plan.tasks.length})` : ''}
                    </Text>
                </View>
                <View style={s.checklistCard}>
                    {plan.tasks.length === 0 && (
                        <Text style={s.emptyTasks}>No tasks yet. Add one below.</Text>
                    )}
                    {plan.tasks
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((task, i) => (
                            <View
                                key={task.id}
                                style={[s.taskRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.gray100 }]}
                            >
                                <Ionicons name="square-outline" size={18} color={Colors.gray300} />
                                <Text style={s.taskLabel} numberOfLines={2}>{task.title}</Text>
                                {canEdit && (
                                    deletingId === task.id ? (
                                        <ActivityIndicator size="small" color={Colors.gray400} />
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => handleDeleteTask(task.id)}
                                            activeOpacity={0.7}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="close-circle" size={18} color="#ddd" />
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>
                        ))}

                    {/* Add task input — only for users with write permission */}
                    {canEdit && (
                        <View style={s.taskAddRow}>
                            <TextInput
                                style={s.taskAddInput}
                                placeholder="Add a task…"
                                placeholderTextColor="#c8c8c8"
                                value={taskInput}
                                onChangeText={setTaskInput}
                                returnKeyType="done"
                                onSubmitEditing={handleAddTask}
                            />
                            <TouchableOpacity
                                style={[s.taskAddBtn, (!taskInput.trim() || addingTask) && { opacity: 0.4 }]}
                                onPress={handleAddTask}
                                disabled={!taskInput.trim() || addingTask}
                                activeOpacity={0.8}
                            >
                                {addingTask
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Ionicons name="add" size={18} color="#fff" />
                                }
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* WO History */}
                {woHistory.length > 0 && (
                    <>
                        <View style={s.sectionHeader}>
                            <Text style={s.sectionTitle}>Work Order History ({woHistory.length})</Text>
                        </View>
                        <View style={s.woHistoryCard}>
                            {woHistory.map((entry, i) => {
                                const wo = entry.work_order!
                                const sc = StatusColors[wo.status] ?? StatusColors.open
                                return (
                                    <TouchableOpacity
                                        key={entry.id}
                                        style={[s.woHistoryRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.gray100 }]}
                                        onPress={() => router.push(`/app/work-orders/${wo.id}` as never)}
                                        activeOpacity={0.75}
                                    >
                                        <View style={s.woHistoryLeft}>
                                            <Text style={s.woHistoryCode}>{wo.code}</Text>
                                            <Text style={s.woHistoryTitle} numberOfLines={1}>{wo.title}</Text>
                                            <Text style={s.woHistoryDate}>{fmt(wo.created_at)}</Text>
                                        </View>
                                        <View style={s.woHistoryRight}>
                                            <View style={[s.woStatusBadge, { backgroundColor: sc.bg }]}>
                                                <Text style={[s.woStatusText, { color: sc.text }]}>
                                                    {statusLabel(wo.status)}
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={14} color={Colors.gray300} />
                                        </View>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </>
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

    triggerBtn: {
        flexDirection:     'row',
        alignItems:        'center',
        gap:               5,
        backgroundColor:   '#10b981',
        paddingHorizontal: 12,
        paddingVertical:   8,
        borderRadius:      10,
        minWidth:          72,
        justifyContent:    'center',
    },
    triggerBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    titleBlock: { backgroundColor: Colors.white, padding: 16, marginBottom: 12 },
    badgeRow:   { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    statusBadge:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    statusText:    { fontSize: 12, fontWeight: '700' },
    freqBadge:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    freqText:      { fontSize: 12, fontWeight: '700' },
    priorityBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: Colors.gray100 },
    priorityText:  { fontSize: 12, fontWeight: '700', color: Colors.gray600 },
    title:         { fontSize: 20, fontWeight: '800', color: Colors.gray900, lineHeight: 26 },

    card: {
        backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: Colors.gray200, marginBottom: 16,
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

    sectionHeader: { paddingHorizontal: 16, marginBottom: 8 },
    sectionTitle:  { fontSize: 15, fontWeight: '700', color: Colors.gray900 },

    checklistCard: {
        backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.gray200, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
        marginBottom: 16,
    },
    emptyTasks: { fontSize: 13, color: Colors.gray400, fontStyle: 'italic', padding: 14 },
    taskRow:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
    taskLabel:  { flex: 1, fontSize: 14, color: Colors.gray800, lineHeight: 20 },

    taskAddRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 12, paddingVertical: 10,
        borderTopWidth: 1, borderTopColor: Colors.gray100,
    },
    taskAddInput: {
        flex: 1, height: 40, backgroundColor: Colors.gray100, borderRadius: 10,
        paddingHorizontal: 12, fontSize: 14, color: Colors.gray900,
    },
    taskAddBtn: {
        width: 40, height: 40, borderRadius: 10, backgroundColor: '#111',
        alignItems: 'center', justifyContent: 'center',
    },

    /* WO History */
    woHistoryCard: {
        backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.gray200, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
        marginBottom: 16,
    },
    woHistoryRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    },
    woHistoryLeft:  { flex: 1 },
    woHistoryCode:  { fontSize: 11, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
    woHistoryTitle: { fontSize: 14, fontWeight: '600', color: Colors.gray900, marginBottom: 3 },
    woHistoryDate:  { fontSize: 12, color: Colors.gray400 },
    woHistoryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    woStatusBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    woStatusText:   { fontSize: 11, fontWeight: '700' },

    notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    notFoundText: { fontSize: 16, color: Colors.gray600 },
    backLink:     { fontSize: 14, color: Colors.primary, fontWeight: '600' },
})
