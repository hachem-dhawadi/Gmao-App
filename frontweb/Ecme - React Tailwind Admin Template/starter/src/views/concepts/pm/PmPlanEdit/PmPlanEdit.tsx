import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import PmPlanForm from '../PmPlanForm'
import {
    apiGetPmPlanById,
    apiUpdatePmPlan,
    apiDeletePmPlan,
} from '@/services/PmService'
import { useNavigate, useParams } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import useSWR from 'swr'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import { TbArrowNarrowLeft, TbTrash } from 'react-icons/tb'
import type { PmPlanFormSchema } from '../PmPlanForm'
import type { PmPlan, PmPlanResponse } from '@/services/PmService'

const PmPlanEdit = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canDelete = useAuthority(userAuthority, [ADMIN, MANAGER])

    const { data, isLoading } = useSWR<PmPlan>(
        id ? ['/pm/plans/edit', id] : null,
        async () => {
            const resp = await apiGetPmPlanById<PmPlanResponse>(id!)
            return resp.data.pm_plan
        },
        { revalidateOnFocus: false, revalidateIfStale: false },
    )

    const handleFormSubmit = async (values: PmPlanFormSchema) => {
        if (!id) return
        try {
            setIsSubmitting(true)
            await apiUpdatePmPlan(id, {
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
                    (key[0] === '/pm/plans' || key[0] === '/pm/plans/edit'),
            )

            toast.push(
                <Notification type="success">PM plan saved.</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/pm/pm-list')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to update PM plan.'
            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!id) return
        try {
            setIsDeleting(true)
            await apiDeletePmPlan(id)

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/pm/plans',
            )

            toast.push(
                <Notification type="success">PM plan deleted.</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/pm/pm-list')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to delete PM plan.'
            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsDeleting(false)
            setDeleteOpen(false)
        }
    }

    if (!isLoading && !data) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <h3 className="mt-8">PM plan not found!</h3>
                <Button
                    className="mt-4"
                    onClick={() => navigate('/concepts/pm/pm-list')}
                >
                    Back to list
                </Button>
            </div>
        )
    }

    const defaultValues: Partial<PmPlanFormSchema> = data
        ? {
              name: data.name,
              description: data.description ?? '',
              status: data.status,
              priority: data.priority,
              estimated_minutes: data.estimated_minutes
                  ? String(data.estimated_minutes)
                  : '',
              asset_id: data.asset?.id ?? null,
              assigned_member_id: data.assigned_to?.id ?? null,
              trigger_interval_value: data.trigger
                  ? String(data.trigger.interval_value)
                  : '1',
              trigger_interval_unit: data.trigger?.interval_unit ?? 'months',
              trigger_next_run_at: data.trigger?.next_run_at
                  ? data.trigger.next_run_at.substring(0, 10)
                  : '',
          }
        : {}

    return (
        <>
            {!isLoading && data && (
                <>
                    <PmPlanForm
                        onFormSubmit={handleFormSubmit}
                        defaultValues={defaultValues}
                    >
                        <Container>
                            <div className="flex items-center justify-between px-8">
                                <Button
                                    type="button"
                                    variant="plain"
                                    icon={<TbArrowNarrowLeft />}
                                    onClick={() => navigate(-1)}
                                >
                                    Back
                                </Button>
                                <div className="flex items-center gap-3">
                                    {canDelete && (
                                        <Button
                                            type="button"
                                            customColorClass={() =>
                                                'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error bg-transparent'
                                            }
                                            icon={<TbTrash />}
                                            onClick={() => setDeleteOpen(true)}
                                        >
                                            Delete
                                        </Button>
                                    )}
                                    <Button
                                        variant="solid"
                                        type="submit"
                                        loading={isSubmitting}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </Container>
                    </PmPlanForm>

                    <ConfirmDialog
                        isOpen={deleteOpen}
                        type="danger"
                        title="Delete PM Plan"
                        onClose={() => setDeleteOpen(false)}
                        onRequestClose={() => setDeleteOpen(false)}
                        onCancel={() => setDeleteOpen(false)}
                        onConfirm={handleConfirmDelete}
                        confirmButtonProps={{ loading: isDeleting }}
                    >
                        <p>
                            Are you sure you want to delete{' '}
                            <strong>{data.name}</strong>? This action cannot be
                            undone.
                        </p>
                    </ConfirmDialog>
                </>
            )}
        </>
    )
}

export default PmPlanEdit
