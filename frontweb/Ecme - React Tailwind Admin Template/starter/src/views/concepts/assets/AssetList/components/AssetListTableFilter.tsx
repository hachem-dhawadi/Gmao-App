import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Radio from '@/components/ui/Radio'
import { Form, FormItem } from '@/components/ui/Form'
import useAssetList from '../hooks/useAssetList'
import { TbFilter } from 'react-icons/tb'
import { useForm, Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { AssetFilter } from '../store/assetListStore'

const AssetListTableFilter = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { filterData, setFilterData } = useAssetList()
    const { t } = useTranslation()

    const { handleSubmit, reset, control } = useForm<AssetFilter>({
        defaultValues: filterData,
    })

    const onSubmit = (values: AssetFilter) => {
        setFilterData(values)
        setDialogOpen(false)
    }

    const handleReset = () => {
        reset({ status: 'all' })
        setFilterData({ status: 'all' })
        setDialogOpen(false)
    }

    const isActive = filterData.status !== 'all'

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
                    isActive
                        ? 'border-primary ring-1 ring-primary text-primary'
                        : ''
                }
            >
                {t('common.filter')}{isActive ? ' (1)' : ''}
            </Button>

            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onRequestClose={() => setDialogOpen(false)}
                width={400}
            >
                <h4 className="mb-4">{t('common.filter')} — {t('assets.pageTitle')}</h4>
                <Form onSubmit={handleSubmit(onSubmit)}>
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
