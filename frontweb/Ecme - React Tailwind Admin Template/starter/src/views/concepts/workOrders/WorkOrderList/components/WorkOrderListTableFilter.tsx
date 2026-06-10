import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Radio from '@/components/ui/Radio'
import Select from '@/components/ui/Select'
import { Form, FormItem } from '@/components/ui/Form'
import useWorkOrderList from '../hooks/useWorkOrderList'
import { TbFilter } from 'react-icons/tb'
import { useForm, Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'
import { useSessionUser } from '@/store/authStore'
import { apiGetAllSites } from '@/services/SiteService'
import type { WorkOrderFilter } from '../store/workOrderListStore'

type SiteOption = { value: number; label: string }

const WorkOrderListTableFilter = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { filterData, setFilterData } = useWorkOrderList()
    const { t } = useTranslation()
    const isSuperadmin = useSessionUser((s) => s.user.authority?.includes('superadmin'))

    const { data: sitesData } = useSWR(
        !isSuperadmin ? '/sites-all-wo-filter' : null,
        () => apiGetAllSites(),
        { revalidateOnFocus: false },
    )
    const siteOptions: SiteOption[] =
        sitesData?.data?.sites?.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.code})`,
        })) || []

    const { handleSubmit, reset, control } = useForm<WorkOrderFilter>({
        defaultValues: filterData,
    })

    const onSubmit = (values: WorkOrderFilter) => {
        setFilterData(values)
        setDialogOpen(false)
    }

    const handleReset = () => {
        reset({ status: 'all', priority: 'all', myOnly: false, showArchived: false, site_id: null })
        setFilterData({ status: 'all', priority: 'all', myOnly: false, showArchived: false, site_id: null })
        setDialogOpen(false)
    }

    const activeFilters =
        (filterData.status !== 'all' ? 1 : 0) +
        (filterData.priority !== 'all' ? 1 : 0) +
        (filterData.site_id != null ? 1 : 0)

    const statusOptions = [
        { value: 'all',         label: t('wo.status.all') },
        { value: 'open',        label: t('wo.status.open') },
        { value: 'in_progress', label: t('wo.status.in_progress') },
        { value: 'on_hold',     label: t('wo.status.on_hold') },
        { value: 'completed',   label: t('wo.status.completed') },
        { value: 'cancelled',   label: t('wo.status.cancelled') },
    ]

    const priorityOptions = [
        { value: 'all',      label: t('wo.priority.all') },
        { value: 'low',      label: t('wo.priority.low') },
        { value: 'medium',   label: t('wo.priority.medium') },
        { value: 'high',     label: t('wo.priority.high') },
        { value: 'critical', label: t('wo.priority.critical') },
    ]

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
                {t('common.filter')}{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </Button>

            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onRequestClose={() => setDialogOpen(false)}
                width={400}
            >
                <h4 className="mb-4">{t('wo.filter.title')}</h4>
                <Form onSubmit={handleSubmit(onSubmit)}>
                    {!isSuperadmin && siteOptions.length > 0 && (
                        <FormItem label="Site">
                            <Controller
                                name="site_id"
                                control={control}
                                render={({ field }) => (
                                    <Select<SiteOption>
                                        isClearable
                                        placeholder="All sites"
                                        options={siteOptions}
                                        value={siteOptions.find((o) => o.value === field.value) || null}
                                        onChange={(opt) => field.onChange(opt?.value ?? null)}
                                    />
                                )}
                            />
                        </FormItem>
                    )}
                    <FormItem label={t('wo.filter.status')}>
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

                    <FormItem label={t('wo.filter.priority')}>
                        <Controller
                            name="priority"
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-col gap-3 mt-2">
                                    {priorityOptions.map((opt) => (
                                        <Radio
                                            key={opt.value}
                                            name="priority"
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
                            {t('common.reset')}
                        </Button>
                        <Button type="submit" variant="solid">
                            {t('common.apply')}
                        </Button>
                    </div>
                </Form>
            </Dialog>
        </>
    )
}

export default WorkOrderListTableFilter
