import { useTranslation } from 'react-i18next'
import Card from '@/components/ui/Card'
import Switcher from '@/components/ui/Switcher'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import type { FormSectionBaseProps } from './types'

type AccountSectionProps = FormSectionBaseProps

const AccountSection = ({ control }: AccountSectionProps) => {
    const { t } = useTranslation()

    return (
        <Card>
            <h4>{t('memberForm.accountTitle')}</h4>
            <div className="mt-6">
                <FormItem className="mb-0">
                    <Controller
                        name="banAccount"
                        control={control}
                        render={({ field }) => (
                            <div className="flex items-center justify-between gap-8">
                                <div>
                                    <h6>{t('memberForm.field.active')}</h6>
                                    <p>{t('memberForm.field.activeDesc')}</p>
                                </div>
                                <Switcher
                                    checked={!field.value}
                                    onChange={(checked) => {
                                        field.onChange(!checked)
                                    }}
                                />
                            </div>
                        )}
                    />
                </FormItem>
            </div>
        </Card>
    )
}

export default AccountSection
