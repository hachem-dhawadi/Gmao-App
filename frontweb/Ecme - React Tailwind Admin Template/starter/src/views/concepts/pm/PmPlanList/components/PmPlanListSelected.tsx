import { useState } from 'react'
import StickyFooter from '@/components/shared/StickyFooter'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import usePmPlanList from '../hooks/usePmPlanList'
import { apiDeletePmPlan } from '@/services/PmService'
import { TbChecks } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'

const PmPlanListSelected = () => {
    const { selectedPmPlans, setSelectAllPmPlan, mutate } = usePmPlanList()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canDelete = useAuthority(userAuthority, [ADMIN, MANAGER])

    if (selectedPmPlans.length === 0) return null

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await Promise.all(selectedPmPlans.map((p) => apiDeletePmPlan(p.id)))
            toast.push(
                <Notification type="success">
                    {selectedPmPlans.length}{' '}
                    {selectedPmPlans.length === 1 ? 'PM plan' : 'PM plans'} deleted.
                </Notification>,
                { placement: 'top-center' },
            )
            setSelectAllPmPlan([])
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">Failed to delete some PM plans.</Notification>,
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
                                    {selectedPmPlans.length}{' '}
                                    {selectedPmPlans.length === 1 ? 'PM Plan' : 'PM Plans'}
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
                                onClick={() => setSelectAllPmPlan([])}
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
                title="Delete PM Plans"
                onClose={() => setDeleteOpen(false)}
                onRequestClose={() => setDeleteOpen(false)}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>
                    Are you sure you want to delete{' '}
                    <strong>{selectedPmPlans.length}</strong>{' '}
                    {selectedPmPlans.length === 1 ? 'PM plan' : 'PM plans'}?
                </p>
            </ConfirmDialog>
        </>
    )
}

export default PmPlanListSelected
