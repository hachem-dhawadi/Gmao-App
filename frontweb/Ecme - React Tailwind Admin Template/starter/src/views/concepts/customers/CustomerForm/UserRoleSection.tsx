import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import useSWR from 'swr'
import { apiGetRoles } from '@/services/RolesService'
import type { RolesResponse } from '@/services/RolesService'
import type { FormSectionBaseProps } from './types'

type UserRoleSectionProps = FormSectionBaseProps

type RoleOption = { value: string; label: string }

const UserRoleSection = ({ control, errors }: UserRoleSectionProps) => {
    const { data, isLoading } = useSWR<RolesResponse>(
        '/roles',
        () => apiGetRoles<RolesResponse>(),
        { revalidateOnFocus: false },
    )

    const roleOptions: RoleOption[] =
        data?.data?.roles?.map((r) => ({
            value: r.code,
            label: r.label,
        })) || []

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
                                isLoading={isLoading}
                                options={roleOptions}
                                placeholder="Select user role"
                                value={roleOptions.find((o) => o.value === field.value) || null}
                                onChange={(option) => field.onChange(option?.value || '')}
                            />
                        )}
                    />
                </FormItem>
            </div>
        </Card>
    )
}

export default UserRoleSection
