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
import { useTranslation } from 'react-i18next'

const Divider = () => (
    <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 shrink-0" />
)

const WorkOrderListSelected = () => {
    const { selectedWorkOrder, setSelectAllWorkOrder, mutate } = useWorkOrderList()
    const [deleteOpen, setDeleteOpen]   = useState(false)
    const [deleting, setDeleting]       = useState(false)
    const [bulkLoading, setBulkLoading] = useState(false)
    const { t } = useTranslation()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit   = useAuthority(userAuthority, ['work_orders.write', 'admin', 'manager'])
    const canDelete = useAuthority(userAuthority, ['work_orders.delete', 'admin'])

    if (selectedWorkOrder.length === 0) return null

    const count = selectedWorkOrder.length

    const STATUS_OPTIONS = [
        { value: 'open',        label: t('wo.status.open') },
        { value: 'in_progress', label: t('wo.status.in_progress') },
        { value: 'on_hold',     label: t('wo.status.on_hold') },
        { value: 'completed',   label: t('wo.status.completed') },
        { value: 'cancelled',   label: t('wo.status.cancelled') },
    ]

    const PRIORITY_OPTIONS = [
        { value: 'low',      label: t('wo.priority.low') },
        { value: 'medium',   label: t('wo.priority.medium') },
        { value: 'high',     label: t('wo.priority.high') },
        { value: 'critical', label: t('wo.priority.critical') },
    ]

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
                <Notification type="success">{t('wo.toast.bulkStatusUpdated')}</Notification>,
                { placement: 'top-center' },
            )
            setSelectAllWorkOrder([])
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">{t('wo.toast.bulkStatusFailed')}</Notification>,
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
                <Notification type="success">{t('wo.toast.bulkPriorityUpdated')}</Notification>,
                { placement: 'top-center' },
            )
            setSelectAllWorkOrder([])
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">{t('wo.toast.bulkPriorityFailed')}</Notification>,
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
                <Notification type="success">{t('wo.toast.bulkDeleted', { count })}</Notification>,
                { placement: 'top-center' },
            )
            setSelectAllWorkOrder([])
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">{t('wo.toast.bulkDeleteFailed')}</Notification>,
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
                            {count === 1 ? t('wo.selected.Item') : t('wo.selected.Items')} {t('common.selected')}
                        </span>
                    </div>

                    <Divider />

                    {/* Bulk actions */}
                    {canEdit && (
                        <>
                            <Select
                                size="sm"
                                placeholder={t('wo.selected.setStatus')}
                                options={STATUS_OPTIONS}
                                value={null}
                                isDisabled={bulkLoading}
                                onChange={handleBulkStatus}
                                className="min-w-[148px]"
                            />
                            <Select
                                size="sm"
                                placeholder={t('wo.selected.setPriority')}
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
                            title={t('common.delete')}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        >
                            <TbTrash className="text-lg" />
                        </button>
                    )}

                    {/* Clear */}
                    <button
                        onClick={() => setSelectAllWorkOrder([])}
                        disabled={bulkLoading}
                        title={t('common.clearSelection')}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                    >
                        <TbX className="text-lg" />
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={deleteOpen}
                type="danger"
                title={t('wo.selected.deleteTitle')}
                onClose={() => setDeleteOpen(false)}
                onRequestClose={() => setDeleteOpen(false)}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>{t('wo.selected.deleteConfirm', { count })}</p>
            </ConfirmDialog>
        </>
    )
}

export default WorkOrderListSelected
