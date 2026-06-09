import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import SiteForm from '../SiteForm'
import {
    apiGetSiteById,
    apiUpdateSite,
    apiDeleteSite,
} from '@/services/SiteService'
import { useNavigate, useParams } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import useSWR from 'swr'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { TbArrowNarrowLeft, TbTrash } from 'react-icons/tb'
import type { SiteFormSchema } from '../SiteForm'
import type { Site } from '../SiteList/types'
import type { SiteResponse } from '@/services/SiteService'

const SiteEdit = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canDelete = useAuthority(userAuthority, ['sites.delete', 'admin'])

    const { data, isLoading } = useSWR<Site>(
        id ? ['/sites/edit', id] : null,
        async () => {
            const resp = await apiGetSiteById<SiteResponse>(id!)
            return resp.data.site
        },
        { revalidateOnFocus: false, revalidateIfStale: false },
    )

    const handleFormSubmit = async (values: SiteFormSchema) => {
        if (!id) return
        try {
            setIsSubmitting(true)
            await apiUpdateSite(id, {
                name: values.name,
                code: values.code,
                description: values.description || null,
                address: values.address || null,
                phone: values.phone,
                timezone: values.timezone || 'UTC',
                is_active: values.is_active,
                geo_lat: values.geo_lat ? parseFloat(values.geo_lat) : null,
                geo_lng: values.geo_lng ? parseFloat(values.geo_lng) : null,
            })

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/sites',
            )

            toast.push(
                <Notification type="success">Site saved successfully.</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/sites')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to update site.'
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
            await apiDeleteSite(id)

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/sites',
            )

            toast.push(
                <Notification type="success">Site deleted successfully.</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/sites')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to delete site.'
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
                <h3 className="mt-8">Site not found!</h3>
                <Button
                    className="mt-4"
                    onClick={() => navigate('/concepts/sites')}
                >
                    Back to list
                </Button>
            </div>
        )
    }

    const defaultValues: Partial<SiteFormSchema> = data
        ? {
              name: data.name,
              code: data.code,
              description: data.description ?? '',
              address: data.address ?? '',
              phone: data.phone ?? '',
              timezone: data.timezone ?? 'UTC',
              is_active: data.is_active ?? true,
              geo_lat: data.geo_lat != null ? String(data.geo_lat) : '',
              geo_lng: data.geo_lng != null ? String(data.geo_lng) : '',
          }
        : {}

    return (
        <>
            {!isLoading && data && (
                <>
                    <SiteForm
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
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </Container>
                    </SiteForm>

                    <ConfirmDialog
                        isOpen={deleteOpen}
                        type="danger"
                        title="Delete Site"
                        onClose={() => setDeleteOpen(false)}
                        onRequestClose={() => setDeleteOpen(false)}
                        onCancel={() => setDeleteOpen(false)}
                        onConfirm={handleConfirmDelete}
                        confirmButtonProps={{ loading: isDeleting }}
                    >
                        <p>
                            Are you sure you want to delete{' '}
                            <strong>{data.name}</strong>? Assets and members
                            linked to this site will be unassigned.
                        </p>
                    </ConfirmDialog>
                </>
            )}
        </>
    )
}

export default SiteEdit
