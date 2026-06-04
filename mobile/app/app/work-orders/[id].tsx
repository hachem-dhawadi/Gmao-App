import { useState, useEffect, useCallback } from 'react'
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, RefreshControl, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { StatusColors, PriorityColors } from '@/constants/colors'
import {
    apiGetWorkOrder, apiUpdateWorkOrder, apiAddWorkOrderComment,
    apiToggleChecklistItem, apiAddWorkLog, apiUpdateWorkLog, apiDeleteWorkLog,
    type WorkOrder, type WorkLog,
} from '@/services/WorkOrdersService'
import AlertModal from '@/components/ui/AlertModal'

const STATUS_ACTIONS: Record<string, { label: string; next: string; bg: string }[]> = {
    open:        [{ label: 'Start Work',  next: 'in_progress', bg: '#111'     }],
    in_progress: [{ label: 'Put On Hold', next: 'on_hold',     bg: '#f59e0b' }, { label: 'Complete', next: 'completed', bg: '#10b981' }],
    on_hold:     [{ label: 'Resume',      next: 'in_progress', bg: '#111'     }],
    completed:   [],
    cancelled:   [],
}

const CAN_LOG_STATUSES = ['in_progress', 'completed']

function formatMinutes(mins: number): string {
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function relativeTime(dateStr: string | null): string {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1)   return 'just now'
    if (mins < 60)  return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
}

function statusLabel(s: string) {
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function isOverdue(wo: WorkOrder): boolean {
    if (!wo.due_at) return false
    if (wo.status === 'completed' || wo.status === 'cancelled') return false
    return new Date(wo.due_at) < new Date()
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={s.infoRow}>
            <View style={s.infoIconWrap}>
                <Ionicons name={icon as never} size={16} color="#555" />
            </View>
            <View style={s.infoTexts}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoValue}>{value}</Text>
            </View>
        </View>
    )
}

export default function WorkOrderDetail() {
    const { id } = useLocalSearchParams<{ id: string }>()

    const [wo,          setWo]          = useState<WorkOrder | null>(null)
    const [loading,     setLoading]     = useState(true)
    const [refreshing,  setRefreshing]  = useState(false)
    const [activeTab,   setActiveTab]   = useState<'details' | 'comments' | 'work-logs' | 'attachments'>('details')
    const [commentText, setCommentText] = useState('')
    const [submitting,  setSubmitting]  = useState(false)
    const [modal, setModal] = useState<{
        title: string; message: string; type: 'error' | 'success' | 'info'; onClose?: () => void
    } | null>(null)

    // Work logs
    const [workLogs,        setWorkLogs]        = useState<WorkLog[]>([])
    const [logModalVisible, setLogModalVisible] = useState(false)
    const [editingLog,      setEditingLog]      = useState<WorkLog | null>(null)
    const [logMinutes,      setLogMinutes]      = useState('')
    const [logCost,         setLogCost]         = useState('')
    const [logNotes,        setLogNotes]        = useState('')
    const [savingLog,       setSavingLog]       = useState(false)

    const load = useCallback(async () => {
        try {
            const res = await apiGetWorkOrder(id)
            setWo(res.data.data.work_order)
            setWorkLogs(res.data.data.work_order.work_logs ?? [])
        } catch {
            setModal({ title: 'Error', message: 'Could not load work order.', type: 'error' })
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [id])

    useEffect(() => { load() }, [load])

    const onRefresh = () => { setRefreshing(true); load() }

    const handleStatusChange = (next: string) => {
        setModal({
            title:   'Change Status',
            message: `Mark as "${statusLabel(next)}"?`,
            type:    'info',
            onClose: async () => {
                setModal(null)
                try {
                    const res = await apiUpdateWorkOrder(id, { status: next })
                    setWo(res.data.data.work_order)
                } catch {
                    setModal({ title: 'Error', message: 'Could not update status.', type: 'error' })
                }
            },
        })
    }

    const handleAddComment = async () => {
        if (!commentText.trim()) return
        setSubmitting(true)
        try {
            const res = await apiAddWorkOrderComment(id, commentText.trim())
            const newComment = res.data.data
            setWo(prev => prev ? {
                ...prev,
                comments: [...(prev.comments ?? []), newComment],
            } : prev)
            setCommentText('')
        } catch {
            setModal({ title: 'Error', message: 'Could not post comment.', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleToggleChecklist = async (itemId: number) => {
        try {
            await apiToggleChecklistItem(id, itemId)
            setWo(prev => prev ? {
                ...prev,
                checklist_items: (prev.checklist_items ?? []).map(item =>
                    item.id === itemId ? { ...item, is_completed: !item.is_completed } : item
                ),
            } : prev)
        } catch {}
    }

    const openAddLog = () => {
        setEditingLog(null)
        setLogMinutes('')
        setLogCost('')
        setLogNotes('')
        setLogModalVisible(true)
    }

    const openEditLog = (log: WorkLog) => {
        setEditingLog(log)
        setLogMinutes(String(log.labor_minutes))
        setLogCost(log.labor_cost != null ? String(log.labor_cost) : '')
        setLogNotes(log.notes ?? '')
        setLogModalVisible(true)
    }

    const handleSaveLog = async () => {
        const mins = parseInt(logMinutes, 10)
        if (!mins || mins < 1) {
            setModal({ title: 'Validation', message: 'Duration is required and must be at least 1 minute.', type: 'error' })
            return
        }
        setSavingLog(true)
        try {
            const payload = {
                labor_minutes: mins,
                labor_cost:    logCost ? parseFloat(logCost) : null,
                notes:         logNotes.trim() || null,
            }
            if (editingLog) {
                const res  = await apiUpdateWorkLog(id, editingLog.id, payload)
                const updated = res.data.data
                setWorkLogs(prev => prev.map(l => l.id === updated.id ? updated : l))
            } else {
                const res  = await apiAddWorkLog(id, payload)
                setWorkLogs(prev => [res.data.data, ...prev])
            }
            setLogModalVisible(false)
        } catch {
            setModal({ title: 'Error', message: 'Could not save work log.', type: 'error' })
        } finally {
            setSavingLog(false)
        }
    }

    const handleDeleteLog = (logId: number) => {
        setModal({
            title:   'Delete Log',
            message: 'Remove this work log? This cannot be undone.',
            type:    'info',
            onClose: async () => {
                setModal(null)
                try {
                    await apiDeleteWorkLog(id, logId)
                    setWorkLogs(prev => prev.filter(l => l.id !== logId))
                } catch {
                    setModal({ title: 'Error', message: 'Could not delete work log.', type: 'error' })
                }
            },
        })
    }

    if (loading) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.loadingWrap}>
                    <ActivityIndicator size="large" color="#111" />
                </View>
            </SafeAreaView>
        )
    }

    if (!wo) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.notFound}>
                    <Text style={s.notFoundText}>Work order not found.</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={s.backLink}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const sc        = StatusColors[wo.status]    ?? StatusColors.open
    const pc        = PriorityColors[wo.priority] ?? PriorityColors.medium
    const actions   = STATUS_ACTIONS[wo.status]   ?? []
    const overdue   = isOverdue(wo)
    const comments  = wo.comments ?? []
    const checklist = wo.checklist_items ?? []
    const assignees = wo.assigned_members?.map(m => m.name).filter(Boolean).join(', ') || 'Unassigned'

    return (
        <SafeAreaView style={s.safe} edges={['top']}>

            <AlertModal
                visible={!!modal}
                title={modal?.title ?? ''}
                message={modal?.message ?? ''}
                type={modal?.type ?? 'info'}
                btnLabel={modal?.title === 'Change Status' ? 'Confirm' : 'OK'}
                onClose={() => { modal?.onClose ? modal.onClose() : setModal(null) }}
            />

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#444" />
                </TouchableOpacity>
                <Text style={s.headerCode}>{wo.code}</Text>
                <View style={{ width: 36 }} />
            </View>

            <KeyboardAvoidingView style={s.flex} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
            <ScrollView
                style={s.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111" />}
            >
                {/* Title section */}
                <View style={s.titleSection}>
                    <View style={s.badgeRow}>
                        <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                            <View style={[s.statusDot, { backgroundColor: sc.text }]} />
                            <Text style={[s.statusText, { color: sc.text }]}>{statusLabel(wo.status)}</Text>
                        </View>
                        <View style={[s.priorityBadge, { backgroundColor: pc.bg }]}>
                            <Text style={[s.priorityText, { color: pc.text }]}>
                                {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                            </Text>
                        </View>
                        {overdue && (
                            <View style={s.overdueBadge}>
                                <Ionicons name="warning-outline" size={11} color="#ff6a55" />
                                <Text style={s.overdueText}>Overdue</Text>
                            </View>
                        )}
                    </View>
                    <Text style={s.title}>{wo.title}</Text>
                </View>

                {/* Status action buttons */}
                {actions.length > 0 && (
                    <View style={s.actionsRow}>
                        {actions.map(a => (
                            <TouchableOpacity
                                key={a.next}
                                style={[s.actionBtn, { backgroundColor: a.bg }]}
                                onPress={() => handleStatusChange(a.next)}
                                activeOpacity={0.85}
                            >
                                <Text style={s.actionBtnText}>{a.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsRow} contentContainerStyle={s.tabsContent}>
                    {([
                        { key: 'details',    label: 'Details'    },
                        { key: 'comments',   label: 'Comments'   },
                        { key: 'work-logs',  label: 'Work Logs'  },
                        { key: 'attachments',label: 'Files'      },
                    ] as const).map(t => (
                        <TouchableOpacity
                            key={t.key}
                            style={[s.tab, activeTab === t.key && s.tabActive]}
                            onPress={() => setActiveTab(t.key)}
                        >
                            <Text style={[s.tabText, activeTab === t.key && s.tabTextActive]}>
                                {t.label}
                                {t.key === 'comments'  && comments.length  > 0 ? ` (${comments.length})`   : ''}
                                {t.key === 'work-logs' && workLogs.length   > 0 ? ` (${workLogs.length})`   : ''}
                                {t.key === 'details'   && checklist.length  > 0 ? ` · ${checklist.filter(c => c.is_completed).length}/${checklist.length}` : ''}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Details tab */}
                {activeTab === 'details' && (
                    <View style={s.card}>
                        {wo.asset && (
                            <>
                                <InfoRow icon="cube-outline" label="Asset" value={wo.asset.name} />
                                <View style={s.divider} />
                            </>
                        )}
                        <InfoRow icon="person-outline"    label="Assigned to" value={assignees} />
                        <View style={s.divider} />
                        <InfoRow icon="calendar-outline"  label="Due date"    value={formatDate(wo.due_at)} />
                        <View style={s.divider} />
                        <InfoRow icon="create-outline"    label="Created"     value={formatDate(wo.created_at)} />
                        {wo.created_by && (
                            <>
                                <View style={s.divider} />
                                <InfoRow icon="person-add-outline" label="Created by" value={wo.created_by.name ?? '—'} />
                            </>
                        )}

                        {wo.description ? (
                            <>
                                <View style={[s.divider, { marginVertical: 14 }]} />
                                <Text style={s.descLabel}>Description</Text>
                                <Text style={s.descText}>{wo.description}</Text>
                            </>
                        ) : null}

                        {checklist.length > 0 && (
                            <>
                                <View style={[s.divider, { marginVertical: 14 }]} />
                                <Text style={s.descLabel}>
                                    Checklist ({checklist.filter(c => c.is_completed).length}/{checklist.length})
                                </Text>
                                {checklist.map(item => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={s.checkRow}
                                        onPress={() => handleToggleChecklist(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={item.is_completed ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={20}
                                            color={item.is_completed ? '#10b981' : '#ccc'}
                                        />
                                        <Text style={[s.checkText, item.is_completed && s.checkTextDone]}>
                                            {item.title}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </>
                        )}
                    </View>
                )}

                {/* Comments tab */}
                {activeTab === 'comments' && (
                    <View style={s.commentsWrap}>
                        {comments.length === 0 ? (
                            <View style={s.emptyTab}>
                                <Ionicons name="chatbubble-outline" size={36} color="#ccc" />
                                <Text style={s.emptyTabText}>No comments yet</Text>
                            </View>
                        ) : (
                            comments.map(c => (
                                <View key={c.id} style={s.commentCard}>
                                    {/* Avatar + Name row */}
                                    <View style={s.commentHeader}>
                                        <View style={s.commentAvatar}>
                                            <Text style={s.commentAvatarText}>
                                                {c.author.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={s.commentAuthor}>{c.author}</Text>
                                    </View>
                                    {/* Message */}
                                    <Text style={s.commentText}>{c.body}</Text>
                                    {/* Time — bottom right */}
                                    <Text style={s.commentTime}>{relativeTime(c.created_at)}</Text>
                                </View>
                            ))
                        )}
                        <View style={{ height: 80 }} />
                    </View>
                )}

                {/* Work Logs tab */}
                {activeTab === 'work-logs' && (
                    <View style={s.logsWrap}>
                        {/* Summary bar */}
                        {workLogs.length > 0 && (
                            <View style={s.logsSummary}>
                                <View style={s.logsSummaryItem}>
                                    <Ionicons name="time-outline" size={16} color="#2a85ff" />
                                    <Text style={s.logsSummaryLabel}>Total time</Text>
                                    <Text style={s.logsSummaryValue}>
                                        {formatMinutes(workLogs.reduce((a, l) => a + l.labor_minutes, 0))}
                                    </Text>
                                </View>
                                {workLogs.some(l => l.labor_cost && l.labor_cost > 0) && (
                                    <View style={s.logsSummaryItem}>
                                        <Ionicons name="cash-outline" size={16} color="#10b981" />
                                        <Text style={s.logsSummaryLabel}>Total cost</Text>
                                        <Text style={s.logsSummaryValue}>
                                            ${workLogs.reduce((a, l) => a + (l.labor_cost ?? 0), 0).toFixed(2)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {!CAN_LOG_STATUSES.includes(wo.status) && (
                            <Text style={s.logHint}>
                                Work logs can be added when the WO is In Progress or Completed.
                            </Text>
                        )}

                        {/* Log entries */}
                        {workLogs.length === 0 ? (
                            <View style={s.emptyTab}>
                                <Ionicons name="time-outline" size={36} color="#ccc" />
                                <Text style={s.emptyTabText}>No work logs yet</Text>
                            </View>
                        ) : (
                            workLogs.map(log => (
                                <View key={log.id} style={s.logCard}>

                                    {/* ── Who + when ── */}
                                    <View style={s.logCardHeader}>
                                        <View style={s.commentAvatar}>
                                            <Text style={s.commentAvatarText}>
                                                {log.author.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={s.logCardMeta}>
                                            <Text style={s.commentAuthor}>{log.author}</Text>
                                            <Text style={s.commentTime}>{relativeTime(log.created_at)}</Text>
                                        </View>
                                    </View>

                                    {/* ── Notes ── */}
                                    {log.notes ? (
                                        <Text style={s.logNotes}>{log.notes}</Text>
                                    ) : null}

                                    {/* ── Footer: badges left · actions right ── */}
                                    <View style={s.logCardFooter}>
                                        <View style={s.logBadges}>
                                            <View style={s.logDurationBadge}>
                                                <Ionicons name="time-outline" size={12} color="#2a85ff" />
                                                <Text style={s.logDurationText}>{formatMinutes(log.labor_minutes)}</Text>
                                            </View>
                                            {log.labor_cost != null && log.labor_cost > 0 && (
                                                <View style={s.logCostBadge}>
                                                    <Ionicons name="cash-outline" size={12} color="#10b981" />
                                                    <Text style={s.logCostText}>${log.labor_cost.toFixed(2)}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={s.logActions}>
                                            <TouchableOpacity
                                                style={s.logActionIcon}
                                                onPress={() => openEditLog(log)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="pencil-outline" size={16} color="#888" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[s.logActionIcon, s.logActionIconRed]}
                                                onPress={() => handleDeleteLog(log.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="trash-outline" size={16} color="#ff6a55" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                </View>
                            ))
                        )}
                        <View style={{ height: 32 }} />
                    </View>
                )}

                {activeTab === 'attachments' && (
                    <View style={s.emptyTab}>
                        <Ionicons name="attach-outline" size={36} color="#ccc" />
                        <Text style={s.emptyTabText}>No attachments</Text>
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* Fixed comment input — shown only on comments tab */}
            {activeTab === 'comments' && (
                <View style={s.commentInputWrap}>
                    <TextInput
                        style={s.commentInput}
                        placeholder="Write a comment…"
                        placeholderTextColor="#c8c8c8"
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                        returnKeyType="default"
                    />
                    <TouchableOpacity
                        style={[s.sendBtn, (!commentText.trim() || submitting) && s.sendBtnDisabled]}
                        onPress={handleAddComment}
                        disabled={!commentText.trim() || submitting}
                        activeOpacity={0.85}
                    >
                        {submitting
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Ionicons name="send" size={18} color="#fff" />
                        }
                    </TouchableOpacity>
                </View>
            )}
            </KeyboardAvoidingView>

            {/* Log Time button — fixed bottom bar */}
            {activeTab === 'work-logs' && CAN_LOG_STATUSES.includes(wo?.status ?? '') && (
                <View style={s.logTimebar}>
                    <TouchableOpacity style={s.logTimeBtn} onPress={openAddLog} activeOpacity={0.85}>
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={s.logTimeBtnText}>Log Time</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Log Time bottom sheet modal */}
            <Modal visible={logModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => !savingLog && setLogModalVisible(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <TouchableOpacity style={s.logModalOverlay} activeOpacity={1} onPress={() => !savingLog && setLogModalVisible(false)} />
                    <View style={s.logModalSheet}>
                        {/* Handle */}
                        <View style={s.logModalHandle} />
                        <Text style={s.logModalTitle}>{editingLog ? 'Edit Work Log' : 'Log Work Time'}</Text>

                        {/* Duration */}
                        <Text style={s.logFormLabel}>Duration (minutes) <Text style={{ color: '#ff6a55' }}>*</Text></Text>
                        <TextInput
                            style={s.logFormInput}
                            placeholder="e.g. 90"
                            placeholderTextColor="#c8c8c8"
                            keyboardType="number-pad"
                            value={logMinutes}
                            onChangeText={setLogMinutes}
                        />
                        {logMinutes && parseInt(logMinutes) >= 60 && (
                            <Text style={s.logFormHint}>= {formatMinutes(parseInt(logMinutes))}</Text>
                        )}

                        {/* Cost */}
                        <Text style={[s.logFormLabel, { marginTop: 14 }]}>Labor Cost ($) <Text style={s.logFormOptional}>optional</Text></Text>
                        <TextInput
                            style={s.logFormInput}
                            placeholder="0.00"
                            placeholderTextColor="#c8c8c8"
                            keyboardType="decimal-pad"
                            value={logCost}
                            onChangeText={setLogCost}
                        />

                        {/* Notes */}
                        <Text style={[s.logFormLabel, { marginTop: 14 }]}>Notes <Text style={s.logFormOptional}>optional</Text></Text>
                        <TextInput
                            style={[s.logFormInput, s.logFormTextarea]}
                            placeholder="What was done…"
                            placeholderTextColor="#c8c8c8"
                            multiline
                            value={logNotes}
                            onChangeText={setLogNotes}
                        />

                        {/* Buttons */}
                        <View style={s.logModalActions}>
                            <TouchableOpacity style={s.logCancelBtn} onPress={() => setLogModalVisible(false)} disabled={savingLog} activeOpacity={0.7}>
                                <Text style={s.logCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.logSaveBtn, savingLog && { opacity: 0.6 }]} onPress={handleSaveLog} disabled={savingLog} activeOpacity={0.85}>
                                {savingLog
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={s.logSaveText}>{editingLog ? 'Save Changes' : 'Save Log'}</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    safe:        { flex: 1, backgroundColor: '#f5f5f5' },
    flex:        { flex: 1 },
    scroll:      { flex: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection:     'row',
        alignItems:        'center',
        justifyContent:    'space-between',
        paddingHorizontal: 16,
        paddingVertical:   12,
        backgroundColor:   '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backBtn: {
        width:           36,
        height:          36,
        borderRadius:    10,
        backgroundColor: '#f5f5f5',
        alignItems:      'center',
        justifyContent:  'center',
    },
    headerCode: { fontSize: 15, fontWeight: '700', color: '#111' },

    titleSection: {
        backgroundColor: '#fff',
        padding:         16,
        marginBottom:    12,
    },
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    statusBadge: {
        flexDirection:     'row',
        alignItems:        'center',
        gap:               5,
        paddingHorizontal: 10,
        paddingVertical:   5,
        borderRadius:      20,
    },
    statusDot:     { width: 7, height: 7, borderRadius: 4 },
    statusText:    { fontSize: 12, fontWeight: '700' },
    priorityBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    priorityText:  { fontSize: 12, fontWeight: '700' },
    overdueBadge: {
        flexDirection:     'row',
        alignItems:        'center',
        gap:               4,
        paddingHorizontal: 8,
        paddingVertical:   4,
        borderRadius:      20,
        backgroundColor:   '#ff6a5515',
    },
    overdueText: { fontSize: 11, fontWeight: '700', color: '#ff6a55' },
    title:       { fontSize: 20, fontWeight: '800', color: '#111', lineHeight: 26 },

    actionsRow: {
        flexDirection:     'row',
        paddingHorizontal: 16,
        gap:               10,
        marginBottom:      12,
    },
    actionBtn: {
        flex:          1,
        paddingVertical: 13,
        borderRadius:  12,
        alignItems:    'center',
    },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    tabsRow: {
        backgroundColor:   '#fff',
        marginBottom:      12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tabsContent:   { flexDirection: 'row' },
    tab:          { paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive:    { borderBottomColor: '#111' },
    tabText:      { fontSize: 13, fontWeight: '600', color: '#aaa' },
    tabTextActive: { color: '#111' },

    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius:    14,
        padding:         16,
        borderWidth:     1,
        borderColor:     '#f0f0f0',
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 1 },
        shadowOpacity:   0.04,
        shadowRadius:    4,
        elevation:       2,
    },

    infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    infoIconWrap: {
        width:           34,
        height:          34,
        borderRadius:    10,
        backgroundColor: '#f2f2f2',
        alignItems:      'center',
        justifyContent:  'center',
    },
    infoTexts: { flex: 1 },
    infoLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', marginBottom: 1 },
    infoValue: { fontSize: 14, color: '#111', fontWeight: '600' },
    divider:   { height: 1, backgroundColor: '#f5f5f5', marginVertical: 8 },

    descLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
    descText:  { fontSize: 14, color: '#666', lineHeight: 22 },

    checkRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    checkText:     { flex: 1, fontSize: 14, color: '#333' },
    checkTextDone: { color: '#aaa', textDecorationLine: 'line-through' },

    commentsWrap: { paddingHorizontal: 16, gap: 10 },
    commentCard: {
        backgroundColor: '#fff',
        borderRadius:    14,
        padding:         14,
        borderWidth:     1,
        borderColor:     '#f0f0f0',
        gap:             6,
    },
    commentHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
    commentAvatar:     {
        width:           34,
        height:          34,
        borderRadius:    17,
        backgroundColor: '#111',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
    },
    commentAvatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    commentAuthor:     { fontSize: 14, fontWeight: '700', color: '#111', flex: 1 },
    commentText:       { fontSize: 14, color: '#555', lineHeight: 21, paddingLeft: 44 },
    commentTime:       { fontSize: 11, color: '#bbb', fontWeight: '500', textAlign: 'right' },

    commentInputWrap: {
        flexDirection:     'row',
        alignItems:        'flex-end',
        gap:               10,
        backgroundColor:   '#fff',
        borderTopWidth:    1,
        borderTopColor:    '#f0f0f0',
        paddingHorizontal: 16,
        paddingVertical:   10,
        paddingBottom:     14,
    },
    commentInput: {
        flex:              1,
        fontSize:          14,
        color:             '#111',
        minHeight:         40,
        maxHeight:         100,
        fontWeight:        '500',
        backgroundColor:   '#f5f5f5',
        borderRadius:      12,
        paddingHorizontal: 14,
        paddingVertical:   10,
    },
    sendBtn:         { width: 42, height: 42, borderRadius: 13, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { opacity: 0.4 },

    emptyTab:     { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyTabText: { fontSize: 15, color: '#aaa', fontWeight: '600' },

    /* Work Logs */
    logsWrap: { paddingHorizontal: 16, gap: 10 },
    logsSummary: {
        flexDirection:   'row',
        flexWrap:        'wrap',
        gap:             12,
        backgroundColor: '#f8f8f8',
        borderRadius:    12,
        padding:         14,
        marginBottom:    4,
    },
    logsSummaryItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
    logsSummaryLabel: { fontSize: 13, color: '#888' },
    logsSummaryValue: { fontSize: 13, fontWeight: '700', color: '#111' },

    logTimebar: {
        backgroundColor:   '#fff',
        borderTopWidth:    1,
        borderTopColor:    '#f0f0f0',
        paddingHorizontal: 16,
        paddingVertical:   10,
        paddingBottom:     14,
    },
    logTimeBtn: {
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             8,
        height:          46,
        borderRadius:    13,
        backgroundColor: '#111',
    },
    logTimeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    logHint: { fontSize: 12, color: '#bbb', textAlign: 'center', paddingVertical: 8 },

    logCard: {
        backgroundColor: '#fff',
        borderRadius:    16,
        padding:         14,
        borderWidth:     1,
        borderColor:     '#f0f0f0',
        gap:             10,
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 1 },
        shadowOpacity:   0.04,
        shadowRadius:    4,
        elevation:       2,
    },
    logCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logCardMeta:   { flex: 1 },

    /* Notes */
    logNotes: {
        fontSize:          13,
        color:             '#666',
        lineHeight:        20,
        backgroundColor:   '#fafafa',
        borderRadius:      10,
        paddingHorizontal: 12,
        paddingVertical:   8,
        borderLeftWidth:   3,
        borderLeftColor:   '#e0e0e0',
    },

    /* Footer row */
    logCardFooter: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginTop:      2,
    },
    logBadges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    logDurationBadge: {
        flexDirection:     'row',
        alignItems:        'center',
        gap:               4,
        backgroundColor:   '#2a85ff15',
        paddingHorizontal: 10,
        paddingVertical:   4,
        borderRadius:      20,
    },
    logDurationText: { fontSize: 12, fontWeight: '700', color: '#2a85ff' },
    logCostBadge: {
        flexDirection:     'row',
        alignItems:        'center',
        gap:               4,
        backgroundColor:   '#10b98115',
        paddingHorizontal: 10,
        paddingVertical:   4,
        borderRadius:      20,
    },
    logCostText: { fontSize: 12, fontWeight: '700', color: '#10b981' },

    /* Action icon buttons */
    logActions:       { flexDirection: 'row', gap: 6 },
    logActionIcon:    {
        width:           34,
        height:          34,
        borderRadius:    10,
        backgroundColor: '#f5f5f5',
        alignItems:      'center',
        justifyContent:  'center',
    },
    logActionIconRed: { backgroundColor: '#ff6a5510' },

    /* Log form modal (bottom sheet) */
    logModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    logModalSheet: {
        backgroundColor:   '#fff',
        borderTopLeftRadius:  24,
        borderTopRightRadius: 24,
        paddingHorizontal:    24,
        paddingBottom:        32,
        paddingTop:           12,
    },
    logModalHandle: {
        width:           40,
        height:          4,
        borderRadius:    2,
        backgroundColor: '#e0e0e0',
        alignSelf:       'center',
        marginBottom:    16,
    },
    logModalTitle:   { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 20 },
    logFormLabel:    { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 6 },
    logFormOptional: { fontSize: 12, fontWeight: '500', color: '#bbb' },
    logFormInput: {
        height:            50,
        backgroundColor:   '#f5f5f5',
        borderRadius:      12,
        paddingHorizontal: 14,
        fontSize:          15,
        color:             '#111',
        fontWeight:        '500',
    },
    logFormTextarea: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
    logFormHint:     { fontSize: 12, color: '#2a85ff', fontWeight: '600', marginTop: 4 },
    logModalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    logCancelBtn: {
        flex:            1,
        height:          50,
        borderRadius:    13,
        borderWidth:     1.5,
        borderColor:     '#e0e0e0',
        alignItems:      'center',
        justifyContent:  'center',
    },
    logCancelText: { fontSize: 15, fontWeight: '600', color: '#666' },
    logSaveBtn: {
        flex:            2,
        height:          50,
        borderRadius:    13,
        backgroundColor: '#111',
        alignItems:      'center',
        justifyContent:  'center',
    },
    logSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    notFound:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    notFoundText: { fontSize: 16, color: '#666' },
    backLink:     { fontSize: 14, color: '#111', fontWeight: '600' },
})
