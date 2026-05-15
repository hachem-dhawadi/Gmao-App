import { useState } from 'react'
import Button from '@/components/ui/Button'
import Drawer from '@/components/ui/Drawer'
import Checkbox from '@/components/ui/Checkbox'
import Badge from '@/components/ui/Badge'
import { Form, FormItem } from '@/components/ui/Form'
import NumericInput from '@/components/shared/NumericInput'
import { TbFilter, TbMinus } from 'react-icons/tb'
import { useForm, Controller } from 'react-hook-form'
import useItemList from '../hooks/useItemList'
import type { ItemFilter } from '../store/itemListStore'

const ItemTableFilter = () => {
    const [filterIsOpen, setFilterIsOpen] = useState(false)
    const { filterData, setFilterData } = useItemList()

    const { handleSubmit, control, reset } = useForm<ItemFilter>({
        defaultValues: filterData,
    })

    const activeFilterCount = [
        filterData.minCost !== '',
        filterData.maxCost !== '',
        filterData.stockedOnly,
        filterData.lowStockOnly,
    ].filter(Boolean).length

    const onSubmit = (values: ItemFilter) => {
        setFilterData(values)
        setFilterIsOpen(false)
    }

    const onClear = () => {
        const cleared: ItemFilter = {
            minCost: '',
            maxCost: '',
            stockedOnly: false,
            lowStockOnly: false,
        }
        reset(cleared)
        setFilterData(cleared)
        setFilterIsOpen(false)
    }

    return (
        <>
            <Button
                icon={<TbFilter />}
                onClick={() => setFilterIsOpen(true)}
            >
                Filter
                {activeFilterCount > 0 && (
                    <Badge
                        className="ml-2 bg-primary text-white"
                        content={activeFilterCount}
                    />
                )}
            </Button>

            <Drawer
                title="Filter Items"
                isOpen={filterIsOpen}
                onClose={() => setFilterIsOpen(false)}
                onRequestClose={() => setFilterIsOpen(false)}
            >
                <Form
                    className="h-full"
                    containerClassName="flex flex-col justify-between h-full"
                    onSubmit={handleSubmit(onSubmit)}
                >
                    <div className="flex flex-col gap-6">
                        <FormItem label="Unit cost range">
                            <div className="flex items-center gap-2">
                                <Controller
                                    name="minCost"
                                    control={control}
                                    render={({ field }) => (
                                        <NumericInput
                                            thousandSeparator
                                            type="text"
                                            autoComplete="off"
                                            placeholder="Min"
                                            value={field.value as number | string}
                                            onChange={(e) =>
                                                field.onChange(e.target.value)
                                            }
                                        />
                                    )}
                                />
                                <span className="text-gray-400">
                                    <TbMinus />
                                </span>
                                <Controller
                                    name="maxCost"
                                    control={control}
                                    render={({ field }) => (
                                        <NumericInput
                                            thousandSeparator
                                            type="text"
                                            autoComplete="off"
                                            placeholder="Max"
                                            value={field.value as number | string}
                                            onChange={(e) =>
                                                field.onChange(e.target.value)
                                            }
                                        />
                                    )}
                                />
                            </div>
                        </FormItem>

                        <FormItem label="Stock filters">
                            <div className="flex flex-col gap-3 mt-2">
                                <Controller
                                    name="stockedOnly"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            checked={field.value}
                                            onChange={field.onChange}
                                            className="justify-between flex-row-reverse heading-text"
                                        >
                                            Stocked items only
                                        </Checkbox>
                                    )}
                                />
                                <Controller
                                    name="lowStockOnly"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            checked={field.value}
                                            onChange={field.onChange}
                                            className="justify-between flex-row-reverse heading-text"
                                        >
                                            Low stock alert only
                                        </Checkbox>
                                    )}
                                />
                            </div>
                        </FormItem>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            className="flex-1"
                            onClick={onClear}
                        >
                            Clear
                        </Button>
                        <Button
                            variant="solid"
                            type="submit"
                            className="flex-1"
                        >
                            Apply
                        </Button>
                    </div>
                </Form>
            </Drawer>
        </>
    )
}

export default ItemTableFilter
