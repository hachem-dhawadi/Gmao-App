import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Radio from '@/components/ui/Radio'
import { Form, FormItem } from '@/components/ui/Form'
import useWorkOrderList from '../hooks/useWorkOrderList'
import { TbFilter } from 'react-icons/tb'
import { useForm, Controller } from 'react-hook-form'
import type { WorkOrderFilter } from '../store/workOrderListStore'

const WorkOrderListTableFilter = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { filterData, setFilterData } = useWorkOrderList()

    const { handleSubmit, reset, control } = useForm<WorkOrderFilter>({
        defaultValues: filterData,
    })

    const onSubmit = (values: WorkOrderFilter) => {
        setFilterData(values)
        setDialogOpen(false)
    }

    const handleReset = () => {
        reset({ status: 'all', priority: 'all' })
        setFilterData({ status: 'all', priority: 'all' })
        setDialogOpen(false)
    }

    const activeFilters =
        (filterData.status !== 'all' ? 1 : 0) +
        (filterData.priority !== 'all' ? 1 : 0)

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
                width={400}
            >
                <h4 className="mb-4">Filter Work Orders</h4>
                <Form onSubmit={handleSubmit(onSubmit)}>
                    <FormItem label="Status">
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-col gap-3 mt-2">
                                    {[
                                        { value: 'all', label: 'All statuses' },
                                        { value: 'open', label: 'Open' },
                                        { value: 'in_progress', label: 'In Progress' },
                                        { value: 'on_hold', label: 'On Hold' },
                                        { value: 'completed', label: 'Completed' },
                                        { value: 'cancelled', label: 'Cancelled' },
                                    ].map((opt) => (
                                        <Radio
                                            key={opt.value}
                                            name="status"
                                            value={opt.value}
                                            checked={field.value === opt.value}
                                            onChange={() =>
                                                field.onChange(opt.value)
                                            }
                                        >
                                            {opt.label}
                                        </Radio>
                                    ))}
                                </div>
                            )}
                        />
                    </FormItem>

                    <FormItem label="Priority">
                        <Controller
                            name="priority"
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-col gap-3 mt-2">
                                    {[
                                        { value: 'all', label: 'All priorities' },
                                        { value: 'low', label: 'Low' },
                                        { value: 'medium', label: 'Medium' },
                                        { value: 'high', label: 'High' },
                                        { value: 'critical', label: 'Critical' },
                                    ].map((opt) => (
                                        <Radio
                                            key={opt.value}
                                            name="priority"
                                            value={opt.value}
                                            checked={field.value === opt.value}
                                            onChange={() =>
                                                field.onChange(opt.value)
                                            }
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

export default WorkOrderListTableFilter
