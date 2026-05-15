import { useRef, useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import Notification from '@/components/ui/Notification'
import Dialog from '@/components/ui/Dialog'
import toast from '@/components/ui/toast'
import { TbDownload, TbTrash, TbPaperclip, TbClock, TbCurrencyDollar, TbPlus, TbPencil } from 'react-icons/tb'
import dayjs from 'dayjs'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import {
    apiAddWorkOrderComment,
    apiDeleteWorkOrderComment,
    apiAddWorkOrderAttachment,
    apiDeleteWorkOrderAttachment,
    getAttachmentDownloadUrl,
    apiAddWorkLog,
    apiUpdateWorkLog,
    apiDeleteWorkLog,
} from '@/services/WorkOrdersService'
import type {
    WorkOrderComment,
    WorkOrderAttachment,
    WorkLog,
    WorkOrder,
} from '@/services/WorkOrdersService'

const { TabNav, TabList, TabContent } = Tabs

function formatBytes(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function AuthorAvatar({ name }: { name: string }) {
    return (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm select-none">
            {name.charAt(0).toUpperCase()}
        </div>
    )
}

type DeleteTarget =
    | { type: 'comment'; id: number }
    | { type: 'attachment'; id: number }
    | { type: 'worklog'; id: number }

type LogForm = {
    labor_minutes: string
    labor_cost: string
    notes: string
}

const EMPTY_LOG_FORM: LogForm = {
    labor_minutes: '',
    labor_cost: '',
    notes: '',
}

const CAN_LOG_STATUSES: WorkOrder['status'][] = ['in_progress', 'completed']

type Props = {
    workOrderId: string | number
    woStatus: WorkOrder['status']
    initialComments: WorkOrderComment[]
    initialAttachments: WorkOrderAttachment[]
    initialWorkLogs: WorkLog[]
    canEdit: boolean
}

const WoFooter = ({
    workOrderId,
    woStatus,
    initialComments,
    initialAttachments,
    initialWorkLogs,
    canEdit,
}: Props) => {
    // ── Session ───────────────────────────────────────────────────────────────
    const userAuthority = useSessionUser((s) => s.user.authority)
    const currentMemberId = useSessionUser((s) => s.user.memberId)
    const isAdmin   = useAuthority(userAuthority, [ADMIN])
    const isManager = useAuthority(userAuthority, [MANAGER])

    // ── State ─────────────────────────────────────────────────────────────────
    const [comments, setComments]       = useState<WorkOrderComment[]>(initialComments)
    const [attachments, setAttachments] = useState<WorkOrderAttachment[]>(initialAttachments)
    const [workLogs, setWorkLogs]       = useState<WorkLog[]>(initialWorkLogs)

    const [submitting, setSubmitting] = useState(false)
    const [uploading, setUploading]   = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
    const [deleting, setDeleting]         = useState(false)

    // Log dialog — shared for add + edit
    const [logDialog, setLogDialog]       = useState<{ open: boolean; editingId: number | null }>({ open: false, editingId: null })
    const [savingLog, setSavingLog]       = useState(false)
    const [logForm, setLogForm]           = useState<LogForm>(EMPTY_LOG_FORM)

    const commentRef  = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // ── Permission helpers ────────────────────────────────────────────────────
    const canLog = canEdit && CAN_LOG_STATUSES.includes(woStatus)

    const canEditLog = (log: WorkLog): boolean => {
        if (isAdmin || isManager) return true
        // Technician: own log only, WO must be in_progress
        return log.member_id === currentMemberId && woStatus === 'in_progress'
    }

    const canDeleteLog = (): boolean => isAdmin

    // ── Totals ────────────────────────────────────────────────────────────────
    const totalMinutes = workLogs.reduce((acc, l) => acc + (l.labor_minutes ?? 0), 0)
    const totalCost    = workLogs.reduce((acc, l) => acc + (l.labor_cost ?? 0), 0)

    // ── Comments ──────────────────────────────────────────────────────────────
    const handleAddComment = async () => {
        const body = commentRef.current?.value?.trim()
        if (!body) return
        setSubmitting(true)
        try {
            const resp = await apiAddWorkOrderComment(workOrderId, body)
            const newComment = (resp as { data: WorkOrderComment }).data
            setComments((prev) => [...prev, newComment])
            if (commentRef.current) commentRef.current.value = ''
        } catch {
            toast.push(<Notification type="danger">Failed to add comment.</Notification>, { placement: 'top-center' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment()
    }

    // ── File upload ───────────────────────────────────────────────────────────
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const resp = await apiAddWorkOrderAttachment(workOrderId, file)
            const newAttachment = (resp as { data: WorkOrderAttachment }).data
            setAttachments((prev) => [...prev, newAttachment])
        } catch {
            toast.push(<Notification type="danger">Failed to upload file.</Notification>, { placement: 'top-center' })
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // ── Delete (shared confirm) ───────────────────────────────────────────────
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            if (deleteTarget.type === 'comment') {
                await apiDeleteWorkOrderComment(workOrderId, deleteTarget.id)
                setComments((prev) => prev.filter((c) => c.id !== deleteTarget.id))
            } else if (deleteTarget.type === 'attachment') {
                await apiDeleteWorkOrderAttachment(workOrderId, deleteTarget.id)
                setAttachments((prev) => prev.filter((a) => a.id !== deleteTarget.id))
            } else {
                await apiDeleteWorkLog(workOrderId, deleteTarget.id)
                setWorkLogs((prev) => prev.filter((l) => l.id !== deleteTarget.id))
            }
            setDeleteTarget(null)
        } catch {
            toast.push(<Notification type="danger">Failed to delete.</Notification>, { placement: 'top-center' })
        } finally {
            setDeleting(false)
        }
    }

    // ── Work Log dialog ───────────────────────────────────────────────────────
    const openAddLog = () => {
        setLogForm(EMPTY_LOG_FORM)
        setLogDialog({ open: true, editingId: null })
    }

    const openEditLog = (log: WorkLog) => {
        setLogForm({
            labor_minutes: String(log.labor_minutes),
            labor_cost: log.labor_cost != null ? String(log.labor_cost) : '',
            notes: log.notes ?? '',
        })
        setLogDialog({ open: true, editingId: log.id })
    }

    const closeLogDialog = () => {
        setLogDialog({ open: false, editingId: null })
        setLogForm(EMPTY_LOG_FORM)
    }

    const handleSaveLog = async () => {
        const mins = parseInt(logForm.labor_minutes, 10)
        if (!mins || mins < 1) {
            toast.push(<Notification type="warning">Duration (minutes) is required.</Notification>, { placement: 'top-center' })
            return
        }
        setSavingLog(true)
        try {
            const payload = {
                labor_minutes: mins,
                labor_cost: logForm.labor_cost ? parseFloat(logForm.labor_cost) : null,
                notes: logForm.notes || null,
            }

            if (logDialog.editingId !== null) {
                const resp = await apiUpdateWorkLog(workOrderId, logDialog.editingId, payload)
                const updated = (resp as { data: WorkLog }).data
                setWorkLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
            } else {
                const resp = await apiAddWorkLog(workOrderId, payload)
                const newLog = (resp as { data: WorkLog }).data
                setWorkLogs((prev) => [newLog, ...prev])
            }

            closeLogDialog()
        } catch {
            toast.push(<Notification type="danger">Failed to save work log.</Notification>, { placement: 'top-center' })
        } finally {
            setSavingLog(false)
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Tabs className="mt-8" defaultValue="comments">
                <TabList>
                    <TabNav value="comments">Comments</TabNav>
                    <TabNav value="attachments">Attachments</TabNav>
                    <TabNav value="worklogs">Work Logs</TabNav>
                </TabList>

                <div className="py-6">
                    {/* ── Comments ── */}
                    <TabContent value="comments">
                        <div className="space-y-6">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3 group">
                                    <AuthorAvatar name={comment.author} />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                                {comment.author}
                                            </span>
                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                            <span className="text-sm text-gray-400">
                                                {dayjs(comment.created_at).format('D MMM YYYY')}
                                            </span>
                                            {canEdit && (
                                                <button
                                                    className="ml-auto opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                                                    onClick={() => setDeleteTarget({ type: 'comment', id: comment.id })}
                                                >
                                                    <TbTrash className="text-base" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                                            {comment.body}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {comments.length === 0 && !canEdit && (
                                <p className="text-sm text-gray-400 text-center py-4">No comments yet.</p>
                            )}

                            {canEdit && (
                                <div className="flex gap-3">
                                    <AuthorAvatar name="Me" />
                                    <div className="flex-1 relative">
                                        <textarea
                                            ref={commentRef}
                                            rows={3}
                                            placeholder="Write comment"
                                            onKeyDown={handleKeyDown}
                                            className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                                        />
                                        <button
                                            onClick={handleAddComment}
                                            disabled={submitting}
                                            className="absolute bottom-3 right-4 text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                                        >
                                            {submitting ? 'Sending...' : 'Send'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabContent>

                    {/* ── Attachments ── */}
                    <TabContent value="attachments">
                        {canEdit && (
                            <div className="mb-5">
                                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                                <Button icon={<TbPaperclip />} loading={uploading} onClick={() => fileInputRef.current?.click()}>
                                    Upload File
                                </Button>
                            </div>
                        )}

                        {attachments.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {attachments.map((file) => {
                                    const isImage = file.mime_type?.startsWith('image/')
                                    return (
                                        <div key={file.id} className="bg-gray-100 dark:bg-gray-700/60 rounded-xl overflow-hidden">
                                            <div className="h-36 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                                {isImage && file.url ? (
                                                    <img src={file.url} alt={file.original_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                                        <TbPaperclip className="text-4xl" />
                                                        <span className="text-xs font-medium uppercase tracking-wide">
                                                            {file.original_name.split('.').pop()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="px-3 pt-2 pb-2">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{file.original_name}</p>
                                                <p className="text-xs text-amber-500 font-medium mt-0.5">{formatBytes(file.size_bytes)}</p>
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    <Tooltip title="Download">
                                                        <a href={getAttachmentDownloadUrl(workOrderId, file.id)} download={file.original_name}>
                                                            <Button variant="plain" size="xs" icon={<TbDownload />} />
                                                        </a>
                                                    </Tooltip>
                                                    {canEdit && (
                                                        <Tooltip title="Delete">
                                                            <Button
                                                                variant="plain"
                                                                size="xs"
                                                                icon={<TbTrash />}
                                                                onClick={() => setDeleteTarget({ type: 'attachment', id: file.id })}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <TbPaperclip className="text-5xl mb-3" />
                                <p className="font-semibold text-sm">No attachments</p>
                                {canEdit && <p className="text-xs mt-1">Click "Upload File" to add one</p>}
                            </div>
                        )}
                    </TabContent>

                    {/* ── Work Logs ── */}
                    <TabContent value="worklogs">
                        {/* Summary bar */}
                        {workLogs.length > 0 && (
                            <div className="flex flex-wrap gap-4 mb-5 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <div className="flex items-center gap-2 text-sm">
                                    <TbClock className="text-primary text-lg" />
                                    <span className="text-gray-500 dark:text-gray-400">Total time:</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMinutes(totalMinutes)}</span>
                                </div>
                                {totalCost > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <TbCurrencyDollar className="text-emerald-500 text-lg" />
                                        <span className="text-gray-500 dark:text-gray-400">Total cost:</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">${totalCost.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Log Time button */}
                        {canLog && (
                            <div className="mb-5">
                                <Button icon={<TbPlus />} onClick={openAddLog}>Log Time</Button>
                            </div>
                        )}

                        {!canLog && !CAN_LOG_STATUSES.includes(woStatus) && (
                            <p className="text-xs text-gray-400 mb-4">
                                Work logs can be added when the work order is <strong>In Progress</strong> or <strong>Completed</strong>.
                            </p>
                        )}

                        {/* Log entries */}
                        {workLogs.length > 0 ? (
                            <div className="space-y-3">
                                {workLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex gap-3 group p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors"
                                    >
                                        <AuthorAvatar name={log.author} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{log.author}</span>
                                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                                <span className="text-sm text-gray-400">{dayjs(log.created_at).format('D MMM YYYY')}</span>

                                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-semibold ml-auto">
                                                    <TbClock className="text-sm" />
                                                    {formatMinutes(log.labor_minutes)}
                                                </span>

                                                {log.labor_cost != null && log.labor_cost > 0 && (
                                                    <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
                                                        ${log.labor_cost.toFixed(2)}
                                                    </span>
                                                )}

                                                {/* Action buttons — shown on hover */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    {canEditLog(log) && (
                                                        <Tooltip title="Edit">
                                                            <button
                                                                className="text-gray-400 hover:text-primary transition-colors"
                                                                onClick={() => openEditLog(log)}
                                                            >
                                                                <TbPencil className="text-base" />
                                                            </button>
                                                        </Tooltip>
                                                    )}
                                                    {canDeleteLog() && (
                                                        <Tooltip title="Delete">
                                                            <button
                                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                                onClick={() => setDeleteTarget({ type: 'worklog', id: log.id })}
                                                            >
                                                                <TbTrash className="text-base" />
                                                            </button>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </div>

                                            {log.notes && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed mt-1">
                                                    {log.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <TbClock className="text-5xl mb-3" />
                                <p className="font-semibold text-sm">No work logs yet</p>
                                {canLog && <p className="text-xs mt-1">Click "Log Time" to record work done</p>}
                            </div>
                        )}
                    </TabContent>
                </div>
            </Tabs>

            {/* ── Confirm delete ── */}
            <Dialog
                isOpen={deleteTarget !== null}
                onClose={() => !deleting && setDeleteTarget(null)}
                onRequestClose={() => !deleting && setDeleteTarget(null)}
            >
                <h5 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Confirm Delete</h5>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Are you sure you want to delete this {deleteTarget?.type === 'worklog' ? 'work log' : deleteTarget?.type}? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                    <Button variant="plain" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                    <Button
                        variant="solid"
                        customColorClass={() => 'border-red-500 ring-red-500 bg-red-500 hover:bg-red-600 text-white'}
                        loading={deleting}
                        onClick={handleConfirmDelete}
                    >
                        Delete
                    </Button>
                </div>
            </Dialog>

            {/* ── Add / Edit Work Log ── */}
            <Dialog
                isOpen={logDialog.open}
                onClose={closeLogDialog}
                onRequestClose={closeLogDialog}
            >
                <h5 className="mb-5 font-semibold text-gray-900 dark:text-gray-100">
                    {logDialog.editingId !== null ? 'Edit Work Log' : 'Log Work Time'}
                </h5>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Duration (minutes) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={logForm.labor_minutes}
                            onChange={(e) => setLogForm((f) => ({ ...f, labor_minutes: e.target.value }))}
                            placeholder="e.g. 90"
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                        />
                        {logForm.labor_minutes && parseInt(logForm.labor_minutes) >= 60 && (
                            <p className="text-xs text-gray-400 mt-1">= {formatMinutes(parseInt(logForm.labor_minutes))}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Labor Cost ($)
                        </label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={logForm.labor_cost}
                            onChange={(e) => setLogForm((f) => ({ ...f, labor_cost: e.target.value }))}
                            placeholder="Optional"
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                        <textarea
                            rows={3}
                            value={logForm.notes}
                            onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))}
                            placeholder="What was done..."
                            className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={closeLogDialog} disabled={savingLog}>Cancel</Button>
                    <Button variant="solid" loading={savingLog} onClick={handleSaveLog}>
                        {logDialog.editingId !== null ? 'Save Changes' : 'Save Log'}
                    </Button>
                </div>
            </Dialog>
        </>
    )
}

export default WoFooter
