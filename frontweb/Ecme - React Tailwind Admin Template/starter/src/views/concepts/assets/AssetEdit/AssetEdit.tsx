import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import AssetForm from '../AssetForm'
import {
    apiGetAssetById,
    apiUpdateAsset,
    apiDeleteAsset,
} from '@/services/AssetsService'
import { useNavigate, useParams } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import useSWR from 'swr'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN } from '@/constants/roles.constant'
import { TbArrowNarrowLeft, TbTrash } from 'react-icons/tb'
import type { AssetFormSchema } from '../AssetForm'
import type { Asset } from '../AssetList/types'
import type { AssetResponse } from '@/services/AssetsService'

const AssetEdit = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canDelete = useAuthority(userAuthority, [ADMIN])

    const { data, isLoading } = useSWR<Asset>(
        id ? ['/assets/edit', id] : null,
        async () => {
            const resp = await apiGetAssetById<AssetResponse>(id!)
            return resp.data.asset
        },
        { revalidateOnFocus: false, revalidateIfStale: false },
    )

    const handleFormSubmit = async (values: AssetFormSchema) => {
        if (!id) return
        try {
            setIsSubmitting(true)
            await apiUpdateAsset(id, {
                name: values.name,
                code: values.code,
                asset_type_id: values.asset_type_id!,
                status: values.status,
                serial_number: values.serial_number || null,
                manufacturer: values.manufacturer || null,
                model: values.model || null,
                location: values.location || null,
                address_label: values.address_label || null,
                notes: values.notes || null,
                purchase_date: values.purchase_date || null,
                warranty_end_at: values.warranty_end_at || null,
                installed_at: values.installed_at || null,
            })

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    (key[0] === '/assets' || key[0] === '/assets/edit'),
            )

            toast.push(
                <Notification type="success">Changes saved.</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/assets/asset-list')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to update asset.'
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
            await apiDeleteAsset(id)

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/assets',
            )

            toast.push(
                <Notification type="success">Asset deleted.</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/assets/asset-list')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to delete asset.'
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
                <h3 className="mt-8">Asset not found!</h3>
                <Button
                    className="mt-4"
                    onClick={() => navigate('/concepts/assets/asset-list')}
                >
                    Back to list
                </Button>
            </div>
        )
    }

    const defaultValues: Partial<AssetFormSchema> = data
        ? {
              name: data.name,
              code: data.code,
              asset_type_id: data.asset_type_id,
              status: data.status,
              serial_number: data.serial_number ?? '',
              manufacturer: data.manufacturer ?? '',
              model: data.model ?? '',
              location: data.location ?? '',
              address_label: data.address_label ?? '',
              notes: data.notes ?? '',
              purchase_date: data.purchase_date ?? '',
              warranty_end_at: data.warranty_end_at ?? '',
              installed_at: data.installed_at ?? '',
          }
        : {}

    return (
        <>
            {!isLoading && data && (
                <>
                    <AssetForm
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
                    </AssetForm>

                    <ConfirmDialog
                        isOpen={deleteOpen}
                        type="danger"
                        title="Delete Asset"
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

export default AssetEdit
