import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import PmPlanForm from '../PmPlanForm'
import { apiCreatePmPlan } from '@/services/PmService'
import { useNavigate } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import { TbTrash } from 'react-icons/tb'
import type { PmPlanFormSchema } from '../PmPlanForm'

const PmPlanCreate = () => {
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [discardOpen, setDiscardOpen] = useState(false)

    const handleFormSubmit = async (values: PmPlanFormSchema) => {
        try {
            setIsSubmitting(true)
            await apiCreatePmPlan({
                name: values.name,
                description: values.description || null,
                status: values.status,
                priority: values.priority,
                estimated_minutes: values.estimated_minutes
                    ? parseInt(values.estimated_minutes, 10)
                    : null,
                asset_id: values.asset_id || null,
                assigned_member_id: values.assigned_member_id || null,
                trigger: {
                    type: 'time_based',
                    interval_value: parseInt(values.trigger_interval_value, 10),
                    interval_unit: values.trigger_interval_unit,
                    next_run_at: values.trigger_next_run_at || null,
                },
            })

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/pm/plans',
            )

            toast.push(
                <Notification type="success">
                    PM plan created successfully.
                </Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/pm/pm-list')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to create PM plan.'
            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <PmPlanForm onFormSubmit={handleFormSubmit}>
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
                                Discard
                            </Button>
                            <Button
                                variant="solid"
                                type="submit"
                                loading={isSubmitting}
                            >
                                Create PM Plan
                            </Button>
                        </div>
                    </div>
                </Container>
            </PmPlanForm>

            <ConfirmDialog
                isOpen={discardOpen}
                type="danger"
                title="Discard changes"
                onClose={() => setDiscardOpen(false)}
                onRequestClose={() => setDiscardOpen(false)}
                onCancel={() => setDiscardOpen(false)}
                onConfirm={() => {
                    setDiscardOpen(false)
                    navigate('/concepts/pm/pm-list')
                }}
            >
                <p>
                    Are you sure you want to discard this? This action
                    can&apos;t be undone.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default PmPlanCreate
