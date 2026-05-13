import dayjs from 'dayjs'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import useSWR from 'swr'
import { apiGetAssetTypes } from '@/services/AssetsService'
import type { Control, FieldErrors } from 'react-hook-form'
import type { AssetFormSchema } from './types'
import type { AssetTypesResponse } from '@/services/AssetsService'

type Props = {
    control: Control<AssetFormSchema>
    errors: FieldErrors<AssetFormSchema>
}

type TypeOption = { value: number; label: string }

const AssetDetailsSection = ({ control, errors }: Props) => {
    const { data } = useSWR(
        '/asset-types',
        () => apiGetAssetTypes<AssetTypesResponse>(),
        { revalidateOnFocus: false },
    )

    const typeOptions: TypeOption[] = (data?.data?.asset_types || []).map(
        (t) => ({ value: t.id, label: t.name }),
    )

    return (
        <Card>
            <h4 className="mb-6">Details</h4>

            <FormItem
                label="Asset Type"
                invalid={Boolean(errors.asset_type_id)}
                errorMessage={errors.asset_type_id?.message}
            >
                <Controller
                    name="asset_type_id"
                    control={control}
                    render={({ field }) => (
                        <Select<TypeOption>
                            placeholder="Select type"
                            options={typeOptions}
                            value={
                                typeOptions.find(
                                    (o) => o.value === field.value,
                                ) || null
                            }
                            onChange={(option) =>
                                field.onChange(option?.value ?? null)
                            }
                        />
                    )}
                />
            </FormItem>

            <FormItem label="Location">
                <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. Building A, Floor 2"
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem label="Address Label">
                <Controller
                    name="address_label"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. Zone B – Room 12"
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem label="Purchase Date">
                <Controller
                    name="purchase_date"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            placeholder="Pick a date"
                            value={field.value ? new Date(field.value) : null}
                            onChange={(date) =>
                                field.onChange(
                                    date ? dayjs(date).format('YYYY-MM-DD') : '',
                                )
                            }
                        />
                    )}
                />
            </FormItem>

            <FormItem label="Warranty End">
                <Controller
                    name="warranty_end_at"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            placeholder="Pick a date"
                            value={field.value ? new Date(field.value) : null}
                            onChange={(date) =>
                                field.onChange(
                                    date ? dayjs(date).format('YYYY-MM-DD') : '',
                                )
                            }
                        />
                    )}
                />
            </FormItem>

            <FormItem label="Installed At">
                <Controller
                    name="installed_at"
                    control={control}
                    render={({ field }) => (
                        <DatePicker.DateTimepicker
                            placeholder="Pick date & time"
                            value={field.value ? new Date(field.value) : null}
                            onChange={(date) =>
                                field.onChange(
                                    date
                                        ? dayjs(date).format('YYYY-MM-DD HH:mm:ss')
                                        : '',
                                )
                            }
                        />
                    )}
                />
            </FormItem>
        </Card>
    )
}

export default AssetDetailsSection
