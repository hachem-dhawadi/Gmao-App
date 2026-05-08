import { useEffect, useMemo } from 'react'
import { Form } from '@/components/ui/Form'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import OverviewSection from './OverviewSection'
import AddressSection from './AddressSection'
import UserRoleSection from './UserRoleSection'
import ProfileImageSection from './ProfileImageSection'
import AccountSection from './AccountSection'
import isEmpty from 'lodash/isEmpty'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { CommonProps } from '@/@types/common'
import type { CustomerFormSchema } from './types'

type CompanyOption = { value: number; label: string }

type CustomerFormProps = {
    onFormSubmit: (values: CustomerFormSchema) => void
    defaultValues?: CustomerFormSchema
    newCustomer?: boolean
    showAddressSection?: boolean
    companyOptions?: CompanyOption[]
    selectedCompanyId?: number | null
    onCompanyChange?: (id: number | null) => void
} & CommonProps

const baseSchema = z.object({
    firstName: z.string().min(1, { message: 'First name required' }),
    lastName: z.string().min(1, { message: 'Last name required' }),
    email: z
        .string()
        .min(1, { message: 'Email required' })
        .email({ message: 'Invalid email' }),
    dialCode: z.string().min(1, { message: 'Please select your country code' }),
    phoneNumber: z
        .string()
        .min(1, { message: 'Please input your mobile number' }),
    country: z.string().optional(),
    address: z.string().optional(),
    postcode: z.string().optional(),
    city: z.string().optional(),
    img: z.string(),
    imgFile: z.any().optional().nullable(),
    removeAvatar: z.boolean().optional(),
    employeeCode: z.string().optional(),
    locale: z.string().optional(),
    role: z.enum(['admin', 'hr', 'manager', 'technician', ''], {
        errorMap: () => ({ message: 'Please select a role' }),
    }),
    password: z.string().optional(),
    passwordConfirmation: z.string().optional(),
})

const buildValidationSchema = (newCustomer: boolean) => {
    if (!newCustomer) return baseSchema

    return baseSchema
        .extend({
            password: z
                .string()
                .min(1, { message: 'Password is required' })
                .min(8, { message: 'Password must be at least 8 characters' }),
            passwordConfirmation: z
                .string()
                .min(1, { message: 'Please confirm your password' }),
        })
        .refine((data) => data.password === data.passwordConfirmation, {
            message: 'Passwords do not match',
            path: ['passwordConfirmation'],
        })
}

const CustomerForm = (props: CustomerFormProps) => {
    const {
        onFormSubmit,
        defaultValues = {},
        newCustomer = false,
        showAddressSection = false,
        companyOptions = [],
        selectedCompanyId = null,
        onCompanyChange,
        children,
    } = props

    const validationSchema = useMemo(
        () => buildValidationSchema(newCustomer),
        [newCustomer],
    )

    const {
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
        control,
    } = useForm<CustomerFormSchema>({
        defaultValues: {
            ...{
                banAccount: false,
                accountVerified: true,
                password: '',
                passwordConfirmation: '',
                imgFile: null,
                removeAvatar: false,
                role: 'technician',
                country: 'TN',
                locale: 'TN',
                dialCode: '+216',
                city: 'Tunis',
            },
            ...defaultValues,
        },
        resolver: zodResolver(validationSchema),
    })

    useEffect(() => {
        if (!isEmpty(defaultValues)) {
            reset(defaultValues)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(defaultValues)])

    const onSubmit = (values: CustomerFormSchema) => {
        onFormSubmit?.(values)
    }

    return (
        <Form
            className="flex w-full h-full"
            containerClassName="flex flex-col w-full justify-between"
            onSubmit={handleSubmit(onSubmit)}
        >
            <Container>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="gap-4 flex flex-col flex-auto">
                        <OverviewSection
                            control={control}
                            errors={errors}
                            setValue={setValue}
                            showOnCreate={newCustomer}
                            companyOptions={companyOptions}
                            selectedCompanyId={selectedCompanyId}
                            onCompanyChange={onCompanyChange}
                        />
                        {showAddressSection && (
                            <AddressSection
                                control={control}
                                errors={errors}
                                setValue={setValue}
                            />
                        )}
                    </div>
                    <div className="md:w-[370px] gap-4 flex flex-col">
                        <ProfileImageSection
                            control={control}
                            errors={errors}
                            setValue={setValue}
                        />
                        <UserRoleSection
                            control={control}
                            errors={errors}
                            setValue={setValue}
                        />
                        {!newCustomer && (
                            <AccountSection
                                control={control}
                                errors={errors}
                                setValue={setValue}
                            />
                        )}
                    </div>
                </div>
            </Container>
            <BottomStickyBar>{children}</BottomStickyBar>
        </Form>
    )
}

export default CustomerForm
