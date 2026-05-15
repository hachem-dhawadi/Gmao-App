import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import WorkOrderForm from '../WorkOrderForm'
import {
    apiGetWorkOrderById,
    apiUpdateWorkOrder,
    apiDeleteWorkOrder,
} from '@/services/WorkOrdersService'
import { useNavigate, useParams } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import useSWR from 'swr'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN } from '@/constants/roles.constant'
import { TbArrowNarrowLeft, TbTrash } from 'react-icons/tb'
import type { WorkOrderFormSchema } from '../WorkOrderForm'
import type { WorkOrder } from '../WorkOrderList/types'
import type { WorkOrderResponse } from '@/services/WorkOrdersService'

const WorkOrderEdit = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canDelete = useAuthority(userAuthority, [ADMIN])

    const { data, isLoading } = useSWR<WorkOrder>(
        id ? ['/work-orders/edit', id] : null,
        async () => {
            const resp = await apiGetWorkOrderById<WorkOrderResponse>(id!)
            return resp.data.work_order
        },
        { revalidateOnFocus: false, revalidateIfStale: false },
    )

    const handleFormSubmit = async (values: WorkOrderFormSchema) => {
        if (!id) return
        try {
            setIsSubmitting(true)
            await apiUpdateWorkOrder(id, {
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
                assigned_member_ids: values.assigned_member_ids || [],
            })

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    (key[0] === '/work-orders' ||
                        key[0] === '/work-orders/edit'),
            )

            toast.push(
                <Notification type="success">Changes saved.</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/work-orders/work-order-list')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to update work order.'
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
            await apiDeleteWorkOrder(id)

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/work-orders',
            )

            toast.push(
                <Notification type="success">
                    Work order deleted.
                </Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/work-orders/work-order-list')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to delete work order.'
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
                <h3 className="mt-8">Work order not found!</h3>
                <Button
                    className="mt-4"
                    onClick={() =>
                        navigate('/concepts/work-orders/work-order-list')
                    }
                >
                    Back to list
                </Button>
            </div>
        )
    }

    const defaultValues: Partial<WorkOrderFormSchema> = data
        ? {
              title: data.title,
              asset_id: data.asset_id,
              code: data.code,
              status: data.status,
              priority: data.priority,
              description: data.description ?? '',
              due_at: data.due_at
                  ? data.due_at.substring(0, 10)
                  : '',
              estimated_minutes: data.estimated_minutes
                  ? String(data.estimated_minutes)
                  : '',
              assigned_member_ids: data.assigned_members?.map((m) => m.id) || [],
          }
        : {}

    return (
        <>
            {!isLoading && data && (
                <>
                    <WorkOrderForm
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
                    </WorkOrderForm>

                    <ConfirmDialog
                        isOpen={deleteOpen}
                        type="danger"
                        title="Delete Work Order"
                        onClose={() => setDeleteOpen(false)}
                        onRequestClose={() => setDeleteOpen(false)}
                        onCancel={() => setDeleteOpen(false)}
                        onConfirm={handleConfirmDelete}
                        confirmButtonProps={{ loading: isDeleting }}
                    >
                        <p>
                            Are you sure you want to delete{' '}
                            <strong>{data.title}</strong>? This action cannot be
                            undone.
                        </p>
                    </ConfirmDialog>
                </>
            )}
        </>
    )
}

export default WorkOrderEdit
