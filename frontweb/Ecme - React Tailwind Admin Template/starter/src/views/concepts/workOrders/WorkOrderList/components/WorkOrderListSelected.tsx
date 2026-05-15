import { useState } from 'react'
import StickyFooter from '@/components/shared/StickyFooter'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useWorkOrderList from '../hooks/useWorkOrderList'
import { apiDeleteWorkOrder } from '@/services/WorkOrdersService'
import { TbChecks } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN } from '@/constants/roles.constant'

const WorkOrderListSelected = () => {
    const { selectedWorkOrder, setSelectAllWorkOrder, mutate } =
        useWorkOrderList()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canDelete = useAuthority(userAuthority, [ADMIN])

    if (selectedWorkOrder.length === 0) return null

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await Promise.all(
                selectedWorkOrder.map((wo) => apiDeleteWorkOrder(wo.id)),
            )
            toast.push(
                <Notification type="success">
                    {selectedWorkOrder.length}{' '}
                    {selectedWorkOrder.length === 1
                        ? 'work order'
                        : 'work orders'}{' '}
                    deleted.
                </Notification>,
                { placement: 'top-center' },
            )
            setSelectAllWorkOrder([])
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">
                    Failed to delete some work orders.
                </Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleting(false)
            setDeleteOpen(false)
        }
    }

    return (
        <>
            <StickyFooter
                className="flex items-center justify-between py-4 bg-white dark:bg-gray-800"
                stickyClass="-mx-4 sm:-mx-8 border-t border-gray-200 dark:border-gray-700 px-8"
                defaultClass="container mx-auto px-8 rounded-xl border border-gray-200 dark:border-gray-600 mt-4"
            >
                <div className="container mx-auto">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <span className="text-lg text-primary">
                                <TbChecks />
                            </span>
                            <span className="font-semibold flex items-center gap-1">
                                <span className="heading-text">
                                    {selectedWorkOrder.length}{' '}
                                    {selectedWorkOrder.length === 1
                                        ? 'Work Order'
                                        : 'Work Orders'}
                                </span>
                                <span>selected</span>
                            </span>
                        </span>

                        <div className="flex items-center gap-3">
                            {canDelete && (
                                <Button
                                    size="sm"
                                    customColorClass={() =>
                                        'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error'
                                    }
                                    onClick={() => setDeleteOpen(true)}
                                >
                                    Delete
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={() => setSelectAllWorkOrder([])}
                            >
                                Clear selection
                            </Button>
                        </div>
                    </div>
                </div>
            </StickyFooter>

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
                    Are you sure you want to delete{' '}
                    <strong>{selectedWorkOrder.length}</strong>{' '}
                    {selectedWorkOrder.length === 1
                        ? 'work order'
                        : 'work orders'}
                    ?
                </p>
            </ConfirmDialog>
        </>
    )
}

export default WorkOrderListSelected
