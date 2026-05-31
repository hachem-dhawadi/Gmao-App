import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import { TbRefresh } from 'react-icons/tb'
import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form'
import type { WorkOrderFormSchema } from './types'

type Props = {
    control: Control<WorkOrderFormSchema>
    errors: FieldErrors<WorkOrderFormSchema>
    setValue: UseFormSetValue<WorkOrderFormSchema>
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

const DotLabel = ({ label, dotClass }: { label: string; dotClass: string }) => (
    <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
        <span>{label}</span>
    </div>
)

function generateWorkOrderCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
    let suffix = ''
    for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
    return `WO-${suffix}`
}

const WorkOrderMainSection = ({ control, errors, setValue }: Props) => {
    const { t } = useTranslation()

    const statusOptions: StatusOption[] = useMemo(() => [
        { value: 'open', label: t('wo.status.open'), dotClass: 'bg-blue-500' },
        { value: 'in_progress', label: t('wo.status.in_progress'), dotClass: 'bg-amber-500' },
        { value: 'on_hold', label: t('wo.status.on_hold'), dotClass: 'bg-gray-400' },
        { value: 'completed', label: t('wo.status.completed'), dotClass: 'bg-emerald-500' },
        { value: 'cancelled', label: t('wo.status.cancelled'), dotClass: 'bg-red-500' },
    ], [t])

    const priorityOptions: PriorityOption[] = useMemo(() => [
        { value: 'low', label: t('wo.priority.low'), dotClass: 'bg-gray-400' },
        { value: 'medium', label: t('wo.priority.medium'), dotClass: 'bg-blue-500' },
        { value: 'high', label: t('wo.priority.high'), dotClass: 'bg-amber-500' },
        { value: 'critical', label: t('wo.priority.critical'), dotClass: 'bg-red-500' },
    ], [t])

    return (
        <Card>
            <h4 className="mb-6">{t('woForm.overviewTitle')}</h4>

            <FormItem
                label={t('woForm.field.title')}
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
                            placeholder={t('woForm.placeholder.title')}
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label={t('woForm.field.code')}
                extra={
                    <span className="text-xs text-gray-400">
                        {t('woForm.codeHint')}
                    </span>
                }
            >
                <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                autoComplete="off"
                                placeholder={t('woForm.placeholder.code')}
                                {...field}
                                onChange={(e) =>
                                    field.onChange(e.target.value.toUpperCase())
                                }
                            />
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                icon={<TbRefresh />}
                                onClick={() =>
                                    setValue('code', generateWorkOrderCode())
                                }
                            />
                        </div>
                    )}
                />
            </FormItem>

            <div className="grid grid-cols-2 gap-4">
                <FormItem
                    label={t('common.status')}
                    asterisk
                    invalid={Boolean(errors.status)}
                    errorMessage={errors.status?.message}
                >
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <Select<StatusOption>
                                placeholder={t('woForm.selectStatus')}
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
                    label={t('common.priority')}
                    asterisk
                    invalid={Boolean(errors.priority)}
                    errorMessage={errors.priority?.message}
                >
                    <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                            <Select<PriorityOption>
                                placeholder={t('woForm.selectPriority')}
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

            <FormItem label={t('woForm.field.description')}>
                <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <Input
                            textArea
                            rows={5}
                            placeholder={t('woForm.placeholder.description')}
                            {...field}
                        />
                    )}
                />
            </FormItem>
        </Card>
    )
}

export default WorkOrderMainSection
