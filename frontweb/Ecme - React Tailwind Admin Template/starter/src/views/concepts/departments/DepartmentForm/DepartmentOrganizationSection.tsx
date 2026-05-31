import { useTranslation } from 'react-i18next'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import useSWR from 'swr'
import { apiGetDepartmentsList } from '@/services/DepartmentsService'
import type { Control, FieldErrors } from 'react-hook-form'
import type { DepartmentFormSchema } from './types'
import type { DepartmentsListResponse } from '@/services/DepartmentsService'

type Props = {
    control: Control<DepartmentFormSchema>
    errors: FieldErrors<DepartmentFormSchema>
    currentDepartmentId?: number
}

type ParentOption = { value: number; label: string }

const DepartmentOrganizationSection = ({
    control,
    errors,
    currentDepartmentId,
}: Props) => {
    const { t } = useTranslation()

    const { data } = useSWR(
        '/departments/all',
        () => apiGetDepartmentsList<DepartmentsListResponse>({ per_page: 200 }),
        { revalidateOnFocus: false },
    )

    const parentOptions: ParentOption[] = (data?.data?.departments || [])
        .filter((d) => d.id !== currentDepartmentId)
        .map((d) => ({ value: d.id, label: `${d.name} (${d.code})` }))

    return (
        <Card>
            <h4 className="mb-6">{t('deptForm.orgTitle')}</h4>

            <FormItem
                label={t('deptForm.field.parentDept')}
                invalid={Boolean(errors.parent_department_id)}
                errorMessage={errors.parent_department_id?.message}
                extra={
                    <span className="text-xs text-gray-400">
                        {t('deptForm.parentHint')}
                    </span>
                }
            >
                <Controller
                    name="parent_department_id"
                    control={control}
                    render={({ field }) => (
                        <Select<ParentOption>
                            isClearable
                            placeholder={t('deptForm.placeholder.parentDept')}
                            options={parentOptions}
                            value={
                                parentOptions.find(
                                    (o) => o.value === field.value,
                                ) || null
                            }
                            onChange={(option) =>
                                field.onChange(option?.value ?? null)
                            }
                        />
                    )}
                />
            </FormItem>

            <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('deptForm.howItWorks.title')}
                </p>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
                    <li>{t('deptForm.howItWorks.bullet1')}</li>
                    <li>{t('deptForm.howItWorks.bullet2')}</li>
                    <li>{t('deptForm.howItWorks.bullet3')}</li>
                </ul>
            </div>
        </Card>
    )
}

export default DepartmentOrganizationSection
