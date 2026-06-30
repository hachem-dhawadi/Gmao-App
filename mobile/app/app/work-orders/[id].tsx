import { useState, useEffect, useCallback } from 'react'
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, RefreshControl, KeyboardAvoidingView, Platform, Modal,
    Pressable, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { StatusColors, PriorityColors } from '@/constants/colors'
import {
    apiGetWorkOrder, apiUpdateWorkOrder, apiAddWorkOrderComment,
    apiToggleChecklistItem, apiAddWorkLog, apiUpdateWorkLog, apiDeleteWorkLog,
    apiAddWoAttachment, apiDeleteWoAttachment,
    apiApproveWorkOrder, apiRejectWorkOrder,
    apiGetWoParts, apiRecordWoPart,
    type WorkOrder, type WorkLog, type WorkOrderAttachment, type WoPart,
} from '@/services/WorkOrdersService'
import { apiGetItems, apiGetItem, type InventoryItem } from '@/services/InventoryService'
import { useAuthStore } from '@/store/authStore'
import AlertModal from '@/components/ui/AlertModal'

const STATUS_ACTIONS: Record<string, { label: string; next: string; bg: string }[]> = {
    open:             [{ label: 'Start Work',  next: 'in_progress', bg: '#111'     }],
    in_progress:      [{ label: 'Put On Hold', next: 'on_hold',     bg: '#f59e0b' }, { label: 'Complete', next: 'completed', bg: '#10b981' }],
    on_hold:          [{ label: 'Resume',      next: 'in_progress', bg: '#111'     }],
    completed:        [],
    cancelled:        [],
    pending_approval: [],
    rejected:         [],
}

const CAN_LOG_STATUSES = ['in_progress', 'completed']
const CAN_FAILURE_STATUSES = ['in_progress', 'completed']

const FAILURE_CODES: { key: string; label: string }[] = [
    { key: 'electrical_fault',      label: 'Electrical Fault'      },
    { key: 'mechanical_failure',    label: 'Mechanical Failure'    },
    { key: 'wear_and_tear',         label: 'Wear & Tear'           },
    { key: 'operator_error',        label: 'Operator Error'        },
    { key: 'lack_of_maintenance',   label: 'Lack of Maintenance'   },
    { key: 'manufacturing_defect',  label: 'Manufacturing Defect'  },
    { key: 'environmental',         label: 'Environmental'         },
    { key: 'unknown',               label: 'Unknown'               },
]

const ROOT_CAUSES: { key: string; label: string }[] = [
    { key: 'inadequate_maintenance', label: 'Inadequate Maintenance' },
    { key: 'operator_error',         label: 'Operator Error'         },
    { key: 'design_flaw',            label: 'Design Flaw'            },
    { key: 'normal_aging',           label: 'Normal Aging'           },
    { key: 'overload',               label: 'Overload'               },
    { key: 'external_factor',        label: 'External Factor'        },
    { key: 'unknown',                label: 'Unknown'                },
]

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
    if (['completed', 'cancelled', 'pending_approval', 'rejected'].includes(wo.status)) return false
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
    const [activeTab,   setActiveTab]   = useState<'details' | 'comments' | 'parts' | 'work-logs' | 'attachments'>('details')
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

    // Attachments
    const [attachments,       setAttachments]       = useState<WorkOrderAttachment[]>([])
    const [attachPickerOpen,  setAttachPickerOpen]  = useState(false)
    const [uploadingAttach,   setUploadingAttach]   = useState(false)

    // Parts
    const [parts,             setParts]             = useState<WoPart[]>([])
    const [partsLoaded,       setPartsLoaded]       = useState(false)
    const [loadingParts,      setLoadingParts]      = useState(false)
    const [partModal,         setPartModal]         = useState(false)
    const [savingPart,        setSavingPart]        = useState(false)
    const [partItem,          setPartItem]          = useState<InventoryItem | null>(null)
    const [partWarehouses,    setPartWarehouses]    = useState<{ id: number; name: string | null; stock: number }[]>([])
    const [partWarehouse,     setPartWarehouse]     = useState<{ id: number; name: string | null } | null>(null)
    const [partQty,           setPartQty]           = useState('1')
    const [partUsageType,     setPartUsageType]     = useState<'used' | 'scrapped'>('used')
    const [itemPickerOpen,    setItemPickerOpen]    = useState(false)
    const [warehousePickerOpen, setWarehousePickerOpen] = useState(false)
    const [allItems,          setAllItems]          = useState<InventoryItem[]>([])
    const [itemSearch,        setItemSearch]        = useState('')
    const [loadingItems,      setLoadingItems]      = useState(false)

    // Failure Analysis
    const [failureModal,          setFailureModal]          = useState(false)
    const [savingFailure,         setSavingFailure]         = useState(false)
    const [editFailureCode,       setEditFailureCode]       = useState<string | null>(null)
    const [editRootCause,         setEditRootCause]         = useState<string | null>(null)
    const [editResolutionNotes,   setEditResolutionNotes]   = useState('')
    const [failureCodePickerOpen, setFailureCodePickerOpen] = useState(false)
    const [rootCausePickerOpen,   setRootCausePickerOpen]   = useState(false)

    // Approve / Reject
    const canApprove = useAuthStore(st => st.user?.roles?.some(r => ['admin', 'manager'].includes(r)) ?? false)
    const [approving,     setApproving]     = useState(false)
    const [rejecting,     setRejecting]     = useState(false)
    const [rejectOpen,    setRejectOpen]    = useState(false)
    const [rejectReason,  setRejectReason]  = useState('')

    const load = useCallback(async () => {
        try {
            const res = await apiGetWorkOrder(id)
            setWo(res.data.data.work_order)
            setWorkLogs(res.data.data.work_order.work_logs ?? [])
            setAttachments(res.data.data.work_order.attachments ?? [])
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

    const uploadFile = async (file: { uri: string; name: string; type: string }) => {
        setAttachPickerOpen(false)
        setUploadingAttach(true)
        try {
            const res = await apiAddWoAttachment(id, file)
            setAttachments(prev => [res.data.data, ...prev])
        } catch {
            setModal({ title: 'Upload Failed', message: 'Could not upload the file. Make sure this work order is assigned to you.', type: 'error' })
        } finally {
            setUploadingAttach(false)
        }
    }

    const handlePickCamera = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) {
            setModal({ title: 'Permission Required', message: 'Camera access is needed to take photos.', type: 'error' })
            return
        }
        setAttachPickerOpen(false)
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images })
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0]
            await uploadFile({ uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' })
        }
    }

    const handlePickLibrary = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) {
            setModal({ title: 'Permission Required', message: 'Photo library access is needed.', type: 'error' })
            return
        }
        setAttachPickerOpen(false)
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.All })
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0]
            await uploadFile({ uri: a.uri, name: a.fileName ?? `image_${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' })
        }
    }

    const handlePickDocument = async () => {
        setAttachPickerOpen(false)
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0]
            await uploadFile({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream' })
        }
    }

    const handleDeleteAttachment = (attachId: number) => {
        setModal({
            title:   'Delete File',
            message: 'Remove this attachment? This cannot be undone.',
            type:    'info',
            onClose: async () => {
                setModal(null)
                try {
                    await apiDeleteWoAttachment(id, attachId)
                    setAttachments(prev => prev.filter(a => a.id !== attachId))
                } catch {
                    setModal({ title: 'Error', message: 'Could not delete attachment.', type: 'error' })
                }
            },
        })
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

    const loadParts = async () => {
        setLoadingParts(true)
        try {
            const res = await apiGetWoParts(id)
            setParts(res.data.data.parts)
            setPartsLoaded(true)
        } catch {} finally {
            setLoadingParts(false)
        }
    }

    const handleTabChange = (tab: typeof activeTab) => {
        setActiveTab(tab)
        if (tab === 'parts' && !partsLoaded) loadParts()
    }

    const openAddPart = async () => {
        setPartItem(null)
        setPartWarehouses([])
        setPartWarehouse(null)
        setPartQty('1')
        setPartUsageType('used')
        setItemSearch('')
        setPartModal(true)
        setLoadingItems(true)
        try {
            const res = await apiGetItems({ per_page: 200 })
            setAllItems(res.data.data.items)
        } catch {} finally {
            setLoadingItems(false)
        }
    }

    const onSelectItem = async (item: InventoryItem) => {
        setPartItem(item)
        setPartWarehouse(null)
        setPartWarehouses([])
        setItemPickerOpen(false)
        try {
            const res = await apiGetItem(item.id)
            const wh = res.data.data.stock_by_warehouse.map(w => ({
                id:    w.warehouse_id,
                name:  w.warehouse_name,
                stock: w.stock_qty,
            }))
            setPartWarehouses(wh)
            if (wh.length === 1) setPartWarehouse({ id: wh[0].id, name: wh[0].name })
        } catch {}
    }

    const handleAddPart = async () => {
        if (!partItem) {
            setModal({ title: 'Validation', message: 'Please select a part.', type: 'error' })
            return
        }
        if (!partWarehouse) {
            setModal({ title: 'Validation', message: 'Please select a warehouse.', type: 'error' })
            return
        }
        const qty = parseFloat(partQty)
        if (!qty || qty <= 0) {
            setModal({ title: 'Validation', message: 'Quantity must be greater than 0.', type: 'error' })
            return
        }
        setSavingPart(true)
        try {
            const res = await apiRecordWoPart(id, {
                item_id:      partItem.id,
                warehouse_id: partWarehouse.id,
                usage_type:   partUsageType,
                quantity:     qty,
            })
            setParts(prev => [res.data.data.part, ...prev])
            setPartModal(false)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            setModal({ title: 'Error', message: msg ?? 'Could not record part.', type: 'error' })
        } finally {
            setSavingPart(false)
        }
    }

    const openFailureModal = () => {
        setEditFailureCode(wo?.failure_code ?? null)
        setEditRootCause(wo?.root_cause ?? null)
        setEditResolutionNotes(wo?.resolution_notes ?? '')
        setFailureModal(true)
    }

    const handleSaveFailure = async () => {
        setSavingFailure(true)
        try {
            const res = await apiUpdateWorkOrder(id, {
                failure_code:      editFailureCode     || null,
                root_cause:        editRootCause       || null,
                resolution_notes:  editResolutionNotes.trim() || null,
            })
            setWo(res.data.data.work_order)
            setFailureModal(false)
        } catch {
            setModal({ title: 'Error', message: 'Could not save failure analysis.', type: 'error' })
        } finally {
            setSavingFailure(false)
        }
    }

    const handleApprove = async () => {
        setApproving(true)
        try {
            const res = await apiApproveWorkOrder(id)
            setWo(res.data.data.work_order)
        } catch {
            setModal({ title: 'Error', message: 'Could not approve work order.', type: 'error' })
        } finally {
            setApproving(false)
        }
    }

    const handleReject = async () => {
        setRejecting(true)
        try {
            const res = await apiRejectWorkOrder(id, rejectReason.trim() || undefined)
            setWo(res.data.data.work_order)
            setRejectOpen(false)
            setRejectReason('')
        } catch {
            setModal({ title: 'Error', message: 'Could not reject work order.', type: 'error' })
        } finally {
            setRejecting(false)
        }
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
    const assignees = wo.assigned_member?.name || 'Unassigned'

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

            {/* Reject reason modal */}
            <Modal visible={rejectOpen} transparent animationType="fade" onRequestClose={() => setRejectOpen(false)}>
                <Pressable style={s.modalOverlay} onPress={() => setRejectOpen(false)}>
                    <Pressable style={s.rejectModal} onPress={e => e.stopPropagation()}>
                        <Text style={s.rejectModalTitle}>Reject Work Order</Text>
                        <Text style={s.rejectModalSub}>Optionally provide a reason for rejection.</Text>
                        <TextInput
                            style={s.rejectReasonInput}
                            placeholder="Reason (optional)"
                            placeholderTextColor="#aaa"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                            numberOfLines={3}
                        />
                        <View style={s.rejectModalButtons}>
                            <Pressable style={s.rejectModalCancel} onPress={() => setRejectOpen(false)}>
                                <Text style={s.rejectModalCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[s.rejectModalConfirm, rejecting && { opacity: 0.6 }]}
                                onPress={handleReject}
                                disabled={rejecting}
                            >
                                {rejecting
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={s.rejectModalConfirmText}>Reject</Text>
                                }
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

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

                {/* Pending approval banner */}
                {wo.status === 'pending_approval' && (
                    <View style={s.pendingBanner}>
                        <View style={s.pendingBannerLeft}>
                            <Ionicons name="time-outline" size={18} color="#d97706" />
                            <View style={{ marginLeft: 10 }}>
                                <Text style={s.pendingBannerTitle}>Awaiting Approval</Text>
                                <Text style={s.pendingBannerSub}>This work order is pending review by a manager.</Text>
                            </View>
                        </View>
                        {canApprove && (
                            <View style={s.pendingBannerActions}>
                                <TouchableOpacity
                                    style={s.approveBtn}
                                    onPress={handleApprove}
                                    disabled={approving || rejecting}
                                    activeOpacity={0.8}
                                >
                                    {approving
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : <Text style={s.approveBtnText}>Approve</Text>
                                    }
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={s.rejectBtn}
                                    onPress={() => setRejectOpen(true)}
                                    disabled={approving || rejecting}
                                    activeOpacity={0.8}
                                >
                                    <Text style={s.rejectBtnText}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Rejected banner */}
                {wo.status === 'rejected' && (
                    <View style={s.rejectedBanner}>
                        <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
                        <Text style={s.rejectedBannerText}>This work order was rejected.</Text>
                    </View>
                )}

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsRow} contentContainerStyle={s.tabsContent}>
                    {([
                        { key: 'details',     label: 'Details'   },
                        { key: 'comments',    label: 'Comments'  },
                        { key: 'parts',       label: 'Parts'     },
                        { key: 'work-logs',   label: 'Work Logs' },
                        { key: 'attachments', label: 'Files'     },
                    ] as const).map(t => (
                        <TouchableOpacity
                            key={t.key}
                            style={[s.tab, activeTab === t.key && s.tabActive]}
                            onPress={() => handleTabChange(t.key)}
                        >
                            <Text style={[s.tabText, activeTab === t.key && s.tabTextActive]}>
                                {t.label}
                                {t.key === 'comments'    && comments.length    > 0 ? ` (${comments.length})`    : ''}
                                {t.key === 'parts'       && parts.length       > 0 ? ` (${parts.length})`       : ''}
                                {t.key === 'work-logs'   && workLogs.length    > 0 ? ` (${workLogs.length})`    : ''}
                                {t.key === 'attachments' && attachments.length > 0 ? ` (${attachments.length})` : ''}
                                {t.key === 'details'     && checklist.length   > 0 ? ` · ${checklist.filter(c => c.is_completed).length}/${checklist.length}` : ''}
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

                        {/* Failure Analysis — visible for in_progress / completed */}
                        {CAN_FAILURE_STATUSES.includes(wo.status) && (
                            <>
                                <View style={[s.divider, { marginVertical: 14 }]} />
                                <View style={s.failureHeader}>
                                    <Text style={s.descLabel}>Failure Analysis</Text>
                                    <TouchableOpacity style={s.failureEditBtn} onPress={openFailureModal} activeOpacity={0.75}>
                                        <Ionicons name={wo.failure_code || wo.root_cause || wo.resolution_notes ? 'pencil-outline' : 'add'} size={14} color="#2a85ff" />
                                        <Text style={s.failureEditTxt}>
                                            {wo.failure_code || wo.root_cause || wo.resolution_notes ? 'Edit' : 'Add'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {wo.failure_code || wo.root_cause || wo.resolution_notes ? (
                                    <View style={s.failureCard}>
                                        {wo.failure_code && (
                                            <View style={s.failureRow}>
                                                <Text style={s.failureRowLabel}>Failure Code</Text>
                                                <Text style={s.failureRowValue}>
                                                    {FAILURE_CODES.find(f => f.key === wo.failure_code)?.label ?? wo.failure_code}
                                                </Text>
                                            </View>
                                        )}
                                        {wo.root_cause && (
                                            <View style={s.failureRow}>
                                                <Text style={s.failureRowLabel}>Root Cause</Text>
                                                <Text style={s.failureRowValue}>
                                                    {ROOT_CAUSES.find(r => r.key === wo.root_cause)?.label ?? wo.root_cause}
                                                </Text>
                                            </View>
                                        )}
                                        {wo.resolution_notes && (
                                            <View style={[s.failureRow, { flexDirection: 'column', gap: 4 }]}>
                                                <Text style={s.failureRowLabel}>Resolution Notes</Text>
                                                <Text style={s.failureResText}>{wo.resolution_notes}</Text>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <Text style={s.failureEmpty}>No failure details recorded yet.</Text>
                                )}
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

                {/* Parts tab */}
                {activeTab === 'parts' && (
                    <View style={s.partsWrap}>
                        {loadingParts ? (
                            <ActivityIndicator style={{ marginTop: 40 }} color="#111" />
                        ) : parts.length === 0 ? (
                            <View style={s.emptyTab}>
                                <Ionicons name="cube-outline" size={36} color="#ccc" />
                                <Text style={s.emptyTabText}>No parts recorded yet</Text>
                                <Text style={s.emptyTabSub}>Tap the button below to add a part</Text>
                            </View>
                        ) : (
                            parts.map(p => {
                                const isScrap = p.move_type === 'adjustment'
                                const displayQty = Math.abs(p.quantity)
                                return (
                                    <View key={p.id} style={s.partCard}>
                                        <View style={s.partCardLeft}>
                                            <Text style={s.partName} numberOfLines={1}>{p.item?.name ?? '—'}</Text>
                                            <Text style={s.partMeta} numberOfLines={1}>
                                                {[p.item?.code, p.warehouse?.name, p.created_by?.name].filter(Boolean).join(' · ')}
                                            </Text>
                                            {p.item?.unit ? <Text style={s.partMeta}>{p.item.unit}</Text> : null}
                                        </View>
                                        <View style={s.partRight}>
                                            <View style={[s.partTypeBadge, isScrap && s.partTypeScrapped]}>
                                                <Text style={[s.partTypeText, isScrap && s.partTypeTextScrapped]}>
                                                    {isScrap ? 'Scrapped' : 'Used'}
                                                </Text>
                                            </View>
                                            <Text style={s.partQtyText}>×{displayQty}</Text>
                                        </View>
                                    </View>
                                )
                            })
                        )}
                        <View style={{ height: 90 }} />
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
                    <View style={s.attachWrap}>
                        {uploadingAttach && (
                            <View style={s.uploadingRow}>
                                <ActivityIndicator size="small" color="#2a85ff" />
                                <Text style={s.uploadingText}>Uploading…</Text>
                            </View>
                        )}
                        {attachments.length === 0 && !uploadingAttach ? (
                            <View style={s.emptyTab}>
                                <Ionicons name="attach-outline" size={36} color="#ccc" />
                                <Text style={s.emptyTabText}>No attachments yet</Text>
                                <Text style={s.emptyTabSub}>Tap the button below to add a file</Text>
                            </View>
                        ) : (
                            attachments.map(att => {
                                const isImage = att.mime_type?.startsWith('image/')
                                const isPdf   = att.mime_type === 'application/pdf'
                                const icon    = isImage ? 'image-outline' : isPdf ? 'document-text-outline' : 'document-outline'
                                const iconColor = isImage ? '#10b981' : isPdf ? '#ef4444' : '#2a85ff'
                                const kb = att.size_bytes ? (att.size_bytes / 1024).toFixed(1) + ' KB' : null
                                return (
                                    <View key={att.id} style={s.attachCard}>
                                        <View style={[s.attachIconWrap, { backgroundColor: iconColor + '18' }]}>
                                            <Ionicons name={icon as never} size={22} color={iconColor} />
                                        </View>
                                        <View style={s.attachInfo}>
                                            <Text style={s.attachName} numberOfLines={1}>{att.original_name}</Text>
                                            <Text style={s.attachMeta}>
                                                {[kb, att.author, relativeTime(att.created_at)].filter(Boolean).join(' · ')}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={s.attachDelete}
                                            onPress={() => handleDeleteAttachment(att.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="#ff6a55" />
                                        </TouchableOpacity>
                                    </View>
                                )
                            })
                        )}
                        <View style={{ height: 90 }} />
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

            {/* Add File button — fixed bottom bar */}
            {activeTab === 'attachments' && (
                <View style={s.logTimebar}>
                    <TouchableOpacity
                        style={s.logTimeBtn}
                        onPress={() => setAttachPickerOpen(true)}
                        activeOpacity={0.85}
                        disabled={uploadingAttach}
                    >
                        {uploadingAttach
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <>
                                <Ionicons name="attach" size={18} color="#fff" />
                                <Text style={s.logTimeBtnText}>Add File</Text>
                            </>
                        }
                    </TouchableOpacity>
                </View>
            )}

            {/* Add Part button — fixed bottom bar */}
            {activeTab === 'parts' && !['cancelled', 'rejected'].includes(wo?.status ?? '') && (
                <View style={s.logTimebar}>
                    <TouchableOpacity style={s.logTimeBtn} onPress={openAddPart} activeOpacity={0.85}>
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={s.logTimeBtnText}>Add Part</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Log Time button — fixed bottom bar */}
            {activeTab === 'work-logs' && CAN_LOG_STATUSES.includes(wo?.status ?? '') && (
                <View style={s.logTimebar}>
                    <TouchableOpacity style={s.logTimeBtn} onPress={openAddLog} activeOpacity={0.85}>
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={s.logTimeBtnText}>Log Time</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Attachment picker sheet */}
            <Modal visible={attachPickerOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setAttachPickerOpen(false)}>
                <TouchableOpacity style={s.logModalOverlay} activeOpacity={1} onPress={() => setAttachPickerOpen(false)} />
                <View style={s.attachPickerSheet}>
                    <View style={s.logModalHandle} />
                    <Text style={s.logModalTitle}>Add Attachment</Text>

                    <TouchableOpacity style={s.attachPickerRow} onPress={handlePickCamera} activeOpacity={0.75}>
                        <View style={[s.attachPickerIcon, { backgroundColor: '#10b98118' }]}>
                            <Ionicons name="camera-outline" size={22} color="#10b981" />
                        </View>
                        <View style={s.attachPickerTexts}>
                            <Text style={s.attachPickerLabel}>Take Photo</Text>
                            <Text style={s.attachPickerSub}>Use your camera</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={s.attachPickerRow} onPress={handlePickLibrary} activeOpacity={0.75}>
                        <View style={[s.attachPickerIcon, { backgroundColor: '#2a85ff18' }]}>
                            <Ionicons name="images-outline" size={22} color="#2a85ff" />
                        </View>
                        <View style={s.attachPickerTexts}>
                            <Text style={s.attachPickerLabel}>Photo Library</Text>
                            <Text style={s.attachPickerSub}>Choose from gallery</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={s.attachPickerRow} onPress={handlePickDocument} activeOpacity={0.75}>
                        <View style={[s.attachPickerIcon, { backgroundColor: '#f59e0b18' }]}>
                            <Ionicons name="document-outline" size={22} color="#f59e0b" />
                        </View>
                        <View style={s.attachPickerTexts}>
                            <Text style={s.attachPickerLabel}>Browse Files</Text>
                            <Text style={s.attachPickerSub}>PDF, Word, Excel and more</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={s.attachCancelBtn} onPress={() => setAttachPickerOpen(false)} activeOpacity={0.7}>
                        <Text style={s.attachCancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

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

            {/* ── Part form modal ─────────────────────────────────── */}
            <Modal visible={partModal} transparent animationType="slide" statusBarTranslucent onRequestClose={() => !savingPart && setPartModal(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                    <TouchableOpacity style={s.logModalOverlay} activeOpacity={1} onPress={() => !savingPart && setPartModal(false)} />
                    <View style={[s.logModalSheet, { paddingBottom: 0 }]}>
                        <View style={s.logModalHandle} />
                        <Text style={s.logModalTitle}>Add Part Used</Text>

                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

                            {/* Item selector */}
                            <Text style={s.logFormLabel}>Part / Item <Text style={{ color: '#ff6a55' }}>*</Text></Text>
                            <TouchableOpacity style={s.partPickerRow} onPress={() => setItemPickerOpen(true)} activeOpacity={0.8}>
                                {partItem ? (
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.partPickerValue} numberOfLines={1}>{partItem.name}</Text>
                                        <Text style={s.partPickerSub}>{partItem.code}</Text>
                                    </View>
                                ) : (
                                    <Text style={s.partPickerPlaceholder}>Select item from inventory…</Text>
                                )}
                                <Ionicons name="chevron-forward" size={16} color="#bbb" />
                            </TouchableOpacity>

                            {/* Warehouse selector — shown whenever item is selected */}
                            {partItem && partWarehouses.length > 0 && (
                                <>
                                    <Text style={[s.logFormLabel, { marginTop: 14 }]}>Warehouse <Text style={{ color: '#ff6a55' }}>*</Text></Text>
                                    <TouchableOpacity style={s.partPickerRow} onPress={() => setWarehousePickerOpen(true)} activeOpacity={0.8}>
                                        <Text style={partWarehouse ? s.partPickerValue : s.partPickerPlaceholder} numberOfLines={1}>
                                            {partWarehouse ? partWarehouse.name ?? `Warehouse #${partWarehouse.id}` : 'Select warehouse…'}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={16} color="#bbb" />
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* Qty */}
                            <Text style={[s.logFormLabel, { marginTop: 14 }]}>Quantity <Text style={{ color: '#ff6a55' }}>*</Text></Text>
                            <TextInput
                                style={s.logFormInput}
                                placeholder="1"
                                placeholderTextColor="#c8c8c8"
                                keyboardType="decimal-pad"
                                value={partQty}
                                onChangeText={setPartQty}
                            />

                            {/* Type toggle */}
                            <Text style={[s.logFormLabel, { marginTop: 14 }]}>Type</Text>
                            <View style={s.partTypeToggle}>
                                {(['used', 'scrapped'] as const).map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[s.partTypeToggleBtn, partUsageType === t && s.partTypeToggleBtnActive]}
                                        onPress={() => setPartUsageType(t)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[s.partTypeToggleTxt, partUsageType === t && s.partTypeToggleTxtActive]}>
                                            {t === 'used' ? 'Used' : 'Scrapped'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Buttons */}
                            <View style={[s.logModalActions, { marginTop: 20 }]}>
                                <TouchableOpacity style={s.logCancelBtn} onPress={() => setPartModal(false)} disabled={savingPart} activeOpacity={0.7}>
                                    <Text style={s.logCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.logSaveBtn, savingPart && { opacity: 0.6 }]} onPress={handleAddPart} disabled={savingPart} activeOpacity={0.85}>
                                    {savingPart
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : <Text style={s.logSaveText}>Save Part</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Item picker sub-modal ────────────────────────────── */}
            <Modal visible={itemPickerOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setItemPickerOpen(false)}>
                <TouchableOpacity style={s.logModalOverlay} activeOpacity={1} onPress={() => setItemPickerOpen(false)} />
                <View style={[s.logModalSheet, { maxHeight: '75%' }]}>
                    <View style={s.logModalHandle} />
                    <Text style={s.logModalTitle}>Select Item</Text>
                    <TextInput
                        style={[s.logFormInput, { marginBottom: 10 }]}
                        placeholder="Search inventory…"
                        placeholderTextColor="#c8c8c8"
                        value={itemSearch}
                        onChangeText={setItemSearch}
                    />
                    {loadingItems ? (
                        <ActivityIndicator color="#111" style={{ marginVertical: 24 }} />
                    ) : (
                        <FlatList
                            data={allItems.filter(it =>
                                it.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                                it.code.toLowerCase().includes(itemSearch.toLowerCase())
                            )}
                            keyExtractor={it => String(it.id)}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item: it }) => (
                                <TouchableOpacity style={s.itemPickerRow} onPress={() => onSelectItem(it)} activeOpacity={0.75}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.itemPickerName} numberOfLines={1}>{it.name}</Text>
                                        <Text style={s.itemPickerMeta}>{it.code}{it.unit ? ` · ${it.unit}` : ''}</Text>
                                    </View>
                                    <Text style={s.itemPickerStock}>Stock: {it.total_stock}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={s.itemPickerEmpty}>No items found</Text>}
                            style={{ maxHeight: 320 }}
                        />
                    )}
                </View>
            </Modal>

            {/* ── Failure Analysis modal ──────────────────────────── */}
            <Modal visible={failureModal} transparent animationType="slide" statusBarTranslucent onRequestClose={() => !savingFailure && setFailureModal(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                    <TouchableOpacity style={s.logModalOverlay} activeOpacity={1} onPress={() => !savingFailure && setFailureModal(false)} />
                    <View style={[s.logModalSheet, { paddingBottom: 0 }]}>
                        <View style={s.logModalHandle} />
                        <Text style={s.logModalTitle}>Failure Analysis</Text>

                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

                            {/* Failure Code */}
                            <Text style={s.logFormLabel}>Failure Code</Text>
                            <TouchableOpacity style={s.partPickerRow} onPress={() => setFailureCodePickerOpen(true)} activeOpacity={0.8}>
                                <Text style={editFailureCode ? s.partPickerValue : s.partPickerPlaceholder} numberOfLines={1}>
                                    {editFailureCode
                                        ? FAILURE_CODES.find(f => f.key === editFailureCode)?.label ?? editFailureCode
                                        : 'Select failure code…'
                                    }
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color="#bbb" />
                            </TouchableOpacity>

                            {/* Root Cause */}
                            <Text style={[s.logFormLabel, { marginTop: 14 }]}>Root Cause</Text>
                            <TouchableOpacity style={s.partPickerRow} onPress={() => setRootCausePickerOpen(true)} activeOpacity={0.8}>
                                <Text style={editRootCause ? s.partPickerValue : s.partPickerPlaceholder} numberOfLines={1}>
                                    {editRootCause
                                        ? ROOT_CAUSES.find(r => r.key === editRootCause)?.label ?? editRootCause
                                        : 'Select root cause…'
                                    }
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color="#bbb" />
                            </TouchableOpacity>

                            {/* Resolution Notes */}
                            <Text style={[s.logFormLabel, { marginTop: 14 }]}>Resolution Notes</Text>
                            <TextInput
                                style={[s.logFormInput, s.logFormTextarea]}
                                placeholder="Describe what was done to resolve the issue…"
                                placeholderTextColor="#c8c8c8"
                                multiline
                                value={editResolutionNotes}
                                onChangeText={setEditResolutionNotes}
                            />

                            {/* Clear button */}
                            {(editFailureCode || editRootCause || editResolutionNotes) && (
                                <TouchableOpacity
                                    style={s.failureClearBtn}
                                    onPress={() => { setEditFailureCode(null); setEditRootCause(null); setEditResolutionNotes('') }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={s.failureClearTxt}>Clear all fields</Text>
                                </TouchableOpacity>
                            )}

                            {/* Buttons */}
                            <View style={[s.logModalActions, { marginTop: 20 }]}>
                                <TouchableOpacity style={s.logCancelBtn} onPress={() => setFailureModal(false)} disabled={savingFailure} activeOpacity={0.7}>
                                    <Text style={s.logCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.logSaveBtn, savingFailure && { opacity: 0.6 }]} onPress={handleSaveFailure} disabled={savingFailure} activeOpacity={0.85}>
                                    {savingFailure
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : <Text style={s.logSaveText}>Save</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Failure code picker ──────────────────────────────── */}
            <Modal visible={failureCodePickerOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setFailureCodePickerOpen(false)}>
                <TouchableOpacity style={s.logModalOverlay} activeOpacity={1} onPress={() => setFailureCodePickerOpen(false)} />
                <View style={s.logModalSheet}>
                    <View style={s.logModalHandle} />
                    <Text style={s.logModalTitle}>Failure Code</Text>
                    {FAILURE_CODES.map(f => (
                        <TouchableOpacity
                            key={f.key}
                            style={[s.itemPickerRow, editFailureCode === f.key && s.pickerRowSelected]}
                            onPress={() => { setEditFailureCode(f.key); setFailureCodePickerOpen(false) }}
                            activeOpacity={0.75}
                        >
                            <Text style={[s.itemPickerName, editFailureCode === f.key && { color: '#2a85ff' }]}>{f.label}</Text>
                            {editFailureCode === f.key && <Ionicons name="checkmark" size={18} color="#2a85ff" />}
                        </TouchableOpacity>
                    ))}
                </View>
            </Modal>

            {/* ── Root cause picker ───────────────────────────────── */}
            <Modal visible={rootCausePickerOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setRootCausePickerOpen(false)}>
                <TouchableOpacity style={s.logModalOverlay} activeOpacity={1} onPress={() => setRootCausePickerOpen(false)} />
                <View style={s.logModalSheet}>
                    <View style={s.logModalHandle} />
                    <Text style={s.logModalTitle}>Root Cause</Text>
                    {ROOT_CAUSES.map(r => (
                        <TouchableOpacity
                            key={r.key}
                            style={[s.itemPickerRow, editRootCause === r.key && s.pickerRowSelected]}
                            onPress={() => { setEditRootCause(r.key); setRootCausePickerOpen(false) }}
                            activeOpacity={0.75}
                        >
                            <Text style={[s.itemPickerName, editRootCause === r.key && { color: '#2a85ff' }]}>{r.label}</Text>
                            {editRootCause === r.key && <Ionicons name="checkmark" size={18} color="#2a85ff" />}
                        </TouchableOpacity>
                    ))}
                </View>
            </Modal>

            {/* ── Warehouse picker sub-modal ───────────────────────── */}
            <Modal visible={warehousePickerOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setWarehousePickerOpen(false)}>
                <TouchableOpacity style={s.logModalOverlay} activeOpacity={1} onPress={() => setWarehousePickerOpen(false)} />
                <View style={s.logModalSheet}>
                    <View style={s.logModalHandle} />
                    <Text style={s.logModalTitle}>Select Warehouse</Text>
                    {partWarehouses.map(wh => (
                        <TouchableOpacity
                            key={wh.id}
                            style={s.itemPickerRow}
                            onPress={() => { setPartWarehouse({ id: wh.id, name: wh.name }); setWarehousePickerOpen(false) }}
                            activeOpacity={0.75}
                        >
                            <Text style={s.itemPickerName}>{wh.name ?? `Warehouse #${wh.id}`}</Text>
                            <Text style={s.itemPickerStock}>Stock: {wh.stock}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
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
        paddingBottom:        80,
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

    /* Attachments tab */
    attachWrap:   { paddingHorizontal: 16, gap: 10 },
    emptyTabSub:  { fontSize: 13, color: '#bbb', textAlign: 'center' },

    uploadingRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#2a85ff10', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
    },
    uploadingText: { fontSize: 13, color: '#2a85ff', fontWeight: '600' },

    attachCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#f0f0f0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    attachIconWrap: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    attachInfo:   { flex: 1 },
    attachName:   { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 3 },
    attachMeta:   { fontSize: 12, color: '#b0b8c1', fontWeight: '500' },
    attachDelete: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: '#ff6a5510', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },

    /* Attachment picker sheet */
    attachPickerSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 24, paddingTop: 14, paddingBottom: 48,
    },
    attachPickerRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
    },
    attachPickerIcon: {
        width: 46, height: 46, borderRadius: 13,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    attachPickerTexts: { flex: 1 },
    attachPickerLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
    attachPickerSub:   { fontSize: 12, color: '#aaa', marginTop: 2 },
    attachCancelBtn: {
        marginTop: 18, height: 52, borderRadius: 14,
        backgroundColor: '#f5f5f5',
        alignItems: 'center', justifyContent: 'center',
    },
    attachCancelText: { fontSize: 15, fontWeight: '700', color: '#666' },

    /* Parts tab */
    partsWrap: { paddingHorizontal: 16, gap: 10 },
    partCard: {
        flexDirection:    'row',
        alignItems:       'center',
        backgroundColor:  '#fff',
        borderRadius:     14,
        padding:          14,
        borderWidth:      1,
        borderColor:      '#f0f0f0',
        shadowColor:      '#000',
        shadowOffset:     { width: 0, height: 1 },
        shadowOpacity:    0.04,
        shadowRadius:     4,
        elevation:        2,
    },
    partCardLeft:     { flex: 1, marginRight: 10 },
    partName:         { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 3 },
    partMeta:         { fontSize: 12, color: '#b0b8c1', fontWeight: '500' },
    partCost:         { fontSize: 12, fontWeight: '700', color: '#10b981', marginTop: 3 },
    partRight:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
    partQtyText:      { fontSize: 14, fontWeight: '700', color: '#111' },
    partTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical:   3,
        borderRadius:      20,
        backgroundColor:   '#2a85ff15',
    },
    partTypeScrapped: { backgroundColor: '#ff6a5515' },
    partTypeText:     { fontSize: 11, fontWeight: '700', color: '#2a85ff' },
    partTypeTextScrapped: { color: '#ff6a55' },
    partDeleteBtn: {
        width:           34,
        height:          34,
        borderRadius:    10,
        backgroundColor: '#ff6a5510',
        alignItems:      'center',
        justifyContent:  'center',
    },

    /* Part form */
    partPickerRow: {
        flexDirection:     'row',
        alignItems:        'center',
        borderWidth:       1,
        borderColor:       '#e8e8e8',
        borderRadius:      12,
        paddingHorizontal: 14,
        paddingVertical:   12,
        backgroundColor:   '#fafafa',
        gap:               6,
    },
    partPickerValue:       { flex: 1, fontSize: 14, fontWeight: '600', color: '#111' },
    partPickerSub:         { fontSize: 11, color: '#aaa', marginTop: 2 },
    partPickerPlaceholder: { flex: 1, fontSize: 14, color: '#c8c8c8' },
    partTypeToggle: {
        flexDirection:  'row',
        gap:            8,
        marginTop:      4,
    },
    partTypeToggleBtn: {
        flex:              1,
        paddingVertical:   12,
        borderRadius:      12,
        borderWidth:       1,
        borderColor:       '#e5e5e5',
        backgroundColor:   '#fafafa',
        alignItems:        'center',
    },
    partTypeToggleBtnActive: { backgroundColor: '#111', borderColor: '#111' },
    partTypeToggleTxt:       { fontSize: 14, fontWeight: '600', color: '#888' },
    partTypeToggleTxtActive: { color: '#fff' },

    /* Item / warehouse picker rows */
    itemPickerRow: {
        flexDirection:     'row',
        alignItems:        'center',
        paddingVertical:   12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        gap:               8,
    },
    itemPickerName:  { fontSize: 14, fontWeight: '600', color: '#111', flex: 1 },
    itemPickerMeta:  { fontSize: 12, color: '#aaa', marginTop: 1 },
    itemPickerStock: { fontSize: 12, fontWeight: '700', color: '#2a85ff' },
    itemPickerEmpty: { textAlign: 'center', color: '#bbb', paddingVertical: 24, fontSize: 14 },

    /* Failure Analysis */
    failureHeader: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   10,
    },
    failureEditBtn: {
        flexDirection:  'row',
        alignItems:     'center',
        gap:            4,
        paddingHorizontal: 10,
        paddingVertical:   5,
        borderRadius:   20,
        backgroundColor: '#2a85ff15',
    },
    failureEditTxt: { fontSize: 12, fontWeight: '700', color: '#2a85ff' },
    failureCard: {
        backgroundColor: '#fafafa',
        borderRadius:    12,
        borderWidth:     1,
        borderColor:     '#f0f0f0',
        padding:         12,
        gap:             10,
    },
    failureRow: {
        flexDirection: 'row',
        alignItems:    'flex-start',
        gap:           8,
    },
    failureRowLabel: { fontSize: 12, color: '#aaa', fontWeight: '600', width: 110, flexShrink: 0 },
    failureRowValue: { fontSize: 13, fontWeight: '600', color: '#222', flex: 1 },
    failureResText:  { fontSize: 13, color: '#444', lineHeight: 20 },
    failureEmpty:    { fontSize: 13, color: '#bbb', fontStyle: 'italic' },
    failureClearBtn: { marginTop: 6, alignSelf: 'flex-start' },
    failureClearTxt: { fontSize: 12, color: '#ff6a55', fontWeight: '600' },
    pickerRowSelected: { backgroundColor: '#2a85ff08' },

    /* Pending approval banner */
    pendingBanner: {
        marginHorizontal: 16,
        marginBottom:     12,
        backgroundColor:  '#fef3c7',
        borderRadius:     14,
        borderWidth:      1,
        borderColor:      '#fde68a',
        padding:          14,
        gap:              10,
    },
    pendingBannerLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
    pendingBannerTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 2 },
    pendingBannerSub:   { fontSize: 12, color: '#b45309' },
    pendingBannerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    approveBtn: {
        flex:            1,
        height:          40,
        borderRadius:    10,
        backgroundColor: '#10b981',
        alignItems:      'center',
        justifyContent:  'center',
    },
    approveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    rejectBtn: {
        flex:            1,
        height:          40,
        borderRadius:    10,
        backgroundColor: '#fff',
        borderWidth:     1,
        borderColor:     '#dc2626',
        alignItems:      'center',
        justifyContent:  'center',
    },
    rejectBtnText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },

    /* Rejected banner */
    rejectedBanner: {
        marginHorizontal: 16,
        marginBottom:     12,
        backgroundColor:  '#fee2e2',
        borderRadius:     14,
        borderWidth:      1,
        borderColor:      '#fca5a5',
        padding:          14,
        flexDirection:    'row',
        alignItems:       'center',
        gap:              8,
    },
    rejectedBannerText: { fontSize: 14, fontWeight: '600', color: '#dc2626', flex: 1 },

    /* Reject reason modal */
    modalOverlay: {
        flex:            1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         24,
    },
    rejectModal: {
        backgroundColor: '#fff',
        borderRadius:    20,
        padding:         24,
        width:           '100%',
    },
    rejectModalTitle: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 6 },
    rejectModalSub:   { fontSize: 13, color: '#888', marginBottom: 14 },
    rejectReasonInput: {
        borderWidth:      1,
        borderColor:      '#e5e5e5',
        borderRadius:     12,
        padding:          12,
        fontSize:         14,
        color:            '#111',
        textAlignVertical:'top',
        minHeight:        80,
        marginBottom:     18,
    },
    rejectModalButtons:     { flexDirection: 'row', gap: 10 },
    rejectModalCancel: {
        flex:            1,
        height:          46,
        borderRadius:    12,
        backgroundColor: '#f5f5f5',
        alignItems:      'center',
        justifyContent:  'center',
    },
    rejectModalCancelText:  { fontSize: 14, fontWeight: '700', color: '#555' },
    rejectModalConfirm: {
        flex:            1,
        height:          46,
        borderRadius:    12,
        backgroundColor: '#dc2626',
        alignItems:      'center',
        justifyContent:  'center',
    },
    rejectModalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})
