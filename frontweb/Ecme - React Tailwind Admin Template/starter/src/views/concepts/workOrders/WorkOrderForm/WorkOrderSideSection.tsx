import { useState, useRef, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { TbClock } from 'react-icons/tb'
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

// ── Time Picker ───────────────────────────────────────────────────────────────

type TimePickerProps = {
    value: string       // total minutes as string e.g. "150"
    onChange: (minutes: string) => void
}

const EstimatedTimePicker = ({ value, onChange }: TimePickerProps) => {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const totalMinutes = parseInt(value || '0') || 0
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    const display = value && totalMinutes > 0
        ? `${hours}h ${minutes.toString().padStart(2, '0')}m`
        : ''

    const update = (h: number, m: number) => {
        const total = Math.max(0, h) * 60 + Math.min(59, Math.max(0, m))
        onChange(total > 0 ? String(total) : '')
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div className="relative" ref={ref}>
            <div
                className="input input-md flex items-center justify-between cursor-pointer select-none"
                onClick={() => setOpen((o) => !o)}
            >
                <span className={display ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                    {display || 'e.g. 2h 30m'}
                </span>
                <TbClock className="text-gray-400 text-lg flex-shrink-0" />
            </div>

            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4">
                    <p className="text-xs text-gray-500 mb-3 font-medium">Select estimated duration</p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">Hours</label>
                            <Input
                                type="number"
                                min={0}
                                max={999}
                                value={hours || ''}
                                placeholder="0"
                                onChange={(e) =>
                                    update(parseInt(e.target.value) || 0, minutes)
                                }
                            />
                        </div>
                        <span className="text-gray-400 text-lg mt-4">:</span>
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">Minutes</label>
                            <Input
                                type="number"
                                min={0}
                                max={59}
                                value={minutes || ''}
                                placeholder="00"
                                onChange={(e) => {
                                    const m = Math.min(59, Math.max(0, parseInt(e.target.value) || 0))
                                    update(hours, m)
                                }}
                            />
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="solid"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => setOpen(false)}
                    >
                        Done
                    </Button>
                </div>
            )}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

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
                            minDate={new Date()}
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

            <FormItem label="Estimated Time">
                <Controller
                    name="estimated_minutes"
                    control={control}
                    render={({ field }) => (
                        <EstimatedTimePicker
                            value={field.value}
                            onChange={field.onChange}
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
