import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import type { FormSectionBaseProps } from './types'

type UserRoleSectionProps = FormSectionBaseProps

type RoleOption = {
    value: 'admin' | 'hr' | 'manager' | 'technician'
    label: string
}

const roleOptions: RoleOption[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'hr', label: 'HR' },
    { value: 'manager', label: 'Manager' },
    { value: 'technician', label: 'Technician' },
]

const UserRoleSection = ({ control, errors }: UserRoleSectionProps) => {
    return (
        <Card>
            <h4 className="mb-2">User Role</h4>
            <div className="mt-6">
                <FormItem
                    label="Role"
                    invalid={Boolean(errors.role)}
                    errorMessage={errors.role?.message as string}
                >
                    <Controller
                        name="role"
                        control={control}
                        render={({ field }) => (
                            <Select<RoleOption>
                                options={roleOptions}
                                placeholder="Select user role"
                                value={
                                    roleOptions.find(
                                        (option) => option.value === field.value,
                                    ) || null
                                }
                                onChange={(option) =>
                                    field.onChange(option?.value || '')
                                }
                            />
                        )}
                    />
                </FormItem>
            </div>
        </Card>
    )
}

export default UserRoleSection
