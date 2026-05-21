import { useState } from 'react'
import StickyFooter from '@/components/shared/StickyFooter'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import useUserList from '../hooks/useUserList'
import { apiDeleteSuperadminUser } from '@/services/CompaniesService'
import { TbChecks } from 'react-icons/tb'

const UserListSelected = () => {
    const { selectedCustomer, mutate, setSelectAllCustomer } = useUserList()
    const [confirmOpen, setConfirmOpen]   = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const handleConfirmDelete = async () => {
        const ids = selectedCustomer.map((u) => u.id).filter((id): id is string => Boolean(id))
        if (ids.length === 0) { setConfirmOpen(false); return }

        setDeleteLoading(true)
        try {
            const results = await Promise.allSettled(ids.map((id) => apiDeleteSuperadminUser(id)))
            const failed  = results.filter((r) => r.status === 'rejected').length
            const success = ids.length - failed

            if (success > 0) {
                toast.push(
                    <Notification type="success">{success} user{success > 1 ? 's' : ''} deleted.</Notification>,
                    { placement: 'top-center' },
                )
            }
            if (failed > 0) {
                toast.push(
                    <Notification type="danger">{failed} user{failed > 1 ? 's' : ''} could not be deleted.</Notification>,
                    { placement: 'top-center' },
                )
            }
            setSelectAllCustomer([])
            await mutate()
            setConfirmOpen(false)
        } finally {
            setDeleteLoading(false)
        }
    }

    return (
        <>
            {selectedCustomer.length > 0 && (
                <StickyFooter
                    className="flex items-center justify-between py-4 bg-white dark:bg-gray-800"
                    stickyClass="-mx-4 sm:-mx-8 border-t border-gray-200 dark:border-gray-700 px-8"
                    defaultClass="container mx-auto px-8 rounded-xl border border-gray-200 dark:border-gray-600 mt-4"
                >
                    <div className="container mx-auto">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <span className="text-lg text-primary"><TbChecks /></span>
                                <span className="font-semibold flex items-center gap-1">
                                    <span className="heading-text">{selectedCustomer.length} Users</span>
                                    <span>selected</span>
                                </span>
                            </span>
                            <Button
                                size="sm"
                                customColorClass={() =>
                                    'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error'
                                }
                                onClick={() => setConfirmOpen(true)}
                            >
                                Delete selected
                            </Button>
                        </div>
                    </div>
                </StickyFooter>
            )}

            <ConfirmDialog
                isOpen={confirmOpen}
                type="danger"
                title="Delete users"
                onClose={() => setConfirmOpen(false)}
                onRequestClose={() => setConfirmOpen(false)}
                onCancel={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                confirmButtonProps={{ loading: deleteLoading }}
            >
                <p>
                    Are you sure you want to delete the selected {selectedCustomer.length} user{selectedCustomer.length > 1 ? 's' : ''}?
                    This action cannot be undone.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default UserListSelected
