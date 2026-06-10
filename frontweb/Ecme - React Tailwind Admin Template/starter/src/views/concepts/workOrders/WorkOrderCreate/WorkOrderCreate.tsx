import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import WorkOrderForm from '../WorkOrderForm'
import { apiCreateWorkOrder } from '@/services/WorkOrdersService'
import { useNavigate } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import { TbTrash } from 'react-icons/tb'
import type { WorkOrderFormSchema } from '../WorkOrderForm'

const WorkOrderCreate = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [discardOpen, setDiscardOpen] = useState(false)

    const handleFormSubmit = async (values: WorkOrderFormSchema) => {
        try {
            setIsSubmitting(true)
            await apiCreateWorkOrder({
                title: values.title,
                asset_id: values.asset_id!,
                code: values.code || null,
                status: values.status,
                priority: values.priority,
                description: values.description || null,
                due_at: values.due_at || null,
                estimated_minutes: values.estimated_minutes
                    ? parseInt(values.estimated_minutes, 10)
                    : null,
                team_id: values.team_id ?? null,
                assigned_member_ids: values.assigned_member_ids || [],
            })

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/work-orders',
            )

            toast.push(
                <Notification type="success">
                    {t('workOrderCreate.toast.success')}
                </Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/work-orders/work-order-list')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || t('workOrderCreate.toast.error')
            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <WorkOrderForm onFormSubmit={handleFormSubmit}>
                <Container>
                    <div className="flex items-center justify-between px-8">
                        <span />
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                customColorClass={() =>
                                    'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error bg-transparent'
                                }
                                icon={<TbTrash />}
                                onClick={() => setDiscardOpen(true)}
                            >
                                {t('common.discard')}
                            </Button>
                            <Button
                                variant="solid"
                                type="submit"
                                loading={isSubmitting}
                            >
                                {t('common.create')}
                            </Button>
                        </div>
                    </div>
                </Container>
            </WorkOrderForm>

            <ConfirmDialog
                isOpen={discardOpen}
                type="danger"
                title={t('common.discardConfirm.title')}
                onClose={() => setDiscardOpen(false)}
                onRequestClose={() => setDiscardOpen(false)}
                onCancel={() => setDiscardOpen(false)}
                onConfirm={() => {
                    setDiscardOpen(false)
                    navigate('/concepts/work-orders/work-order-list')
                }}
            >
                <p>{t('common.discardConfirm.body')}</p>
            </ConfirmDialog>
        </>
    )
}

export default WorkOrderCreate
