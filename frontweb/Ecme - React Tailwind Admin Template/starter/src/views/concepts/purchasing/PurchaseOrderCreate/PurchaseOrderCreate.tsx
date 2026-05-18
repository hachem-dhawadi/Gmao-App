import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR, { mutate as globalMutate } from 'swr'
import Container from '@/components/shared/Container'
import Affix from '@/components/shared/Affix'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { TbTrash } from 'react-icons/tb'
import useResponsive from '@/utils/hooks/useResponsive'
import useLayoutGap from '@/utils/hooks/useLayoutGap'
import { apiGetSuppliers, apiCreatePurchaseOrder } from '@/services/PurchasingService'
import { apiGetItemsList } from '@/services/InventoryService'
import type { SuppliersResponse, Supplier } from '@/services/PurchasingService'
import PoCreateNavigator from './components/PoCreateNavigator'
import ItemSelectSection from './components/ItemSelectSection'
import SupplierSection from './components/SupplierSection'
import OrderDetailsSection from './components/OrderDetailsSection'
import type { SelectedItem, CatalogItem } from './components/ItemSelectSection'

const PurchaseOrderCreate = () => {
    const navigate   = useNavigate()
    const { larger } = useResponsive()
    const { getTopGapValue } = useLayoutGap()

    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
    const [supplierId, setSupplierId]       = useState<number | null>(null)
    const [status, setStatus]               = useState<'draft' | 'ordered'>('draft')
    const [supplierRef, setSupplierRef]     = useState('')
    const [expectedAt, setExpectedAt]       = useState('')
    const [note, setNote]                   = useState('')
    const [submitting, setSubmitting]       = useState(false)
    const [discardOpen, setDiscardOpen]     = useState(false)

    const { data: suppliersData } = useSWR<SuppliersResponse>(
        '/purchasing/suppliers-all',
        () => apiGetSuppliers({ per_page: 100 }),
        { revalidateOnFocus: false },
    )

    const { data: itemsData } = useSWR(
        '/inventory/items-all',
        () => apiGetItemsList({ per_page: 200 }),
        { revalidateOnFocus: false },
    )

    const suppliers = (suppliersData?.data?.suppliers ?? []) as Supplier[]
    const catalogItems = (
        (itemsData as { data?: { items?: CatalogItem[] } })?.data?.items ?? []
    ) as CatalogItem[]

    const handleSubmit = async () => {
        if (!supplierId) {
            toast.push(<Notification type="warning">Please select a supplier.</Notification>, { placement: 'top-center' })
            return
        }
        if (selectedItems.length === 0) {
            toast.push(<Notification type="warning">Add at least one item.</Notification>, { placement: 'top-center' })
            return
        }
        setSubmitting(true)
        try {
            await apiCreatePurchaseOrder({
                supplier_id: supplierId,
                status,
                supplier_reference: supplierRef || null,
                expected_delivery_at: expectedAt || null,
                supplier_note: note || null,
                lines: selectedItems.map((i) => ({
                    item_id: i.id,
                    qty_ordered: i.qty,
                    unit_price: i.unit_price,
                })),
            })
            await globalMutate((k) => Array.isArray(k) && k[0] === '/purchasing/orders')
            toast.push(<Notification type="success">Purchase order created!</Notification>, { placement: 'top-center' })
            navigate('/concepts/purchasing/purchase-orders')
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create order.'
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleConfirmDiscard = () => {
        toast.push(<Notification type="success">Order discarded!</Notification>, { placement: 'top-center' })
        navigate('/concepts/purchasing/purchase-orders')
    }

    return (
        <>
            <div className="flex">
                <div className="flex-1 flex flex-col">
                    <Container>
                        <div className="flex gap-4">
                            {/* Left sticky navigator (xl+ only) */}
                            {larger.xl && (
                                <div className="w-[360px]">
                                    <Affix offset={getTopGapValue()}>
                                        <Card>
                                            <PoCreateNavigator />
                                        </Card>
                                    </Affix>
                                </div>
                            )}

                            {/* Main form cards */}
                            <div className="flex-1">
                                <div className="flex flex-col gap-4">
                                    <ItemSelectSection
                                        catalogItems={catalogItems}
                                        selectedItems={selectedItems}
                                        onChange={setSelectedItems}
                                    />
                                    <SupplierSection
                                        suppliers={suppliers}
                                        supplierId={supplierId}
                                        onChange={setSupplierId}
                                    />
                                    <OrderDetailsSection
                                        status={status}
                                        supplierRef={supplierRef}
                                        expectedAt={expectedAt}
                                        note={note}
                                        onStatusChange={setStatus}
                                        onSupplierRefChange={setSupplierRef}
                                        onExpectedAtChange={setExpectedAt}
                                        onNoteChange={setNote}
                                    />
                                </div>
                            </div>
                        </div>
                    </Container>

                    {/* Bottom sticky action bar — exactly like demo */}
                    <BottomStickyBar>
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
                                        loading={submitting}
                                        onClick={handleSubmit}
                                    >
                                        Create
                                    </Button>
                                </div>
                            </div>
                        </Container>
                    </BottomStickyBar>
                </div>
            </div>

            {/* Discard confirm dialog — same as demo */}
            <ConfirmDialog
                isOpen={discardOpen}
                type="danger"
                title="Discard changes"
                onClose={() => setDiscardOpen(false)}
                onRequestClose={() => setDiscardOpen(false)}
                onCancel={() => setDiscardOpen(false)}
                onConfirm={handleConfirmDiscard}
            >
                <p>Are you sure you want to discard this order? This action can&apos;t be undone.</p>
            </ConfirmDialog>
        </>
    )
}

export default PurchaseOrderCreate
