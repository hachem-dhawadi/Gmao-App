import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Radio from '@/components/ui/Radio'
import Select from '@/components/ui/Select'
import { Form, FormItem } from '@/components/ui/Form'
import useCustomerList from '../hooks/useCustomerList'
import { TbFilter } from 'react-icons/tb'
import { useForm, Controller } from 'react-hook-form'
import { useSessionUser } from '@/store/authStore'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'
import { apiGetAllSites } from '@/services/SiteService'
import type { Filter } from '../types'

type SiteOption = { value: number; label: string }

const CustomerListTableFilter = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { filterData, setFilterData } = useCustomerList()
    const { t } = useTranslation()
    const isSuperadmin = useSessionUser((state) => Boolean(state.user.isSuperadmin))

    const { handleSubmit, reset, control } = useForm<Filter>({
        defaultValues: filterData,
    })

    const { data: sitesData } = useSWR(
        !isSuperadmin ? '/sites/all' : null,
        () => apiGetAllSites(),
        { revalidateOnFocus: false },
    )
    const siteOptions: SiteOption[] = ((sitesData as any)?.data?.sites || [])
        .filter((s: any) => s.is_active !== false)
        .map((s: any) => ({ value: s.id, label: `${s.name} (${s.code})` }))

    const onSubmit = (values: Filter) => {
        setFilterData(values)
        setDialogOpen(false)
    }

    const handleReset = () => {
        reset({ status: 'all', site_id: null })
        setFilterData({ status: 'all', site_id: null })
        setDialogOpen(false)
    }

    const activeCount =
        (filterData.status !== 'all' ? 1 : 0) +
        (filterData.site_id != null ? 1 : 0)

    const statusOptions = [
        { value: 'all', label: t('members.status.all', 'All') },
        { value: 'active', label: t('members.status.active') },
        { value: 'blocked', label: t('members.status.blocked', 'Inactive') },
    ]

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
                {t('common.filter')}{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>

            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onRequestClose={() => setDialogOpen(false)}
                width={400}
            >
                <h4 className="mb-4">{t('common.filter')} — {t('members.pageTitle')}</h4>
                <Form onSubmit={handleSubmit(onSubmit)}>

                    {!isSuperadmin && siteOptions.length > 0 && (
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
                    )}

                    <FormItem label={t('common.status')}>
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

export default CustomerListTableFilter
