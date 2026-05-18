import { useState, useMemo } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Checkbox from '@/components/ui/Checkbox'
import Avatar from '@/components/ui/Avatar'
import Table from '@/components/ui/Table'
import ScrollBar from '@/components/ui/ScrollBar'
import Input from '@/components/ui/Input'
import AutoComplete from '@/components/shared/AutoComplete'
import { NumericFormat } from 'react-number-format'
import { TbSearch, TbMinus, TbPlus } from 'react-icons/tb'

const { Tr, Th, Td, THead, TBody } = Table

export type CatalogItem = {
    id: number
    code: string
    name: string
    unit: string | null
    unit_cost: number | null
}

export type SelectedItem = CatalogItem & {
    qty: number
    unit_price: number
}

type ItemSelectSectionProps = {
    catalogItems: CatalogItem[]
    selectedItems: SelectedItem[]
    onChange: (items: SelectedItem[]) => void
}

const ItemSelectSection = ({ catalogItems, selectedItems, onChange }: ItemSelectSectionProps) => {
    const [inputValue, setInputValue]         = useState('')
    const [browseOpen, setBrowseOpen]         = useState(false)

    const autocompleteOptions = catalogItems.map((i) => ({
        value: i.id,
        label: `${i.name} (${i.code})`,
        item: i,
    }))

    const handleOptionSelect = (opt: { value: number; label: string; item: CatalogItem }) => {
        if (selectedItems.some((s) => s.id === opt.value)) return
        onChange([...selectedItems, { ...opt.item, qty: 1, unit_price: opt.item.unit_cost ?? 0 }])
        setInputValue('')
    }

    const handleBrowseToggle = (checked: boolean, item: CatalogItem) => {
        if (checked) {
            if (selectedItems.some((s) => s.id === item.id)) return
            onChange([...selectedItems, { ...item, qty: 1, unit_price: item.unit_cost ?? 0 }])
        } else {
            onChange(selectedItems.filter((s) => s.id !== item.id))
        }
    }

    const updateQty = (id: number, delta: number) => {
        onChange(
            selectedItems
                .map((s) => s.id === id ? { ...s, qty: Math.max(0, s.qty + delta) } : s)
                .filter((s) => s.qty > 0),
        )
    }

    const updatePrice = (id: number, price: string) => {
        onChange(selectedItems.map((s) => s.id === id ? { ...s, unit_price: parseFloat(price) || 0 } : s))
    }

    const total = useMemo(
        () => selectedItems.reduce((acc, s) => acc + s.qty * s.unit_price, 0),
        [selectedItems],
    )

    return (
        <>
            <Card id="selectItems">
                <h4 className="mb-6">Select items</h4>
                <div className="flex items-center gap-2">
                    <AutoComplete
                        data={autocompleteOptions}
                        optionKey={(o) => o.label}
                        value={inputValue}
                        renderOption={(opt) => (
                            <div className="flex items-center gap-2">
                                <Avatar shape="round" className="bg-primary/10 text-primary text-xs font-bold">
                                    {opt.item.code.slice(0, 3).toUpperCase()}
                                </Avatar>
                                <span>{opt.label}</span>
                            </div>
                        )}
                        suffix={<TbSearch className="text-lg" />}
                        placeholder="Search item by name or code..."
                        onInputChange={setInputValue}
                        onOptionSelected={handleOptionSelect}
                    />
                    <Button type="button" variant="solid" onClick={() => setBrowseOpen(true)}>
                        Browse items
                    </Button>
                </div>

                <Table className="mt-6">
                    <THead>
                        <Tr>
                            <Th className="w-[40%]">Item</Th>
                            <Th>Unit Price</Th>
                            <Th>Quantity</Th>
                            <Th className="text-right">Total</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {selectedItems.length > 0 ? (
                            selectedItems.map((item) => (
                                <Tr key={item.id}>
                                    <Td>
                                        <div className="flex items-center gap-2">
                                            <Avatar
                                                shape="round"
                                                className="bg-primary/10 text-primary font-bold text-xs"
                                            >
                                                {item.code.slice(0, 3).toUpperCase()}
                                            </Avatar>
                                            <div>
                                                <div className="heading-text font-bold">{item.name}</div>
                                                <div className="text-sm text-gray-500 font-mono">ID: {item.code}</div>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="w-28">
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={item.unit_price}
                                                prefix="$"
                                                onChange={(e) => updatePrice(item.id, e.target.value)}
                                            />
                                        </div>
                                    </Td>
                                    <Td>
                                        <div className="flex items-center">
                                            <Button
                                                type="button"
                                                icon={<TbMinus />}
                                                size="xs"
                                                onClick={() => updateQty(item.id, -1)}
                                            />
                                            <div className="w-10 text-center font-semibold heading-text">
                                                {item.qty}
                                            </div>
                                            <Button
                                                type="button"
                                                icon={<TbPlus />}
                                                size="xs"
                                                onClick={() => updateQty(item.id, 1)}
                                            />
                                        </div>
                                        {item.unit && (
                                            <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                                        )}
                                    </Td>
                                    <Td className="text-right">
                                        <div className="heading-text font-bold">
                                            <NumericFormat
                                                fixedDecimalScale
                                                prefix="$"
                                                displayType="text"
                                                value={item.qty * item.unit_price}
                                                decimalScale={2}
                                                thousandSeparator
                                            />
                                        </div>
                                    </Td>
                                </Tr>
                            ))
                        ) : (
                            <Tr>
                                <Td className="text-center text-gray-400" colSpan={4}>
                                    No items selected yet. Search or browse to add items.
                                </Td>
                            </Tr>
                        )}
                    </TBody>
                </Table>

                <div className="mt-8 flex justify-end">
                    <span className="text-base flex items-center gap-2">
                        <span className="font-semibold">Total:</span>
                        <span className="text-lg font-bold heading-text">
                            <NumericFormat
                                fixedDecimalScale
                                prefix="$"
                                displayType="text"
                                value={total}
                                decimalScale={2}
                                thousandSeparator
                            />
                        </span>
                    </span>
                </div>
            </Card>

            {/* Browse dialog */}
            <Dialog
                isOpen={browseOpen}
                onClose={() => setBrowseOpen(false)}
                onRequestClose={() => setBrowseOpen(false)}
            >
                <div className="text-center mb-6">
                    <h4 className="mb-1">All items</h4>
                    <p>Add items to this purchase order.</p>
                </div>
                <ScrollBar className="overflow-y-auto h-80">
                    {catalogItems.map((item) => (
                        <div
                            key={item.id}
                            className="py-3 pr-5 rounded-lg flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <div className="px-1">
                                    <Checkbox
                                        checked={selectedItems.some((s) => s.id === item.id)}
                                        onChange={(checked) => handleBrowseToggle(checked, item)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Avatar
                                        size="lg"
                                        shape="round"
                                        className="bg-primary/10 text-primary font-bold text-sm"
                                    >
                                        {item.code.slice(0, 3).toUpperCase()}
                                    </Avatar>
                                    <div>
                                        <p className="heading-text font-bold">{item.name}</p>
                                        <p className="text-sm font-mono text-gray-500">ID: {item.code}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm text-gray-500">
                                {item.unit_cost != null ? (
                                    <NumericFormat
                                        fixedDecimalScale prefix="$" displayType="text"
                                        value={item.unit_cost} decimalScale={2} thousandSeparator
                                        className="heading-text font-bold"
                                    />
                                ) : '—'}
                            </div>
                        </div>
                    ))}
                </ScrollBar>
                <Button block type="button" variant="solid" className="mt-4" onClick={() => setBrowseOpen(false)}>
                    Done
                </Button>
            </Dialog>
        </>
    )
}

export default ItemSelectSection
