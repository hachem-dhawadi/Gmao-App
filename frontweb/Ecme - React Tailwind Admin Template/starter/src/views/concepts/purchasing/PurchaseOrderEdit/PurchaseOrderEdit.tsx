import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useSWR, { mutate as globalMutate } from 'swr'
import Container from '@/components/shared/Container'
import Affix from '@/components/shared/Affix'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Loading from '@/components/shared/Loading'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import Table from '@/components/ui/Table'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { FormItem } from '@/components/ui/Form'
import { NumericFormat } from 'react-number-format'
import { TbTrash, TbMail, TbPhone, TbUser } from 'react-icons/tb'
import useResponsive from '@/utils/hooks/useResponsive'
import useLayoutGap from '@/utils/hooks/useLayoutGap'
import dayjs from 'dayjs'
import {
    apiGetPurchaseOrderById,
    apiUpdatePurchaseOrder,
    apiGetSuppliers,
} from '@/services/PurchasingService'
import type { PurchaseOrder, PurchaseOrderResponse, SuppliersResponse, Supplier } from '@/services/PurchasingService'
import { apiGetItemsList } from '@/services/InventoryService'
import PoEditNavigator from './components/PoEditNavigator'
import ItemSelectSection from '../PurchaseOrderCreate/components/ItemSelectSection'
import SupplierSection from '../PurchaseOrderCreate/components/SupplierSection'
import type { SelectedItem, CatalogItem } from '../PurchaseOrderCreate/components/ItemSelectSection'

const { Tr, Th, Td, THead, TBody } = Table

const PurchaseOrderEdit = () => {
    const { id }     = useParams()
    const { t } = useTranslation()
    const navigate   = useNavigate()
    const { larger } = useResponsive()
    const { getTopGapValue } = useLayoutGap()

    const [supplierId,    setSupplierId]    = useState<number | null>(null)
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
    const [status,        setStatus]        = useState<'draft' | 'ordered' | 'cancelled'>('draft')
    const [supplierRef,   setSupplierRef]   = useState('')
    const [expectedAt,    setExpectedAt]    = useState('')
    const [note,          setNote]          = useState('')
    const [submitting,    setSubmitting]    = useState(false)
    const [discardOpen,   setDiscardOpen]   = useState(false)

    // ── fetch PO ──────────────────────────────────────────────────────────────
    const { data, isLoading } = useSWR<PurchaseOrder>(
        id ? ['/purchasing/orders', id] : null,
        async () => {
            const res = await apiGetPurchaseOrderById(id!)
            return (res as PurchaseOrderResponse).data.purchase_order
        },
        { revalidateOnFocus: false },
    )

    // ── fetch suppliers + catalog items (needed for draft editing) ────────────
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

    const suppliers    = (suppliersData?.data?.suppliers ?? []) as Supplier[]
    const catalogItems = ((itemsData as { data?: { items?: CatalogItem[] } })?.data?.items ?? []) as CatalogItem[]

    // ── pre-fill from loaded PO ───────────────────────────────────────────────
    useEffect(() => {
        if (!data) return
        setSupplierId(data.supplier?.id ?? null)
        setSelectedItems(
            data.lines
                .filter((l) => l.item != null)
                .map((l) => ({
                    id:         l.item!.id,
                    code:       l.item!.code,
                    name:       l.item!.name,
                    unit:       l.item!.unit ?? null,
                    unit_cost:  l.unit_price,
                    qty:        l.qty_ordered,
                    unit_price: l.unit_price,
                })),
        )
        setStatus(data.status as 'draft' | 'ordered' | 'cancelled')
        setSupplierRef(data.supplier_reference ?? '')
        setExpectedAt(
            data.expected_delivery_at ? data.expected_delivery_at.substring(0, 10) : '',
        )
        setNote(data.supplier_note ?? '')
    }, [data])

    const isDraft    = data?.status === 'draft'
    const isEditable = data && ['draft', 'ordered'].includes(data.status)

    const statusOptions = isDraft
        ? [
              { value: 'draft',     label: 'Draft'     },
              { value: 'ordered',   label: 'Ordered'   },
              { value: 'cancelled', label: 'Cancelled' },
          ]
        : [
              { value: 'ordered',   label: 'Ordered'   },
              { value: 'cancelled', label: 'Cancelled' },
          ]

    // ── save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (isDraft) {
            if (!supplierId) {
                toast.push(<Notification type="warning">{t('purchasing.order.selectSupplier')}</Notification>, { placement: 'top-center' })
                return
            }
            if (selectedItems.length === 0) {
                toast.push(<Notification type="warning">{t('purchasing.order.addItem')}</Notification>, { placement: 'top-center' })
                return
            }
        }
        setSubmitting(true)
        try {
            const payload = isDraft
                ? {
                      status,
                      supplier_id:          supplierId!,
                      supplier_reference:   supplierRef || null,
                      expected_delivery_at: expectedAt  || null,
                      supplier_note:        note        || null,
                      lines: selectedItems.map((i) => ({
                          item_id:     i.id,
                          qty_ordered: i.qty,
                          unit_price:  i.unit_price,
                      })),
                  }
                : {
                      status,
                      supplier_reference:   supplierRef || null,
                      expected_delivery_at: expectedAt  || null,
                      supplier_note:        note        || null,
                  }

            await apiUpdatePurchaseOrder(id!, payload)
            await globalMutate((k) => Array.isArray(k) && k[0] === '/purchasing/orders')
            toast.push(<Notification type="success">{t('purchasing.order.updated')}</Notification>, { placement: 'top-center' })
            navigate(`/concepts/purchasing/purchase-orders/${id}`)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update.'
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Loading loading={isLoading}>
            {data && (
                <>
                    <div className="flex">
                        <div className="flex-1 flex flex-col">
                            <Container>
                                <div className="flex gap-4">
                                    {larger.xl && (
                                        <div className="w-[360px]">
                                            <Affix offset={getTopGapValue()}>
                                                <Card>
                                                    <PoEditNavigator isDraft={isDraft ?? false} />
                                                </Card>
                                            </Affix>
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        <div className="flex flex-col gap-4">

                                            {isDraft ? (
                                                /* ── DRAFT: fully editable ──────────────────── */
                                                <>
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
                                                </>
                                            ) : (
                                                /* ── ORDERED+: read-only items & supplier ───── */
                                                <>
                                                    <Card id="lineItems">
                                                        <h4 className="mb-6">Line Items</h4>
                                                        <Table>
                                                            <THead>
                                                                <Tr>
                                                                    <Th className="w-[40%]">Item</Th>
                                                                    <Th className="text-right">Unit Price</Th>
                                                                    <Th className="text-right">Qty Ordered</Th>
                                                                    <Th className="text-right">Received</Th>
                                                                    <Th className="text-right">Total</Th>
                                                                </Tr>
                                                            </THead>
                                                            <TBody>
                                                                {data.lines.map((l) => (
                                                                    <Tr key={l.id}>
                                                                        <Td>
                                                                            <div className="flex items-center gap-2">
                                                                                <Avatar
                                                                                    shape="round"
                                                                                    className="bg-primary/10 text-primary font-bold text-xs"
                                                                                >
                                                                                    {(l.item?.code ?? '?').slice(0, 3).toUpperCase()}
                                                                                </Avatar>
                                                                                <div>
                                                                                    <div className="heading-text font-bold">{l.item?.name}</div>
                                                                                    <div className="text-sm text-gray-500 font-mono">ID: {l.item?.code}</div>
                                                                                </div>
                                                                            </div>
                                                                        </Td>
                                                                        <Td className="text-right">
                                                                            <NumericFormat
                                                                                fixedDecimalScale prefix="$" displayType="text"
                                                                                value={l.unit_price} decimalScale={2} thousandSeparator
                                                                            />
                                                                        </Td>
                                                                        <Td className="text-right font-semibold">
                                                                            {l.qty_ordered} {l.item?.unit}
                                                                        </Td>
                                                                        <Td className="text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                                                            {l.qty_received}
                                                                        </Td>
                                                                        <Td className="text-right">
                                                                            <div className="heading-text font-bold">
                                                                                <NumericFormat
                                                                                    fixedDecimalScale prefix="$" displayType="text"
                                                                                    value={l.line_total} decimalScale={2} thousandSeparator
                                                                                />
                                                                            </div>
                                                                        </Td>
                                                                    </Tr>
                                                                ))}
                                                            </TBody>
                                                        </Table>
                                                        <div className="mt-8 flex justify-end">
                                                            <span className="text-base flex items-center gap-2">
                                                                <span className="font-semibold">Total:</span>
                                                                <span className="text-lg font-bold heading-text">
                                                                    <NumericFormat
                                                                        fixedDecimalScale prefix="$" displayType="text"
                                                                        value={data.total_amount} decimalScale={2} thousandSeparator
                                                                    />
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </Card>

                                                    <Card id="supplierDetails">
                                                        <h4 className="mb-4">Supplier details</h4>
                                                        {data.supplier ? (
                                                            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700">
                                                                <Avatar className="bg-primary text-white font-bold text-sm" size="lg">
                                                                    {data.supplier.name.slice(0, 2).toUpperCase()}
                                                                </Avatar>
                                                                <div className="flex flex-col gap-2 text-sm">
                                                                    <p className="heading-text font-bold text-base">{data.supplier.name}</p>
                                                                    {data.supplier.contact_name && (
                                                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                                            <TbUser className="text-lg opacity-60" />
                                                                            <span>{data.supplier.contact_name}</span>
                                                                        </div>
                                                                    )}
                                                                    {data.supplier.email && (
                                                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                                            <TbMail className="text-lg opacity-60" />
                                                                            <span>{data.supplier.email}</span>
                                                                        </div>
                                                                    )}
                                                                    {data.supplier.phone && (
                                                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                                            <TbPhone className="text-lg opacity-60" />
                                                                            <span>{data.supplier.phone}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-400 text-sm">No supplier assigned.</p>
                                                        )}
                                                    </Card>
                                                </>
                                            )}

                                            {/* Order details — editable for draft+ordered, read-only otherwise */}
                                            <Card id="orderDetails">
                                                <h4 className="mb-6">Order details</h4>

                                                {!isEditable && (
                                                    <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm font-medium">
                                                        This order is <strong>{data.status}</strong> and can no longer be edited.
                                                    </div>
                                                )}

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <FormItem label="Status">
                                                        <Select
                                                            isDisabled={!isEditable}
                                                            options={statusOptions}
                                                            value={statusOptions.find((o) => o.value === status)}
                                                            onChange={(opt) => setStatus((opt?.value ?? 'draft') as typeof status)}
                                                        />
                                                    </FormItem>
                                                    <FormItem label="Supplier Reference">
                                                        <Input
                                                            disabled={!isEditable}
                                                            placeholder="Supplier's PO number (optional)"
                                                            value={supplierRef}
                                                            onChange={(e) => setSupplierRef(e.target.value)}
                                                        />
                                                    </FormItem>
                                                </div>
                                                <FormItem label="Expected Delivery Date">
                                                    <DatePicker
                                                        placeholder="Pick a delivery date"
                                                        disabled={!isEditable}
                                                        minDate={new Date()}
                                                        value={expectedAt ? new Date(expectedAt) : null}
                                                        onChange={(date) => setExpectedAt(date ? dayjs(date).format('YYYY-MM-DD') : '')}
                                                    />
                                                </FormItem>
                                                <FormItem label="Note">
                                                    <Input
                                                        textArea
                                                        rows={4}
                                                        disabled={!isEditable}
                                                        placeholder="Instructions or notes for the supplier..."
                                                        value={note}
                                                        onChange={(e) => setNote(e.target.value)}
                                                    />
                                                </FormItem>
                                            </Card>

                                        </div>
                                    </div>
                                </div>
                            </Container>

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
                                            {isEditable && (
                                                <Button
                                                    variant="solid"
                                                    loading={submitting}
                                                    onClick={handleSave}
                                                >
                                                    Save
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Container>
                            </BottomStickyBar>
                        </div>
                    </div>

                    <ConfirmDialog
                        isOpen={discardOpen}
                        type="danger"
                        title="Discard changes"
                        onClose={() => setDiscardOpen(false)}
                        onRequestClose={() => setDiscardOpen(false)}
                        onCancel={() => setDiscardOpen(false)}
                        onConfirm={() => navigate(`/concepts/purchasing/purchase-orders/${id}`)}
                    >
                        <p>Are you sure you want to discard your changes?</p>
                    </ConfirmDialog>
                </>
            )}
        </Loading>
    )
}

export default PurchaseOrderEdit
