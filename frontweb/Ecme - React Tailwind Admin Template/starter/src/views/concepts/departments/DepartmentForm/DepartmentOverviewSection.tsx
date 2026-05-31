import { useTranslation } from 'react-i18next'
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
    const { t } = useTranslation()

    return (
        <Card>
            <h4 className="mb-6">{t('deptForm.overviewTitle')}</h4>

            <FormItem
                label={t('deptForm.field.deptName')}
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
                            placeholder={t('deptForm.placeholder.deptName')}
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label={t('common.code')}
                invalid={Boolean(errors.code)}
                errorMessage={errors.code?.message}
                extra={
                    <span className="text-xs text-gray-400">
                        {t('deptForm.codeHint')}
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
                            placeholder={t('deptForm.placeholder.code')}
                            {...field}
                            onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                            }
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label={t('common.description')}
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
                            placeholder={t('deptForm.placeholder.description')}
                            {...field}
                        />
                    )}
                />
            </FormItem>
        </Card>
    )
}

export default DepartmentOverviewSection
