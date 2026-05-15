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
import type { WorkOrderFormSchema } from './types'

type Props = {
    control: Control<WorkOrderFormSchema>
    errors: FieldErrors<WorkOrderFormSchema>
    canAssign?: boolean
}

type AssetOption = { value: number; label: string; code: string }
type MemberOption = { value: number; label: string }

const WorkOrderSideSection = ({ control, errors, canAssign = false }: Props) => {
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
        membersData?.data?.members?.map((m) => ({
            value: m.id,
            label: m.user?.name ?? m.employee_code,
        })) || []

    return (
        <Card>
            <h4 className="mb-6">Details</h4>

            <FormItem
                label="Asset"
                asterisk
                invalid={Boolean(errors.asset_id)}
                errorMessage={errors.asset_id?.message}
            >
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

            <FormItem label="Due Date">
                <Controller
                    name="due_at"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            placeholder="Select due date"
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

            <FormItem label="Estimated Time (minutes)">
                <Controller
                    name="estimated_minutes"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="number"
                            min={0}
                            placeholder="e.g. 120"
                            {...field}
                        />
                    )}
                />
            </FormItem>

            {canAssign && (
                <FormItem label="Assign Members">
                    <Controller
                        name="assigned_member_ids"
                        control={control}
                        render={({ field }) => (
                            <Select<MemberOption, true>
                                isMulti
                                placeholder="Select members"
                                options={memberOptions}
                                value={memberOptions.filter((o) =>
                                    field.value?.includes(o.value),
                                )}
                                onChange={(selected) =>
                                    field.onChange(
                                        selected
                                            ? selected.map((o) => o.value)
                                            : [],
                                    )
                                }
                            />
                        )}
                    />
                </FormItem>
            )}
        </Card>
    )
}

export default WorkOrderSideSection
