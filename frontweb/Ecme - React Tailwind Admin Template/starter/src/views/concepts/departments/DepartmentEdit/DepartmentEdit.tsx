import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DepartmentForm from '../DepartmentForm'
import {
    apiGetDepartmentById,
    apiUpdateDepartment,
    apiDeleteDepartment,
} from '@/services/DepartmentsService'
import { useNavigate, useParams } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import useSWR from 'swr'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN } from '@/constants/roles.constant'
import { TbArrowNarrowLeft, TbTrash } from 'react-icons/tb'
import type { DepartmentFormSchema } from '../DepartmentForm'
import type { Department } from '../DepartmentList/types'
import type { DepartmentResponse } from '@/services/DepartmentsService'

const DepartmentEdit = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canDelete = useAuthority(userAuthority, [ADMIN])

    const { data, isLoading } = useSWR<Department>(
        id ? ['/departments/edit', id] : null,
        async () => {
            const resp = await apiGetDepartmentById<DepartmentResponse>(id!)
            return resp.data.department
        },
        { revalidateOnFocus: false, revalidateIfStale: false },
    )

    const handleFormSubmit = async (values: DepartmentFormSchema) => {
        if (!id) return
        try {
            setIsSubmitting(true)
            await apiUpdateDepartment(id, {
                name: values.name,
                code: values.code,
                description: values.description || null,
                parent_department_id: values.parent_department_id ?? null,
            })

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/departments',
            )

            toast.push(
                <Notification type="success">Changes saved.</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/departments')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to update department.'
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
            await apiDeleteDepartment(id)

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/departments',
            )

            toast.push(
                <Notification type="success">Department deleted.</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/departments')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to delete department.'
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
                <h3 className="mt-8">Department not found!</h3>
                <Button className="mt-4" onClick={() => navigate('/concepts/departments')}>
                    Back to list
                </Button>
            </div>
        )
    }

    const defaultValues: Partial<DepartmentFormSchema> = data
        ? {
              name: data.name,
              code: data.code,
              description: data.description ?? '',
              parent_department_id: data.parent_department_id ?? null,
          }
        : {}

    return (
        <>
            {!isLoading && data && (
                <>
                    <DepartmentForm
                        onFormSubmit={handleFormSubmit}
                        defaultValues={defaultValues}
                        currentDepartmentId={data.id}
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
                    </DepartmentForm>

                    <ConfirmDialog
                        isOpen={deleteOpen}
                        type="danger"
                        title="Delete Department"
                        onClose={() => setDeleteOpen(false)}
                        onRequestClose={() => setDeleteOpen(false)}
                        onCancel={() => setDeleteOpen(false)}
                        onConfirm={handleConfirmDelete}
                        confirmButtonProps={{ loading: isDeleting }}
                    >
                        <p>
                            Are you sure you want to delete{' '}
                            <strong>{data.name}</strong>? Members will be
                            unassigned and sub-departments will become top-level.
                        </p>
                    </ConfirmDialog>
                </>
            )}
        </>
    )
}

export default DepartmentEdit
