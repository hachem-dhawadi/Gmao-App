import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Radio from '@/components/ui/Radio'
import { Form, FormItem } from '@/components/ui/Form'
import { useForm, Controller } from 'react-hook-form'
import { TbFilter } from 'react-icons/tb'
import useSiteList from '../hooks/useSiteList'
import { initialFilterData } from '../store/siteListStore'
import type { SiteFilter } from '../store/siteListStore'

const statusOptions = [
    { value: 'all',      label: 'All' },
    { value: 'active',   label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
]

const SiteListTableFilter = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { filterData, setFilterData } = useSiteList()

    const { handleSubmit, reset, control } = useForm<SiteFilter>({
        defaultValues: filterData,
    })

    const onSubmit = (values: SiteFilter) => {
        setFilterData(values)
        setDialogOpen(false)
    }

    const handleReset = () => {
        reset(initialFilterData)
        setFilterData(initialFilterData)
        setDialogOpen(false)
    }

    const activeFilters = filterData.status !== 'all' ? 1 : 0

    return (
        <>
            <Button
                icon={<TbFilter />}
                onClick={() => setDialogOpen(true)}
                className={
                    activeFilters > 0
                        ? 'border-primary ring-1 ring-primary text-primary'
                        : ''
                }
            >
                Filter{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </Button>

            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onRequestClose={() => setDialogOpen(false)}
                width={360}
            >
                <h4 className="mb-4">Filter Sites</h4>
                <Form onSubmit={handleSubmit(onSubmit)}>
                    <FormItem label="Status">
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-col gap-3 mt-2">
                                    {statusOptions.map((opt) => (
                                        <Radio
                                            key={opt.value}
                                            name="status"
                                            value={opt.value}
                                            checked={field.value === opt.value}
                                            onChange={() => field.onChange(opt.value)}
                                        >
                                            {opt.label}
                                        </Radio>
                                    ))}
                                </div>
                            )}
                        />
                    </FormItem>

                    <div className="flex justify-end items-center gap-2 mt-6">
                        <Button type="button" onClick={handleReset}>
                            Reset
                        </Button>
                        <Button type="submit" variant="solid">
                            Apply
                        </Button>
                    </div>
                </Form>
            </Dialog>
        </>
    )
}

export default SiteListTableFilter
