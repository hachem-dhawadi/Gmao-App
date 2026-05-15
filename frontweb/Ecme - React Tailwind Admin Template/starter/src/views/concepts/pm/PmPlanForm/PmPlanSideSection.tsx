import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { apiGetAssetsList } from '@/services/AssetsService'
import { apiGetMembersList } from '@/services/MembersService'
import type { AssetsListResponse } from '@/services/AssetsService'
import type { MembersListResponse } from '@/services/MembersService'
import type { Control, FieldErrors } from 'react-hook-form'
import type { PmPlanFormSchema } from './types'

type Props = {
    control: Control<PmPlanFormSchema>
    errors: FieldErrors<PmPlanFormSchema>
}

type AssetOption = { value: number; label: string; code: string }
type MemberOption = { value: number; label: string }

const intervalUnitOptions = [
    { value: 'days', label: 'Days' },
    { value: 'weeks', label: 'Weeks' },
    { value: 'months', label: 'Months' },
]

const PmPlanSideSection = ({ control, errors }: Props) => {
    const { data: assetsData } = useSWR(
        '/assets-all',
        () => apiGetAssetsList<AssetsListResponse>({ per_page: 100 }),
        { revalidateOnFocus: false },
    )

    const { data: membersData } = useSWR(
        '/members-all',
        () => apiGetMembersList<MembersListResponse>({ per_page: 100 }),
        { revalidateOnFocus: false },
    )

    const assetOptions: AssetOption[] =
        assetsData?.data?.assets?.map((a) => ({
            value: a.id,
            label: a.name,
            code: a.code,
        })) || []

    const memberOptions: MemberOption[] =
        membersData?.data?.members
            ?.filter((m) => m.roles.some((r) => r.code === 'technician'))
            .map((m) => ({
                value: m.id,
                label: m.user?.name ?? m.employee_code,
            })) || []

    return (
        <>
            <Card>
                <h4 className="mb-2">Trigger Schedule</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                    How often should a work order be automatically generated?
                </p>

                <FormItem
                    label="Repeat every"
                    asterisk
                    invalid={
                        Boolean(errors.trigger_interval_value) ||
                        Boolean(errors.trigger_interval_unit)
                    }
                    errorMessage={
                        errors.trigger_interval_value?.message ||
                        errors.trigger_interval_unit?.message
                    }
                >
                    <div className="flex gap-2">
                        <Controller
                            name="trigger_interval_value"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="number"
                                    min={1}
                                    className="w-24"
                                    placeholder="3"
                                    invalid={Boolean(errors.trigger_interval_value)}
                                    {...field}
                                />
                            )}
                        />
                        <Controller
                            name="trigger_interval_unit"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    className="flex-1"
                                    options={intervalUnitOptions}
                                    value={
                                        intervalUnitOptions.find(
                                            (o) => o.value === field.value,
                                        ) || null
                                    }
                                    onChange={(opt) => field.onChange(opt?.value)}
                                />
                            )}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Example: <span className="font-medium">3 months</span> = a work order is created every 3 months
                    </p>
                </FormItem>

                <FormItem
                    label="First run date"
                    extra={<span className="text-xs text-gray-400">Optional — leave blank to start immediately</span>}
                >
                    <Controller
                        name="trigger_next_run_at"
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                placeholder="Pick a date"
                                value={
                                    field.value
                                        ? dayjs(field.value).toDate()
                                        : null
                                }
                                onChange={(date) =>
                                    field.onChange(
                                        date
                                            ? dayjs(date).format('YYYY-MM-DD')
                                            : '',
                                    )
                                }
                            />
                        )}
                    />
                </FormItem>
            </Card>

            <Card>
                <h4 className="mb-6">Assignment</h4>

                <FormItem label="Asset">
                    <Controller
                        name="asset_id"
                        control={control}
                        render={({ field }) => (
                            <Select<AssetOption>
                                placeholder="Select asset"
                                options={assetOptions}
                                value={
                                    assetOptions.find(
                                        (o) => o.value === field.value,
                                    ) || null
                                }
                                onChange={(option) =>
                                    field.onChange(option?.value ?? null)
                                }
                                formatOptionLabel={(opt) => (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            {opt.label}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">
                                            {opt.code}
                                        </span>
                                    </div>
                                )}
                            />
                        )}
                    />
                </FormItem>

                <FormItem
                    label="Assign To"
                    extra={
                        <span className="text-xs text-gray-400">
                            Technicians only
                        </span>
                    }
                >
                    <Controller
                        name="assigned_member_id"
                        control={control}
                        render={({ field }) => (
                            <Select<MemberOption>
                                placeholder="Select technician"
                                options={memberOptions}
                                noOptionsMessage={() => 'No technicians found'}
                                value={
                                    memberOptions.find(
                                        (o) => o.value === field.value,
                                    ) || null
                                }
                                onChange={(option) =>
                                    field.onChange(option?.value ?? null)
                                }
                                isClearable
                            />
                        )}
                    />
                </FormItem>
            </Card>
        </>
    )
}

export default PmPlanSideSection
