import { useState } from 'react'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useWorkOrderList from '../hooks/useWorkOrderList'
import { apiDeleteWorkOrder, apiUpdateWorkOrder } from '@/services/WorkOrdersService'
import { TbTrash, TbX } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'

const STATUS_OPTIONS = [
    { value: 'open',        label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold',     label: 'On Hold' },
    { value: 'completed',   label: 'Completed' },
    { value: 'cancelled',   label: 'Cancelled' },
]

const PRIORITY_OPTIONS = [
    { value: 'low',      label: 'Low' },
    { value: 'medium',   label: 'Medium' },
    { value: 'high',     label: 'High' },
    { value: 'critical', label: 'Critical' },
]

const Divider = () => (
    <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 shrink-0" />
)

const WorkOrderListSelected = () => {
    const { selectedWorkOrder, setSelectAllWorkOrder, mutate } = useWorkOrderList()
    const [deleteOpen, setDeleteOpen]   = useState(false)
    const [deleting, setDeleting]       = useState(false)
    const [bulkLoading, setBulkLoading] = useState(false)

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit   = useAuthority(userAuthority, ['work_orders.write', 'admin', 'manager'])
    const canDelete = useAuthority(userAuthority, ['work_orders.delete', 'admin'])

    if (selectedWorkOrder.length === 0) return null

    const count = selectedWorkOrder.length
    const label = count === 1 ? 'work order' : 'work orders'

    const handleBulkStatus = async (option: { value: string; label: string } | null) => {
        if (!option) return
        setBulkLoading(true)
        try {
            await Promise.all(
                selectedWorkOrder.map((wo) =>
                    apiUpdateWorkOrder(wo.id, { status: option.value as never }),
                ),
            )
            toast.push(
                <Notification type="success">
                    {count} {label} → <strong>{option.label}</strong>
                </Notification>,
                { placement: 'top-center' },
            )
            setSelectAllWorkOrder([])
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">Failed to update status.</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setBulkLoading(false)
        }
    }

    const handleBulkPriority = async (option: { value: string; label: string } | null) => {
        if (!option) return
        setBulkLoading(true)
        try {
            await Promise.all(
                selectedWorkOrder.map((wo) =>
                    apiUpdateWorkOrder(wo.id, { priority: option.value as never }),
                ),
            )
            toast.push(
                <Notification type="success">
                    {count} {label} → priority <strong>{option.label}</strong>
                </Notification>,
                { placement: 'top-center' },
            )
            setSelectAllWorkOrder([])
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">Failed to update priority.</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setBulkLoading(false)
        }
    }

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await Promise.all(selectedWorkOrder.map((wo) => apiDeleteWorkOrder(wo.id)))
            toast.push(
                <Notification type="success">
                    {count} {label} deleted.
                </Notification>,
                { placement: 'top-center' },
            )
            setSelectAllWorkOrder([])
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">Failed to delete some work orders.</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleting(false)
            setDeleteOpen(false)
        }
    }

    return (
        <>
            {/* Floating action bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl px-4 py-2.5 min-w-max">

                    {/* Selection count badge */}
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">
                            {count}
                        </span>
                        <span className="text-sm font-medium heading-text whitespace-nowrap">
                            {count === 1 ? 'Work order' : 'Work orders'} selected
                        </span>
                    </div>

                    <Divider />

                    {/* Bulk actions */}
                    {canEdit && (
                        <>
                            <Select
                                size="sm"
                                placeholder="Set status…"
                                options={STATUS_OPTIONS}
                                value={null}
                                isDisabled={bulkLoading}
                                onChange={handleBulkStatus}
                                className="min-w-[148px]"
                            />
                            <Select
                                size="sm"
                                placeholder="Set priority…"
                                options={PRIORITY_OPTIONS}
                                value={null}
                                isDisabled={bulkLoading}
                                onChange={handleBulkPriority}
                                className="min-w-[148px]"
                            />
                            <Divider />
                        </>
                    )}

                    {/* Delete */}
                    {canDelete && (
                        <button
                            onClick={() => setDeleteOpen(true)}
                            disabled={bulkLoading}
                            title="Delete selected"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        >
                            <TbTrash className="text-lg" />
                        </button>
                    )}

                    {/* Clear */}
                    <button
                        onClick={() => setSelectAllWorkOrder([])}
                        disabled={bulkLoading}
                        title="Clear selection"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                    >
                        <TbX className="text-lg" />
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={deleteOpen}
                type="danger"
                title="Delete Work Orders"
                onClose={() => setDeleteOpen(false)}
                onRequestClose={() => setDeleteOpen(false)}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>
                    Are you sure you want to delete <strong>{count}</strong> {label}?
                    This action cannot be undone.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default WorkOrderListSelected
