import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Select from '@/components/ui/Select'
import { Form, FormItem } from '@/components/ui/Form'
import useWarehouseList from '../hooks/useWarehouseList'
import { TbFilter } from 'react-icons/tb'
import { useForm, Controller } from 'react-hook-form'
import useSWR from 'swr'
import { apiGetAllSites } from '@/services/SiteService'
import type { WarehouseFilter } from '../store/warehouseListStore'

type SiteOption = { value: number; label: string }

const WarehouseListTableFilter = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { filterData, setFilterData } = useWarehouseList()

    const { handleSubmit, reset, control } = useForm<WarehouseFilter>({
        defaultValues: filterData,
    })

    const { data: sitesData } = useSWR(
        '/sites/all',
        () => apiGetAllSites(),
        { revalidateOnFocus: false },
    )
    const siteOptions: SiteOption[] = ((sitesData as any)?.data?.sites || [])
        .filter((s: any) => s.is_active !== false)
        .map((s: any) => ({ value: s.id, label: `${s.name} (${s.code})` }))

    const onSubmit = (values: WarehouseFilter) => {
        setFilterData(values)
        setDialogOpen(false)
    }

    const handleReset = () => {
        reset({ site_id: null })
        setFilterData({ site_id: null })
        setDialogOpen(false)
    }

    const activeCount = filterData.site_id != null ? 1 : 0

    return (
        <>
            <Button
                icon={<TbFilter />}
                onClick={() => setDialogOpen(true)}
                className={
                    activeCount > 0
                        ? 'border-primary ring-1 ring-primary text-primary'
                        : ''
                }
            >
                Filter{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>

            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onRequestClose={() => setDialogOpen(false)}
                width={360}
            >
                <h4 className="mb-4">Filter — Warehouses</h4>
                <Form onSubmit={handleSubmit(onSubmit)}>
                    <FormItem label="Site">
                        <Controller
                            name="site_id"
                            control={control}
                            render={({ field }) => (
                                <Select<SiteOption>
                                    placeholder="All sites"
                                    options={siteOptions}
                                    isClearable
                                    value={siteOptions.find((o) => o.value === field.value) ?? null}
                                    onChange={(opt) => field.onChange(opt?.value ?? null)}
                                />
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

export default WarehouseListTableFilter
