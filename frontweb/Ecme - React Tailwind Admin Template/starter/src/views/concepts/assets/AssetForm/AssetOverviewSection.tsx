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

const statusOptions: StatusOption[] = [
    { value: 'active', label: 'Active', dotClass: 'bg-emerald-500' },
    { value: 'inactive', label: 'Inactive', dotClass: 'bg-gray-400' },
    {
        value: 'under_maintenance',
        label: 'Under Maintenance',
        dotClass: 'bg-amber-500',
    },
    {
        value: 'decommissioned',
        label: 'Decommissioned',
        dotClass: 'bg-red-500',
    },
]

const StatusLabel = ({ label, dotClass }: { label: string; dotClass: string }) => (
    <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
        <span>{label}</span>
    </div>
)

const AssetOverviewSection = ({ control, errors }: Props) => {
    return (
        <Card>
            <h4 className="mb-6">Overview</h4>

            <FormItem
                label="Asset Name"
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
                            placeholder="e.g. Main Compressor"
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label="Code"
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
                            placeholder="e.g. COMP-001"
                            {...field}
                            onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                            }
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label="Status"
                invalid={Boolean(errors.status)}
                errorMessage={errors.status?.message}
            >
                <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                        <Select<StatusOption>
                            placeholder="Select status"
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

            <FormItem label="Serial Number">
                <Controller
                    name="serial_number"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. SN-123456"
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem label="Manufacturer">
                <Controller
                    name="manufacturer"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. Siemens"
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem label="Model">
                <Controller
                    name="model"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. SIRIUS 3RW40"
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem label="Notes">
                <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                        <Input
                            textArea
                            rows={4}
                            placeholder="Any additional information about this asset..."
                            {...field}
                        />
                    )}
                />
            </FormItem>
        </Card>
    )
}

export default AssetOverviewSection
