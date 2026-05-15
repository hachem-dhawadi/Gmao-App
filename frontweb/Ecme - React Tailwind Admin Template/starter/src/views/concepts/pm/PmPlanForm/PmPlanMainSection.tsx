import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import type { Control, FieldErrors } from 'react-hook-form'
import type { PmPlanFormSchema } from './types'

type Props = {
    control: Control<PmPlanFormSchema>
    errors: FieldErrors<PmPlanFormSchema>
}

type ColorOption = { value: string; label: string; color: string }

const statusOptions: ColorOption[] = [
    { value: 'active',   label: 'Active',   color: 'bg-emerald-500' },
    { value: 'inactive', label: 'Inactive', color: 'bg-gray-400' },
    { value: 'draft',    label: 'Draft',    color: 'bg-amber-400' },
]

const priorityOptions: ColorOption[] = [
    { value: 'low',      label: 'Low',      color: 'bg-gray-400' },
    { value: 'medium',   label: 'Medium',   color: 'bg-blue-500' },
    { value: 'high',     label: 'High',     color: 'bg-amber-500' },
    { value: 'critical', label: 'Critical', color: 'bg-red-500' },
]

const ColorDotOption = ({ option }: { option: ColorOption }) => (
    <div className="flex items-center gap-2">
        <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${option.color}`} />
        <span>{option.label}</span>
    </div>
)

const PmPlanMainSection = ({ control, errors }: Props) => (
    <Card>
        <h4 className="mb-6">Plan Details</h4>

        <FormItem
            label="Plan Name"
            asterisk
            invalid={Boolean(errors.name)}
            errorMessage={errors.name?.message}
        >
            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <Input placeholder="e.g. Monthly HVAC Inspection" {...field} />
                )}
            />
        </FormItem>

        <FormItem label="Description">
            <Controller
                name="description"
                control={control}
                render={({ field }) => (
                    <Input
                        textArea
                        placeholder="Describe what this PM plan involves..."
                        rows={4}
                        {...field}
                    />
                )}
            />
        </FormItem>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormItem
                label="Status"
                asterisk
                invalid={Boolean(errors.status)}
                errorMessage={errors.status?.message}
            >
                <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                        <Select<ColorOption>
                            placeholder="Select status"
                            options={statusOptions}
                            value={statusOptions.find((o) => o.value === field.value) || null}
                            onChange={(opt) => field.onChange(opt?.value)}
                            formatOptionLabel={(opt) => <ColorDotOption option={opt} />}
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label="Priority"
                asterisk
                invalid={Boolean(errors.priority)}
                errorMessage={errors.priority?.message}
            >
                <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                        <Select<ColorOption>
                            placeholder="Select priority"
                            options={priorityOptions}
                            value={priorityOptions.find((o) => o.value === field.value) || null}
                            onChange={(opt) => field.onChange(opt?.value)}
                            formatOptionLabel={(opt) => <ColorDotOption option={opt} />}
                        />
                    )}
                />
            </FormItem>
        </div>

        <FormItem label="Estimated Time (minutes)">
            <Controller
                name="estimated_minutes"
                control={control}
                render={({ field }) => (
                    <Input type="number" min={1} placeholder="e.g. 60" {...field} />
                )}
            />
        </FormItem>
    </Card>
)

export default PmPlanMainSection
