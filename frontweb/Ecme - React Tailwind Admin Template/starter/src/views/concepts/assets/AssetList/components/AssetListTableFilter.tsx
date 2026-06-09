import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Radio from '@/components/ui/Radio'
import Select from '@/components/ui/Select'
import { Form, FormItem } from '@/components/ui/Form'
import useAssetList from '../hooks/useAssetList'
import { TbFilter } from 'react-icons/tb'
import { useForm, Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'
import { apiGetAllSites } from '@/services/SiteService'
import type { AssetFilter } from '../store/assetListStore'

type SiteOption = { value: number; label: string }

const AssetListTableFilter = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { filterData, setFilterData } = useAssetList()
    const { t } = useTranslation()

    const { handleSubmit, reset, control } = useForm<AssetFilter>({
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

    const onSubmit = (values: AssetFilter) => {
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
        { value: 'all',               label: t('assets.status.all') },
        { value: 'active',            label: t('assets.status.active') },
        { value: 'inactive',          label: t('assets.status.inactive') },
        { value: 'under_maintenance', label: t('assets.status.under_maintenance') },
        { value: 'decommissioned',    label: t('assets.status.decommissioned') },
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
                <h4 className="mb-4">{t('common.filter')} — {t('assets.pageTitle')}</h4>
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

export default AssetListTableFilter
