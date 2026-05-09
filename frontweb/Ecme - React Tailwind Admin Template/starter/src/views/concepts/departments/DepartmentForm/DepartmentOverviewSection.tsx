import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import type { Control, FieldErrors } from 'react-hook-form'
import type { DepartmentFormSchema } from './types'

type Props = {
    control: Control<DepartmentFormSchema>
    errors: FieldErrors<DepartmentFormSchema>
}

const DepartmentOverviewSection = ({ control, errors }: Props) => {
    return (
        <Card>
            <h4 className="mb-6">Overview</h4>

            <FormItem
                label="Department Name"
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
                            placeholder="e.g. Maintenance"
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label="Code"
                invalid={Boolean(errors.code)}
                errorMessage={errors.code?.message}
                extra={
                    <span className="text-xs text-gray-400">
                        Unique identifier, uppercase
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
                            placeholder="e.g. MAINT"
                            {...field}
                            onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                            }
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label="Description"
                invalid={Boolean(errors.description)}
                errorMessage={errors.description?.message}
            >
                <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <Input
                            textArea
                            rows={5}
                            placeholder="Describe the purpose of this department..."
                            {...field}
                        />
                    )}
                />
            </FormItem>
        </Card>
    )
}

export default DepartmentOverviewSection
