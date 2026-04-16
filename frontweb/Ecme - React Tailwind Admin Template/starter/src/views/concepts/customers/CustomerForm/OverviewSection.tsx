import { useMemo } from 'react'
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

type OverviewSectionProps = FormSectionBaseProps & {
    showPasswordFields?: boolean
    showEmployeeCode?: boolean
    showLocale?: boolean
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
    showPasswordFields = false,
    showEmployeeCode = false,
    showLocale = false,
}: OverviewSectionProps) => {
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
            <h4 className="mb-6">Overview</h4>
            <div className="grid md:grid-cols-2 gap-4">
                <FormItem
                    label="First Name"
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
                                placeholder="First Name"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="Last Name"
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
                                placeholder="Last Name"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
            </div>
            <FormItem
                label="Email"
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
                            placeholder="Email"
                            {...field}
                        />
                    )}
                />
            </FormItem>
            {showLocale && (
                <FormItem
                    label="Location"
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
                                placeholder="Select location"
                                value={
                                    countryList.find(
                                        (option) => option.value === field.value,
                                    ) || null
                                }
                                onChange={(option) =>
                                    field.onChange(option?.value)
                                }
                            />
                        )}
                    />
                </FormItem>
            )}

            <div className="flex items-end gap-4 w-full">
                <FormItem
                    invalid={
                        Boolean(errors.phoneNumber) || Boolean(errors.dialCode)
                    }
                >
                    <label className="form-label mb-2">Phone number</label>
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
                                placeholder="Phone Number"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                            />
                        )}
                    />
                </FormItem>
            </div>

            {showEmployeeCode && (
                <FormItem
                    label="Employee Code"
                    invalid={Boolean(errors.employeeCode)}
                    errorMessage={errors.employeeCode?.message}
                >
                    <Controller
                        name="employeeCode"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                autoComplete="off"
                                placeholder="e.g. EMP-001"
                                {...field}
                                value={field.value || ''}
                            />
                        )}
                    />
                </FormItem>
            )}

            {showPasswordFields && (
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <FormItem
                        label="Password"
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
                                    placeholder="Password"
                                    {...field}
                                    value={field.value || ''}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="Confirm Password"
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
                                    placeholder="Confirm Password"
                                    {...field}
                                    value={field.value || ''}
                                />
                            )}
                        />
                    </FormItem>
                </div>
            )}
        </Card>
    )
}

export default OverviewSection
