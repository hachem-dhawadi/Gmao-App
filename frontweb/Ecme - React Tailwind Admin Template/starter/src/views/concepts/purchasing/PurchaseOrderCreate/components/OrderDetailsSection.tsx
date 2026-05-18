import dayjs from 'dayjs'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'

type OrderDetailsSectionProps = {
    status: 'draft' | 'ordered'
    supplierRef: string
    expectedAt: string
    note: string
    onStatusChange: (v: 'draft' | 'ordered') => void
    onSupplierRefChange: (v: string) => void
    onExpectedAtChange: (v: string) => void
    onNoteChange: (v: string) => void
}

const STATUS_OPTIONS = [
    { value: 'draft',   label: 'Draft'   },
    { value: 'ordered', label: 'Ordered' },
]

const OrderDetailsSection = ({
    status,
    supplierRef,
    expectedAt,
    note,
    onStatusChange,
    onSupplierRefChange,
    onExpectedAtChange,
    onNoteChange,
}: OrderDetailsSectionProps) => {
    return (
        <Card id="orderDetails">
            <h4 className="mb-6">Order details</h4>
            <div className="grid md:grid-cols-2 gap-4">
                <FormItem label="Status">
                    <Select
                        options={STATUS_OPTIONS}
                        value={STATUS_OPTIONS.find((o) => o.value === status)}
                        onChange={(opt) => onStatusChange((opt?.value ?? 'draft') as 'draft' | 'ordered')}
                    />
                </FormItem>
                <FormItem label="Supplier Reference">
                    <Input
                        placeholder="Supplier's PO number (optional)"
                        value={supplierRef}
                        onChange={(e) => onSupplierRefChange(e.target.value)}
                    />
                </FormItem>
            </div>
            <FormItem label="Expected Delivery Date">
                <DatePicker
                    placeholder="Pick a delivery date"
                    minDate={new Date()}
                    value={expectedAt ? new Date(expectedAt) : null}
                    onChange={(date) => onExpectedAtChange(date ? dayjs(date).format('YYYY-MM-DD') : '')}
                />
            </FormItem>
            <FormItem label="Note">
                <Input
                    textArea
                    rows={4}
                    placeholder="Instructions or notes for the supplier..."
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                />
            </FormItem>
        </Card>
    )
}

export default OrderDetailsSection
