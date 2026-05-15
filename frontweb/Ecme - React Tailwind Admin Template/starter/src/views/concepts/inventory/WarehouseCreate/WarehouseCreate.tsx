import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import WarehouseForm from '../WarehouseForm/WarehouseForm'
import { apiCreateWarehouse } from '@/services/InventoryService'
import { useNavigate } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import { TbTrash } from 'react-icons/tb'
import type { WarehouseFormSchema } from '../WarehouseForm/WarehouseForm'

const WarehouseCreate = () => {
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [discardOpen, setDiscardOpen] = useState(false)

    const handleFormSubmit = async (values: WarehouseFormSchema) => {
        try {
            setIsSubmitting(true)
            await apiCreateWarehouse({
                code: values.code,
                name: values.name,
                location: values.location || null,
            })

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/inventory/warehouses',
            )

            toast.push(
                <Notification type="success">
                    Warehouse created successfully.
                </Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/inventory/warehouses')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to create warehouse.'
            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <WarehouseForm onFormSubmit={handleFormSubmit}>
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
            </WarehouseForm>

            <ConfirmDialog
                isOpen={discardOpen}
                type="danger"
                title="Discard changes"
                onClose={() => setDiscardOpen(false)}
                onRequestClose={() => setDiscardOpen(false)}
                onCancel={() => setDiscardOpen(false)}
                onConfirm={() => {
                    setDiscardOpen(false)
                    navigate('/concepts/inventory/warehouses')
                }}
            >
                <p>Discard this new warehouse?</p>
            </ConfirmDialog>
        </>
    )
}

export default WarehouseCreate
