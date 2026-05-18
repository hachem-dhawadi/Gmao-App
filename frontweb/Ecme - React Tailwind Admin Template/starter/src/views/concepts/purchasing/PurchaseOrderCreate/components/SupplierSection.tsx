import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import Avatar from '@/components/ui/Avatar'
import { FormItem } from '@/components/ui/Form'
import { TbMail, TbPhone, TbUser } from 'react-icons/tb'
import type { Supplier } from '@/services/PurchasingService'

type SupplierSectionProps = {
    suppliers: Supplier[]
    supplierId: number | null
    onChange: (id: number | null) => void
}

const SupplierSection = ({ suppliers, supplierId, onChange }: SupplierSectionProps) => {
    const options = suppliers.map((s) => ({ value: s.id, label: s.name, supplier: s }))
    const selected = suppliers.find((s) => s.id === supplierId)

    return (
        <Card id="supplierDetails">
            <h4 className="mb-6">Supplier details</h4>

            <FormItem label="Supplier">
                <Select
                    placeholder="Select a supplier..."
                    options={options}
                    value={options.find((o) => o.value === supplierId) ?? null}
                    formatOptionLabel={(opt) => (
                        <div className="flex items-center gap-2">
                            <Avatar
                                shape="circle"
                                size={24}
                                className="bg-primary text-white text-xs font-bold"
                            >
                                {opt.label.slice(0, 2).toUpperCase()}
                            </Avatar>
                            <span>{opt.label}</span>
                        </div>
                    )}
                    onChange={(opt) => onChange(opt?.value ?? null)}
                />
            </FormItem>

            {selected && (
                <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 flex flex-col gap-3 text-sm">
                    {selected.contact_name && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <TbUser className="text-lg opacity-60" />
                            <span>{selected.contact_name}</span>
                        </div>
                    )}
                    {selected.email && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <TbMail className="text-lg opacity-60" />
                            <span>{selected.email}</span>
                        </div>
                    )}
                    {selected.phone && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <TbPhone className="text-lg opacity-60" />
                            <span>{selected.phone}</span>
                        </div>
                    )}
                </div>
            )}
        </Card>
    )
}

export default SupplierSection
