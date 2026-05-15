import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import type { Control, FieldErrors } from 'react-hook-form'
import type { WorkOrderFormSchema } from './types'

type Props = {
    control: Control<WorkOrderFormSchema>
    errors: FieldErrors<WorkOrderFormSchema>
}

type StatusOption = {
    value: WorkOrderFormSchema['status']
    label: string
    dotClass: string
}

type PriorityOption = {
    value: WorkOrderFormSchema['priority']
    label: string
    dotClass: string
}

const statusOptions: StatusOption[] = [
    { value: 'open', label: 'Open', dotClass: 'bg-blue-500' },
    { value: 'in_progress', label: 'In Progress', dotClass: 'bg-amber-500' },
    { value: 'on_hold', label: 'On Hold', dotClass: 'bg-gray-400' },
    { value: 'completed', label: 'Completed', dotClass: 'bg-emerald-500' },
    { value: 'cancelled', label: 'Cancelled', dotClass: 'bg-red-500' },
]

const priorityOptions: PriorityOption[] = [
    { value: 'low', label: 'Low', dotClass: 'bg-gray-400' },
    { value: 'medium', label: 'Medium', dotClass: 'bg-blue-500' },
    { value: 'high', label: 'High', dotClass: 'bg-amber-500' },
    { value: 'critical', label: 'Critical', dotClass: 'bg-red-500' },
]

const DotLabel = ({ label, dotClass }: { label: string; dotClass: string }) => (
    <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
        <span>{label}</span>
    </div>
)

const WorkOrderMainSection = ({ control, errors }: Props) => {
    return (
        <Card>
            <h4 className="mb-6">Overview</h4>

            <FormItem
                label="Title"
                asterisk
                invalid={Boolean(errors.title)}
                errorMessage={errors.title?.message}
            >
                <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. Replace hydraulic pump filter"
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label="Code"
                extra={
                    <span className="text-xs text-gray-400">
                        Leave empty to auto-generate
                    </span>
                }
            >
                <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. WO-0001"
                            {...field}
                            onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                            }
                        />
                    )}
                />
            </FormItem>

            <div className="grid grid-cols-2 gap-4">
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
                                    <DotLabel
                                        label={opt.label}
                                        dotClass={opt.dotClass}
                                    />
                                )}
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
                            <Select<PriorityOption>
                                placeholder="Select priority"
                                options={priorityOptions}
                                value={
                                    priorityOptions.find(
                                        (o) => o.value === field.value,
                                    ) || null
                                }
                                onChange={(option) =>
                                    field.onChange(option?.value)
                                }
                                formatOptionLabel={(opt) => (
                                    <DotLabel
                                        label={opt.label}
                                        dotClass={opt.dotClass}
                                    />
                                )}
                            />
                        )}
                    />
                </FormItem>
            </div>

            <FormItem label="Description">
                <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <Input
                            textArea
                            rows={5}
                            placeholder="Describe the work to be done..."
                            {...field}
                        />
                    )}
                />
            </FormItem>
        </Card>
    )
}

export default WorkOrderMainSection
