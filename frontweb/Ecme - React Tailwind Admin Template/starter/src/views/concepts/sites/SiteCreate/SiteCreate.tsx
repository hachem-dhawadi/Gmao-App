import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import SiteForm from '../SiteForm'
import { apiCreateSite } from '@/services/SiteService'
import { useNavigate } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import { TbTrash } from 'react-icons/tb'
import type { SiteFormSchema } from '../SiteForm'

const SiteCreate = () => {
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [discardOpen, setDiscardOpen] = useState(false)

    const handleFormSubmit = async (values: SiteFormSchema) => {
        try {
            setIsSubmitting(true)
            await apiCreateSite({
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
                <Notification type="success">
                    Site created successfully.
                </Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/sites')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to create site.'
            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <SiteForm onFormSubmit={handleFormSubmit}>
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
                                Create Site
                            </Button>
                        </div>
                    </div>
                </Container>
            </SiteForm>

            <ConfirmDialog
                isOpen={discardOpen}
                type="danger"
                title="Discard changes?"
                onClose={() => setDiscardOpen(false)}
                onRequestClose={() => setDiscardOpen(false)}
                onCancel={() => setDiscardOpen(false)}
                onConfirm={() => {
                    setDiscardOpen(false)
                    navigate('/concepts/sites')
                }}
            >
                <p>All unsaved changes will be lost.</p>
            </ConfirmDialog>
        </>
    )
}

export default SiteCreate
