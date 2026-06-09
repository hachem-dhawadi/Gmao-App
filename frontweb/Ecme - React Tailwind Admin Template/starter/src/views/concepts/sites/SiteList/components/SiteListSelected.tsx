import { useState } from 'react'
import StickyFooter from '@/components/shared/StickyFooter'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useSiteList from '../hooks/useSiteList'
import { apiDeleteSite } from '@/services/SiteService'
import { TbChecks } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'

const SiteListSelected = () => {
    const { selectedSite, setSelectAllSite, mutate } = useSiteList()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canDelete = useAuthority(userAuthority, ['sites.delete', 'admin'])

    if (selectedSite.length === 0) return null

    const count = selectedSite.length

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await Promise.all(selectedSite.map((s) => apiDeleteSite(s.id)))
            toast.push(
                <Notification type="success">
                    {count} site{count > 1 ? 's' : ''} deleted successfully.
                </Notification>,
                { placement: 'top-center' },
            )
            setSelectAllSite([])
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">Failed to delete selected sites.</Notification>,
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
                                    {count} {count === 1 ? 'site' : 'sites'}
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
                                onClick={() => setSelectAllSite([])}
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
                title="Delete Sites"
                onClose={() => setDeleteOpen(false)}
                onRequestClose={() => setDeleteOpen(false)}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>
                    Are you sure you want to delete{' '}
                    <strong>{count} {count === 1 ? 'site' : 'sites'}</strong>?
                    Assets and members assigned to these sites will be unlinked.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default SiteListSelected
