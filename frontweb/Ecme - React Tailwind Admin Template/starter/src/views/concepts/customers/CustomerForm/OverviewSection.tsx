import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type React from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select, { Option as DefaultOption } from '@/components/ui/Select'
import Avatar from '@/components/ui/Avatar'
import { FormItem } from '@/components/ui/Form'
import NumericInput from '@/components/shared/NumericInput'
import { countryList } from '@/constants/countries.constant'
import { Controller } from 'react-hook-form'
import { components } from 'react-select'
import type { FormSectionBaseProps } from './types'
import type { ControlProps, OptionProps } from 'react-select'

type CompanyOption = { value: number; label: string }
type SiteOption = { value: number; label: string }

type OverviewSectionProps = FormSectionBaseProps & {
    showOnCreate?: boolean
    companyOptions?: CompanyOption[]
    selectedCompanyId?: number | null
    onCompanyChange?: (id: number | null) => void
    siteOptions?: SiteOption[]
}

type CountryOption = {
    label: string
    dialCode: string
    value: string
}

const ControlBase = components.Control as React.ComponentType<ControlProps<CountryOption>>

const CustomSelectOption = (props: OptionProps<CountryOption>) => {
    return (
        <DefaultOption<CountryOption>
            {...props}
            customLabel={(data) => (
                <span className="flex items-center gap-2">
                    <Avatar
                        shape="circle"
                        size={20}
                        src={`/img/countries/${data.value}.png`}
                    />
                    <span>{data.dialCode}</span>
                </span>
            )}
        />
    )
}

const CustomControl = ({ children, ...props }: ControlProps<CountryOption>) => {
    const selected = props.getValue()[0]
    return (
        <ControlBase {...props}>
            {selected && (
                <Avatar
                    className="ltr:ml-4 rtl:mr-4"
                    shape="circle"
                    size={20}
                    src={`/img/countries/${selected.value}.png`}
                />
            )}
            {children}
        </ControlBase>
    )
}

const LocaleSelectOption = (props: OptionProps<CountryOption>) => {
    return (
        <DefaultOption<CountryOption>
            {...props}
            customLabel={(data, label) => (
                <span className="flex items-center gap-2">
                    <Avatar
                        shape="circle"
                        size={20}
                        src={`/img/countries/${data.value}.png`}
                    />
                    <span>{label}</span>
                </span>
            )}
        />
    )
}

const OverviewSection = ({
    control,
    errors,
    showOnCreate = false,
    companyOptions = [],
    selectedCompanyId = null,
    onCompanyChange,
    siteOptions = [],
}: OverviewSectionProps) => {
    const { t } = useTranslation()

    const dialCodeList = useMemo(() => {
        const newCountryList: Array<CountryOption> = JSON.parse(
            JSON.stringify(countryList),
        )
        return newCountryList.map((country) => {
            country.label = country.dialCode
            return country
        })
    }, [])

    return (
        <Card>
            <h4 className="mb-6">{t('memberForm.overviewTitle')}</h4>
            <div className="grid md:grid-cols-2 gap-4">
                <FormItem
                    label={t('memberForm.field.firstName')}
                    invalid={Boolean(errors.firstName)}
                    errorMessage={errors.firstName?.message}
                >
                    <Controller
                        name="firstName"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                autoComplete="off"
                                placeholder={t('memberForm.placeholder.firstName')}
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label={t('memberForm.field.lastName')}
                    invalid={Boolean(errors.lastName)}
                    errorMessage={errors.lastName?.message}
                >
                    <Controller
                        name="lastName"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                autoComplete="off"
                                placeholder={t('memberForm.placeholder.lastName')}
                                {...field}
                            />
                        )}
                    />
                </FormItem>
            </div>

            <FormItem
                label={t('common.email')}
                invalid={Boolean(errors.email)}
                errorMessage={errors.email?.message}
            >
                <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="email"
                            autoComplete="off"
                            placeholder={t('memberForm.placeholder.email')}
                            {...field}
                        />
                    )}
                />
            </FormItem>

            <FormItem
                label={t('common.location')}
                invalid={Boolean(errors.locale)}
                errorMessage={errors.locale?.message}
            >
                <Controller
                    name="locale"
                    control={control}
                    render={({ field }) => (
                        <Select<CountryOption>
                            options={countryList}
                            components={{
                                Option: LocaleSelectOption,
                                Control: ControlBase,
                            }}
                            placeholder={t('memberForm.placeholder.location')}
                            value={
                                countryList.find(
                                    (option) => option.value === field.value,
                                ) || null
                            }
                            onChange={(option) => field.onChange(option?.value)}
                        />
                    )}
                />
            </FormItem>

            <div className="flex items-end gap-4 w-full">
                <FormItem
                    invalid={
                        Boolean(errors.phoneNumber) || Boolean(errors.dialCode)
                    }
                >
                    <label className="form-label mb-2">{t('memberForm.field.phoneNumber')}</label>
                    <Controller
                        name="dialCode"
                        control={control}
                        render={({ field }) => (
                            <Select<CountryOption>
                                options={dialCodeList}
                                {...field}
                                className="w-[150px]"
                                components={{
                                    Option: CustomSelectOption,
                                    Control: CustomControl,
                                }}
                                placeholder=""
                                value={dialCodeList.filter(
                                    (option) => option.dialCode === field.value,
                                )}
                                onChange={(option) =>
                                    field.onChange(option?.dialCode)
                                }
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    className="w-full"
                    invalid={
                        Boolean(errors.phoneNumber) || Boolean(errors.dialCode)
                    }
                    errorMessage={errors.phoneNumber?.message}
                >
                    <Controller
                        name="phoneNumber"
                        control={control}
                        render={({ field }) => (
                            <NumericInput
                                autoComplete="off"
                                placeholder={t('memberForm.placeholder.phoneNumber')}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                            />
                        )}
                    />
                </FormItem>
            </div>

            {siteOptions.length > 0 && (
                <FormItem label="Site">
                    <Controller
                        name="site_id"
                        control={control}
                        render={({ field }) => (
                            <Select<SiteOption>
                                placeholder="Assign to site (optional)"
                                options={siteOptions}
                                isClearable
                                value={siteOptions.find((o) => o.value === field.value) ?? null}
                                onChange={(opt) => field.onChange(opt?.value ?? null)}
                            />
                        )}
                    />
                </FormItem>
            )}

            {showOnCreate && (
                <>
                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                        <FormItem
                            label={t('memberForm.field.password')}
                            invalid={Boolean(errors.password)}
                            errorMessage={errors.password?.message}
                        >
                            <Controller
                                name="password"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder={t('memberForm.placeholder.password')}
                                        {...field}
                                        value={field.value || ''}
                                    />
                                )}
                            />
                        </FormItem>
                        <FormItem
                            label={t('memberForm.field.confirmPassword')}
                            invalid={Boolean(errors.passwordConfirmation)}
                            errorMessage={errors.passwordConfirmation?.message}
                        >
                            <Controller
                                name="passwordConfirmation"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder={t('memberForm.placeholder.confirmPassword')}
                                        {...field}
                                        value={field.value || ''}
                                    />
                                )}
                            />
                        </FormItem>
                    </div>

                    {companyOptions.length > 0 && (
                        <FormItem label={t('memberForm.field.assignCompany')} className="mt-2">
                            <Select<CompanyOption>
                                placeholder={t('memberForm.placeholder.company')}
                                options={companyOptions}
                                value={
                                    companyOptions.find(
                                        (o) => o.value === selectedCompanyId,
                                    ) || null
                                }
                                onChange={(option) =>
                                    onCompanyChange?.(option?.value ?? null)
                                }
                            />
                        </FormItem>
                    )}
                </>
            )}
        </Card>
    )
}

export default OverviewSection
