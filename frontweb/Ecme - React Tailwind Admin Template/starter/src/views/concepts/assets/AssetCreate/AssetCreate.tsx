import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import AssetForm from '../AssetForm'
import { apiCreateAsset } from '@/services/AssetsService'
import { useNavigate } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import { TbTrash } from 'react-icons/tb'
import type { AssetFormSchema } from '../AssetForm'

const AssetCreate = () => {
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [discardOpen, setDiscardOpen] = useState(false)

    const handleFormSubmit = async (values: AssetFormSchema) => {
        try {
            setIsSubmitting(true)

            const fd = new FormData()
            fd.append('name', values.name)
            fd.append('code', values.code)
            fd.append('asset_type_id', String(values.asset_type_id!))
            fd.append('status', values.status)
            if (values.serial_number) fd.append('serial_number', values.serial_number)
            if (values.manufacturer) fd.append('manufacturer', values.manufacturer)
            if (values.model) fd.append('model', values.model)
            if (values.location) fd.append('location', values.location)
            if (values.address_label) fd.append('address_label', values.address_label)
            if (values.notes) fd.append('notes', values.notes)
            if (values.purchase_date) fd.append('purchase_date', values.purchase_date)
            if (values.warranty_end_at) fd.append('warranty_end_at', values.warranty_end_at)
            if (values.installed_at) fd.append('installed_at', values.installed_at)
            values.imgList.forEach((img) => {
                if (img.file) fd.append('images[]', img.file)
            })

            await apiCreateAsset(fd)

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/assets',
            )

            toast.push(
                <Notification type="success">
                    Asset created successfully.
                </Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/assets/asset-list')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to create asset.'
            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <AssetForm onFormSubmit={handleFormSubmit}>
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
                                Create
                            </Button>
                        </div>
                    </div>
                </Container>
            </AssetForm>

            <ConfirmDialog
                isOpen={discardOpen}
                type="danger"
                title="Discard changes"
                onClose={() => setDiscardOpen(false)}
                onRequestClose={() => setDiscardOpen(false)}
                onCancel={() => setDiscardOpen(false)}
                onConfirm={() => {
                    setDiscardOpen(false)
                    navigate('/concepts/assets/asset-list')
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

export default AssetCreate
