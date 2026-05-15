import { useState } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import PrintLabelDialog from '@/components/shared/PrintLabelDialog'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Badge from '@/components/ui/Badge'
import Dropdown from '@/components/ui/Dropdown'
import DatePicker from '@/components/ui/DatePicker'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import WoField from './components/WoField'
import WoFieldDropdown from './components/WoFieldDropdown'
import WoActivity from './components/WoActivity'
import WoFooter from './components/WoFooter'
import {
    apiGetWorkOrderById,
    apiUpdateWorkOrder,
} from '@/services/WorkOrdersService'
import { apiGetMembersList } from '@/services/MembersService'
import { useNavigate, useParams } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER, TECHNICIAN } from '@/constants/roles.constant'
import { mutate as globalMutate } from 'swr'
import useSWR from 'swr'
import dayjs from 'dayjs'
import {
    TbArrowNarrowLeft,
    TbPencil,
    TbQrcode,
    TbCircle,
    TbFlag,
    TbFlag2Filled,
    TbUser,
    TbClock,
    TbEngine,
    TbCheck,
    TbCalendar,
} from 'react-icons/tb'
import type { WorkOrder } from '@/services/WorkOrdersService'
import type { WorkOrderResponse } from '@/services/WorkOrdersService'
import type { MembersListResponse } from '@/services/MembersService'

const STATUS_OPTIONS: { value: WorkOrder['status']; label: string; color: string }[] = [
    { value: 'open', label: 'Open', color: 'bg-blue-500' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-amber-500' },
    { value: 'on_hold', label: 'On Hold', color: 'bg-gray-400' },
    { value: 'completed', label: 'Completed', color: 'bg-emerald-500' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
]

const PRIORITY_OPTIONS: { value: WorkOrder['priority']; label: string; flagClass: string; bgClass: string }[] = [
    { value: 'low', label: 'Low', flagClass: 'text-success', bgClass: 'bg-success' },
    { value: 'medium', label: 'Medium', flagClass: 'text-warning', bgClass: 'bg-warning' },
    { value: 'high', label: 'High', flagClass: 'text-error', bgClass: 'bg-error' },
    { value: 'critical', label: 'Critical', flagClass: 'text-red-700', bgClass: 'bg-red-700' },
]

const statusTagClass: Record<WorkOrder['status'], string> = {
    open: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    in_progress: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    on_hold: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    completed: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    cancelled: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
}

const WorkOrderDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER, TECHNICIAN])
    const canAssign = useAuthority(userAuthority, [ADMIN, MANAGER])

    const [wo, setWo] = useState<WorkOrder | null>(null)
    const [editingDescription, setEditingDescription] = useState(false)
    const [descriptionDraft, setDescriptionDraft] = useState('')
    const [printOpen, setPrintOpen] = useState(false)

    const { isLoading } = useSWR<WorkOrder>(
        id ? ['/work-orders/details', id] : null,
        async () => {
            const resp = await apiGetWorkOrderById<WorkOrderResponse>(id!)
            return resp.data.work_order
        },
        {
            revalidateOnFocus: false,
            onSuccess: (data) => {
                setWo(data)
                setDescriptionDraft(data.description || '')
            },
        },
    )

    const { data: membersData } = useSWR(
        '/members-all',
        () => apiGetMembersList<MembersListResponse>({ per_page: 100 }),
        { revalidateOnFocus: false },
    )

    const memberList = membersData?.data?.members || []

    const patch = async (payload: Parameters<typeof apiUpdateWorkOrder>[1]) => {
        if (!id || !wo) return
        try {
            const resp = await apiUpdateWorkOrder(id, payload)
            setWo(resp.data.work_order)
            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    (key[0] === '/work-orders' ||
                        key[0] === '/work-orders-board'),
            )
        } catch {
            toast.push(
                <Notification type="danger">Failed to update.</Notification>,
                { placement: 'top-center' },
            )
        }
    }

    const handleStatusChange = (value: string) => {
        patch({ status: value as WorkOrder['status'] })
    }

    const handlePriorityChange = (value: string) => {
        patch({ priority: value as WorkOrder['priority'] })
    }

    const handleDueDateChange = (date: Date | null) => {
        patch({ due_at: date ? dayjs(date).format('YYYY-MM-DD') : null })
    }

    const handleMemberToggle = (memberId: string) => {
        if (!wo) return
        const currentIds = wo.assigned_members.map((m) => m.id)
        const numId = parseInt(memberId, 10)
        const newIds = currentIds.includes(numId)
            ? currentIds.filter((i) => i !== numId)
            : [...currentIds, numId]
        patch({ assigned_member_ids: newIds })
    }

    const handleDescriptionBlur = () => {
        setEditingDescription(false)
        if (descriptionDraft !== (wo?.description || '')) {
            patch({ description: descriptionDraft || null })
        }
    }

    const handleTitleBlur = (value: string) => {
        if (value && value !== wo?.title) {
            patch({ title: value })
        }
    }

    const currentStatus = STATUS_OPTIONS.find((s) => s.value === wo?.status)
    const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === wo?.priority)

    return (
        <AdaptiveCard>
            <Loading loading={isLoading}>
                {wo && (
                    <>
                        {/* Back button */}
                        <div className="flex items-center justify-between mb-6">
                            <Button
                                variant="plain"
                                icon={<TbArrowNarrowLeft />}
                                onClick={() =>
                                    navigate(
                                        '/concepts/work-orders/work-order-list',
                                    )
                                }
                            >
                                Back to Work Orders
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="default"
                                    icon={<TbQrcode />}
                                    onClick={() => setPrintOpen(true)}
                                >
                                    Print Label
                                </Button>
                                {canEdit && (
                                    <Button
                                        icon={<TbPencil />}
                                        onClick={() =>
                                            navigate(
                                                `/concepts/work-orders/work-order-edit/${wo.id}`,
                                            )
                                        }
                                    >
                                        Edit form
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* LEFT: Main content */}
                            <div className="xl:col-span-2 px-2">
                                {/* Header */}
                                <div className="flex flex-col gap-2 mb-8">
                                    <div className="flex items-center gap-2">
                                        <Tag className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-mono text-sm border-0">
                                            {wo.code}
                                        </Tag>
                                    </div>
                                    <input
                                        className="text-2xl font-bold outline-none bg-transparent text-gray-900 dark:text-gray-100 border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-primary transition-colors"
                                        defaultValue={wo.title}
                                        disabled={!canEdit}
                                        onBlur={(e) =>
                                            handleTitleBlur(e.target.value)
                                        }
                                    />
                                </div>

                                {/* Fields grid */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 mb-8">
                                    <div className="flex flex-col">
                                        {/* Status */}
                                        <WoFieldDropdown
                                            title="Status"
                                            icon={<TbCircle />}
                                            disabled={!canEdit}
                                            trigger={
                                                <Tag
                                                    className={`text-xs ${statusTagClass[wo.status]}`}
                                                >
                                                    {currentStatus?.label}
                                                </Tag>
                                            }
                                        >
                                            {STATUS_OPTIONS.map((opt) => (
                                                <Dropdown.Item
                                                    key={opt.value}
                                                    eventKey={opt.value}
                                                    active={
                                                        opt.value === wo.status
                                                    }
                                                    onSelect={
                                                        handleStatusChange
                                                    }
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`w-2 h-2 rounded-full ${opt.color}`}
                                                        />
                                                        {opt.label}
                                                    </div>
                                                </Dropdown.Item>
                                            ))}
                                        </WoFieldDropdown>

                                        {/* Priority */}
                                        <WoFieldDropdown
                                            title="Priority"
                                            icon={<TbFlag />}
                                            disabled={!canEdit}
                                            trigger={
                                                <div className="flex items-center gap-2">
                                                    <TbFlag2Filled
                                                        className={`text-lg ${currentPriority?.flagClass}`}
                                                    />
                                                    <span className="font-semibold">
                                                        {currentPriority?.label}
                                                    </span>
                                                </div>
                                            }
                                        >
                                            {PRIORITY_OPTIONS.map((opt) => (
                                                <Dropdown.Item
                                                    key={opt.value}
                                                    eventKey={opt.value}
                                                    active={
                                                        opt.value === wo.priority
                                                    }
                                                    onSelect={
                                                        handlePriorityChange
                                                    }
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            innerClass={
                                                                opt.bgClass
                                                            }
                                                        />
                                                        <span>{opt.label}</span>
                                                    </div>
                                                </Dropdown.Item>
                                            ))}
                                        </WoFieldDropdown>

                                        {/* Asset */}
                                        <WoField title="Asset" icon={<TbEngine />}>
                                            <div className="flex px-3 items-center min-h-[46px] text-sm text-gray-600 dark:text-gray-300">
                                                {wo.asset?.name || '—'}
                                                {wo.asset && (
                                                    <span className="ml-2 font-mono text-xs text-gray-400">
                                                        {wo.asset.code}
                                                    </span>
                                                )}
                                            </div>
                                        </WoField>
                                    </div>

                                    <div className="flex flex-col">
                                        {/* Assigned members — Admin / Manager only can edit */}
                                        <WoFieldDropdown
                                            title="Assigned to"
                                            icon={<TbUser />}
                                            disabled={!canAssign}
                                            trigger={
                                                wo.assigned_members.length > 0 ? (
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {wo.assigned_members.map(
                                                            (m) => (
                                                                <span
                                                                    key={m.id}
                                                                    className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-full"
                                                                >
                                                                    {m.name}
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400">
                                                        No assignees
                                                    </span>
                                                )
                                            }
                                        >
                                            {memberList.map((m) => {
                                                const isAssigned =
                                                    wo.assigned_members.some(
                                                        (a) => a.id === m.id,
                                                    )
                                                return (
                                                    <Dropdown.Item
                                                        key={m.id}
                                                        eventKey={String(m.id)}
                                                        onSelect={
                                                            handleMemberToggle
                                                        }
                                                    >
                                                        <div className="flex items-center gap-2 relative">
                                                            {isAssigned && (
                                                                <TbCheck className="absolute text-primary left-[-4px] text-lg" />
                                                            )}
                                                            <span
                                                                className={
                                                                    isAssigned
                                                                        ? 'ml-5'
                                                                        : ''
                                                                }
                                                            >
                                                                {m.user?.name ??
                                                                    m.employee_code}
                                                            </span>
                                                        </div>
                                                    </Dropdown.Item>
                                                )
                                            })}
                                        </WoFieldDropdown>

                                        {/* Due date */}
                                        <WoField title="Due Date" icon={<TbCalendar />}>
                                            <div className="flex items-center gap-1 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer w-full min-h-[46px] relative">
                                                <span
                                                    className={`text-sm font-semibold ${
                                                        wo.due_at &&
                                                        new Date(wo.due_at) <
                                                            new Date() &&
                                                        wo.status !==
                                                            'completed'
                                                            ? 'text-red-500'
                                                            : ''
                                                    }`}
                                                >
                                                    {wo.due_at
                                                        ? dayjs(wo.due_at).format('MMM D, YYYY')
                                                        : 'No due date'}
                                                </span>
                                                {canEdit && (
                                                    <DatePicker
                                                        className="opacity-0 cursor-pointer absolute inset-0"
                                                        value={
                                                            wo.due_at
                                                                ? dayjs(wo.due_at).toDate()
                                                                : null
                                                        }
                                                        inputtable={false}
                                                        inputPrefix={null}
                                                        inputSuffix={null}
                                                        clearable={false}
                                                        onChange={(date) =>
                                                            handleDueDateChange(date as Date | null)
                                                        }
                                                    />
                                                )}
                                            </div>
                                        </WoField>

                                        {/* Estimated time + actual logged */}
                                        <WoField title="Est. / Logged Time" icon={<TbClock />}>
                                            <div className="flex px-3 items-center min-h-[46px] text-sm text-gray-600 dark:text-gray-300 gap-2">
                                                <span>
                                                    {wo.estimated_minutes != null
                                                        ? `${wo.estimated_minutes} min est.`
                                                        : '— est.'}
                                                </span>
                                                {wo.work_logs_summary && wo.work_logs_summary.total_minutes > 0 && (
                                                    <>
                                                        <span className="text-gray-300 dark:text-gray-600">/</span>
                                                        <span className="font-semibold text-primary">
                                                            {wo.work_logs_summary.total_minutes} min logged
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </WoField>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mt-4">
                                    <h5 className="mb-3">Description</h5>
                                    {editingDescription ? (
                                        <textarea
                                            autoFocus
                                            className="w-full min-h-[120px] p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                            value={descriptionDraft}
                                            onChange={(e) =>
                                                setDescriptionDraft(
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={handleDescriptionBlur}
                                        />
                                    ) : (
                                        <div
                                            role={canEdit ? 'button' : undefined}
                                            className={`min-h-[80px] p-3 rounded-xl text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line ${
                                                canEdit
                                                    ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                    : ''
                                            }`}
                                            onClick={() => {
                                                if (canEdit)
                                                    setEditingDescription(true)
                                            }}
                                        >
                                            {wo.description ||
                                                (canEdit
                                                    ? 'Click to add a description...'
                                                    : 'No description.')}
                                        </div>
                                    )}
                                </div>

                                {/* Comments, Attachments & Work Logs */}
                                <WoFooter
                                    workOrderId={wo.id}
                                    woStatus={wo.status}
                                    initialComments={wo.comments || []}
                                    initialAttachments={wo.attachments || []}
                                    initialWorkLogs={wo.work_logs || []}
                                    canEdit={canEdit}
                                />
                            </div>

                            {/* RIGHT: Activity */}
                            <div>
                                <WoActivity
                                    history={wo.status_history || []}
                                    openedAt={wo.opened_at}
                                    createdBy={wo.created_by?.name || null}
                                />
                            </div>
                        </div>
                    </>
                )}
            </Loading>

            {wo && (
                <PrintLabelDialog
                    isOpen={printOpen}
                    onClose={() => setPrintOpen(false)}
                    type="work-order"
                    name={wo.title}
                    code={wo.code}
                    url={window.location.href}
                />
            )}
        </AdaptiveCard>
    )
}

export default WorkOrderDetails
