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
import { useTranslation } from 'react-i18next'

const PmPlanListSelected = () => {
    const { selectedPmPlans, setSelectAllPmPlan, mutate } = usePmPlanList()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const { t } = useTranslation()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canDelete = useAuthority(userAuthority, ['pm_plans.delete', 'admin'])

    if (selectedPmPlans.length === 0) return null

    const count = selectedPmPlans.length

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await Promise.all(selectedPmPlans.map((p) => apiDeletePmPlan(p.id)))
            toast.push(
                <Notification type="success">{t('pm.toast.bulkDeleted', { count })}</Notification>,
                { placement: 'top-center' },
            )
            setSelectAllPmPlan([])
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">{t('pm.toast.bulkDeleteFailed')}</Notification>,
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
                                    {count}{' '}
                                    {count === 1 ? t('pm.selected.Item') : t('pm.selected.Items')}
                                </span>
                                <span>{t('common.selected')}</span>
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
                                    {t('common.delete')}
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={() => setSelectAllPmPlan([])}
                            >
                                {t('common.clearSelection')}
                            </Button>
                        </div>
                    </div>
                </div>
            </StickyFooter>

            <ConfirmDialog
                isOpen={deleteOpen}
                type="danger"
                title={t('pm.selected.deleteTitle')}
                onClose={() => setDeleteOpen(false)}
                onRequestClose={() => setDeleteOpen(false)}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>{t('pm.selected.deleteConfirm', { count })}</p>
            </ConfirmDialog>
        </>
    )
}

export default PmPlanListSelected
