import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ItemForm from '../ItemForm/ItemForm'
import { apiCreateItem } from '@/services/InventoryService'
import { useNavigate } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import { TbTrash } from 'react-icons/tb'
import type { ItemFormSchema } from '../ItemForm/ItemForm'

const ItemCreate = () => {
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [discardOpen, setDiscardOpen] = useState(false)

    const handleFormSubmit = async (values: ItemFormSchema) => {
        try {
            setIsSubmitting(true)

            const formData = new FormData()
            formData.append('code', values.code)
            formData.append('name', values.name)
            if (values.description) formData.append('description', values.description)
            if (values.barcode) formData.append('barcode', values.barcode)
            if (values.unit) formData.append('unit', values.unit)
            if (values.unit_cost) formData.append('unit_cost', values.unit_cost)
            if (values.min_stock) formData.append('min_stock', values.min_stock)
            formData.append('is_stocked', values.is_stocked ? '1' : '0')
            values.imgList.forEach((img) => {
                if (img.file) formData.append('images[]', img.file)
            })

            await apiCreateItem(formData)

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/inventory/items',
            )

            toast.push(
                <Notification type="success">Item created successfully.</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/inventory/items')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to create item.'
            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <ItemForm onFormSubmit={handleFormSubmit}>
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
                            <Button variant="solid" type="submit" loading={isSubmitting}>
                                Create
                            </Button>
                        </div>
                    </div>
                </Container>
            </ItemForm>

            <ConfirmDialog
                isOpen={discardOpen}
                type="danger"
                title="Discard changes"
                onClose={() => setDiscardOpen(false)}
                onRequestClose={() => setDiscardOpen(false)}
                onCancel={() => setDiscardOpen(false)}
                onConfirm={() => {
                    setDiscardOpen(false)
                    navigate('/concepts/inventory/items')
                }}
            >
                <p>Discard this new item? Changes will be lost.</p>
            </ConfirmDialog>
        </>
    )
}

export default ItemCreate
