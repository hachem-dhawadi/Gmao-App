import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import { Form, FormItem } from '@/components/ui/Form'
import useCustomerList from '../hooks/useCustomerList'
import { TbFilter } from 'react-icons/tb'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import cloneDeep from 'lodash/cloneDeep'
import type { ZodType } from 'zod'

const statusList = ['pending', 'approved', 'rejected'] as const

type FormSchema = {
    companyName: string
    companyStatus: Array<(typeof statusList)[number]>
}

const validationSchema: ZodType<FormSchema> = z.object({
    companyName: z.string(),
    companyStatus: z.array(z.enum(statusList)),
})

const CustomerListTableFilter = () => {
    const [dialogIsOpen, setIsOpen] = useState(false)

    const { filterData, setFilterData, tableData, setTableData } = useCustomerList()

    const openDialog = () => {
        setIsOpen(true)
    }

    const onDialogClose = () => {
        setIsOpen(false)
    }

    const { handleSubmit, reset, control } = useForm<FormSchema>({
        defaultValues: filterData,
        resolver: zodResolver(validationSchema),
    })

    useEffect(() => {
        reset(filterData)
    }, [filterData, reset])

    const onSubmit = (values: FormSchema) => {
        const normalizedValues: FormSchema = {
            companyName: values.companyName.trim(),
            companyStatus: values.companyStatus,
        }

        setFilterData(normalizedValues)
        const newTableData = cloneDeep(tableData)
        newTableData.pageIndex = 1
        setTableData(newTableData)
        setIsOpen(false)
    }

    const onReset = () => {
        const resetValues: FormSchema = {
            companyName: '',
            companyStatus: [],
        }
        reset(resetValues)
        setFilterData(resetValues)
        const newTableData = cloneDeep(tableData)
        newTableData.pageIndex = 1
        setTableData(newTableData)
    }

    return (
        <>
            <Button icon={<TbFilter />} onClick={openDialog}>
                Filter
            </Button>
            <Dialog
                isOpen={dialogIsOpen}
                onClose={onDialogClose}
                onRequestClose={onDialogClose}
            >
                <h4 className="mb-4">Filter Companies</h4>
                <Form onSubmit={handleSubmit(onSubmit)}>
                    <FormItem label="Company">
                        <Controller
                            name="companyName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder="Search by company name"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem label="Company Status">
                        <Controller
                            name="companyStatus"
                            control={control}
                            render={({ field }) => (
                                <Checkbox.Group
                                    vertical
                                    className="flex mt-4"
                                    value={field.value}
                                    onChange={(value) =>
                                        field.onChange(
                                            value as Array<
                                                (typeof statusList)[number]
                                            >,
                                        )
                                    }
                                >
                                    {statusList.map((status) => (
                                        <Checkbox
                                            key={status}
                                            name={field.name}
                                            value={status}
                                            className="justify-between flex-row-reverse heading-text"
                                        >
                                            <span className="capitalize">
                                                {status}
                                            </span>
                                        </Checkbox>
                                    ))}
                                </Checkbox.Group>
                            )}
                        />
                    </FormItem>
                    <div className="flex justify-end items-center gap-2 mt-4">
                        <Button type="button" onClick={onReset}>
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

export default CustomerListTableFilter
