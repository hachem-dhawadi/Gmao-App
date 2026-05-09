import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Radio from '@/components/ui/Radio'
import { Form, FormItem } from '@/components/ui/Form'
import useDepartmentList from '../hooks/useDepartmentList'
import { TbFilter } from 'react-icons/tb'
import { useForm, Controller } from 'react-hook-form'
import type { DepartmentFilter } from '../store/departmentListStore'

const DepartmentListTableFilter = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { filterData, setFilterData } = useDepartmentList()

    const { handleSubmit, reset, control } = useForm<DepartmentFilter>({
        defaultValues: filterData,
    })

    const onSubmit = (values: DepartmentFilter) => {
        setFilterData(values)
        setDialogOpen(false)
    }

    const handleReset = () => {
        reset({ level: 'all' })
        setFilterData({ level: 'all' })
        setDialogOpen(false)
    }

    const isActive = filterData.level !== 'all'

    return (
        <>
            <Button
                icon={<TbFilter />}
                onClick={() => setDialogOpen(true)}
                className={
                    isActive
                        ? 'border-primary ring-1 ring-primary text-primary'
                        : ''
                }
            >
                Filter{isActive ? ' (1)' : ''}
            </Button>

            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onRequestClose={() => setDialogOpen(false)}
                width={400}
            >
                <h4 className="mb-4">Filter Departments</h4>
                <Form onSubmit={handleSubmit(onSubmit)}>
                    <FormItem label="Department Level">
                        <Controller
                            name="level"
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-col gap-3 mt-2">
                                    <Radio
                                        name="level"
                                        value="all"
                                        checked={field.value === 'all'}
                                        onChange={() => field.onChange('all')}
                                    >
                                        All departments
                                    </Radio>
                                    <Radio
                                        name="level"
                                        value="top"
                                        checked={field.value === 'top'}
                                        onChange={() => field.onChange('top')}
                                    >
                                        Top-level only (no parent)
                                    </Radio>
                                    <Radio
                                        name="level"
                                        value="sub"
                                        checked={field.value === 'sub'}
                                        onChange={() => field.onChange('sub')}
                                    >
                                        Sub-departments only (has parent)
                                    </Radio>
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

export default DepartmentListTableFilter
