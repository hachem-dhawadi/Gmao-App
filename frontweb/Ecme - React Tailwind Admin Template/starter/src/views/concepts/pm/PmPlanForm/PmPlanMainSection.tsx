import { useState, useRef, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import { TbClock } from 'react-icons/tb'
import type { Control, FieldErrors } from 'react-hook-form'
import type { PmPlanFormSchema } from './types'

const EstimatedTimePicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const totalMinutes = parseInt(value || '0') || 0
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const display = value && totalMinutes > 0 ? `${hours}h ${minutes.toString().padStart(2, '0')}m` : ''

    const update = (h: number, m: number) => {
        const total = Math.max(0, h) * 60 + Math.min(59, Math.max(0, m))
        onChange(total > 0 ? String(total) : '')
    }

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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
                                onChange={(e) => update(parseInt(e.target.value) || 0, minutes)}
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

        <FormItem label="Estimated Time">
            <Controller
                name="estimated_minutes"
                control={control}
                render={({ field }) => (
                    <EstimatedTimePicker value={field.value} onChange={field.onChange} />
                )}
            />
        </FormItem>
    </Card>
)

export default PmPlanMainSection
