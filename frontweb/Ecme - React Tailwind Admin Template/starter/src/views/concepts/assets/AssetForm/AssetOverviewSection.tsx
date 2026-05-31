import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import type { Control, FieldErrors } from 'react-hook-form'
import type { AssetFormSchema } from './types'

type Props = {
    control: Control<AssetFormSchema>
    errors: FieldErrors<AssetFormSchema>
}

type StatusOption = {
    value: AssetFormSchema['status']
    label: string
    dotClass: string
}

const StatusLabel = ({ label, dotClass }: { label: string; dotClass: string }) => (
    <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
        <span>{label}</span>
    </div>
)

const AssetOverviewSection = ({ control, errors }: Props) => {
    const { t } = useTranslation()

    const statusOptions: StatusOption[] = useMemo(() => [
        { value: 'active', label: t('assetForm.status.active'), dotClass: 'bg-emerald-500' },
        { value: 'inactive', label: t('assetForm.status.inactive'), dotClass: 'bg-gray-400' },
        { value: 'under_maintenance', label: t('assetForm.status.under_maintenance'), dotClass: 'bg-amber-500' },
        { value: 'decommissioned', label: t('assetForm.status.decommissioned'), dotClass: 'bg-red-500' },
    ], [t])

    return (
        <Card>
            <h4 className="mb-6">{t('assetForm.overview')}</h4>

            <FormItem
                label={t('assetForm.field.assetName')}
                invalid={Boolean(errors.name)}
                errorMessage={errors.name?.message}
            >
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder={t('assetForm.placeholder.assetName')}
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label={t('common.code')}
                invalid={Boolean(errors.code)}
                errorMessage={errors.code?.message}
            >
                <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder={t('assetForm.placeholder.assetCode')}
                            {...field}
                            onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                            }
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label={t('common.status')}
                invalid={Boolean(errors.status)}
                errorMessage={errors.status?.message}
            >
                <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                        <Select<StatusOption>
                            placeholder={t('assetForm.selectStatus')}
                            options={statusOptions}
                            value={
                                statusOptions.find(
                                    (o) => o.value === field.value,
                                ) || null
                            }
                            onChange={(option) =>
                                field.onChange(option?.value)
                            }
                            formatOptionLabel={(opt) => (
                                <StatusLabel
                                    label={opt.label}
                                    dotClass={opt.dotClass}
                                />
                            )}
                        />
                    )}
                />
            </FormItem>

            <FormItem label={t('assetForm.field.serialNumber')}>
                <Controller
                    name="serial_number"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder={t('assetForm.placeholder.serialNumber')}
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem label={t('assetForm.field.manufacturer')}>
                <Controller
                    name="manufacturer"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder={t('assetForm.placeholder.manufacturer')}
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem label={t('assetForm.field.model')}>
                <Controller
                    name="model"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder={t('assetForm.placeholder.model')}
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem label={t('common.description')}>
                <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                        <Input
                            textArea
                            rows={4}
                            placeholder={t('assetForm.placeholder.notes')}
                            {...field}
                        />
                    )}
                />
            </FormItem>
        </Card>
    )
}

export default AssetOverviewSection
