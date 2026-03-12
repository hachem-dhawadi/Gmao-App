import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { FormItem, Form } from '@/components/ui/Form'
import { apiCreateCompany } from '@/services/AuthService'
import { CURRENT_COMPANY_ID_KEY } from '@/constants/app.constant'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ZodType } from 'zod'

type CompanySetupFormSchema = {
    name: string
    legalName: string
    phone: string
    email: string
    addressLine1: string
    addressLine2: string
    city: string
    postalCode: string
    country: string
    timezone: string
}

const validationSchema: ZodType<CompanySetupFormSchema> = z.object({
    name: z
        .string({ required_error: 'Please enter company name' })
        .min(1, { message: 'Please enter company name' }),
    legalName: z
        .string({ required_error: 'Please enter legal name' })
        .min(1, { message: 'Please enter legal name' }),
    phone: z
        .string({ required_error: 'Please enter company phone' })
        .min(8, { message: 'Phone must have at least 8 characters' })
        .max(30, { message: 'Phone is too long' }),
    email: z
        .string()
        .trim()
        .optional()
        .or(z.literal(''))
        .refine((value) => value === '' || z.string().email().safeParse(value).success, {
            message: 'Please enter a valid email',
        }),
    addressLine1: z.string().optional().or(z.literal('')),
    addressLine2: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    postalCode: z.string().optional().or(z.literal('')),
    country: z.string().optional().or(z.literal('')),
    timezone: z.string().optional().or(z.literal('')),
})

const normalize = (value: string): string | undefined => {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

const CompanySetup = () => {
    const navigate = useNavigate()

    const [isSubmitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState('')

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm<CompanySetupFormSchema>({
        defaultValues: {
            name: '',
            legalName: '',
            phone: '',
            email: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            postalCode: '',
            country: '',
            timezone: 'Africa/Tunis',
        },
        resolver: zodResolver(validationSchema),
    })

    const onSubmit = async (values: CompanySetupFormSchema) => {
        setSubmitting(true)
        setMessage('')

        try {
            const resp = await apiCreateCompany({
                name: values.name.trim(),
                legalName: values.legalName.trim(),
                phone: values.phone.trim(),
                email: normalize(values.email),
                addressLine1: normalize(values.addressLine1),
                addressLine2: normalize(values.addressLine2),
                city: normalize(values.city),
                postalCode: normalize(values.postalCode),
                country: normalize(values.country),
                timezone: normalize(values.timezone),
            })

            if (!resp.success || !resp.data?.company?.id) {
                setMessage(resp.message || 'Unable to create company.')
                return
            }

            localStorage.setItem(
                CURRENT_COMPANY_ID_KEY,
                String(resp.data.company.id),
            )

            navigate('/company-pending')
        } catch (error: unknown) {
            const responseMessage =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Unable to create company.'

            setMessage(responseMessage)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            <div>
                <h3>Create company</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Add your company details. Your company will remain pending
                    until superadmin approval.
                </p>
            </div>

            {message && (
                <Alert showIcon type="danger">
                    {message}
                </Alert>
            )}

            <Form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormItem
                        label="Company name"
                        invalid={Boolean(errors.name)}
                        errorMessage={errors.name?.message}
                    >
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    placeholder="Company name"
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label="Legal name"
                        invalid={Boolean(errors.legalName)}
                        errorMessage={errors.legalName?.message}
                    >
                        <Controller
                            name="legalName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    placeholder="Legal name"
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label="Phone"
                        invalid={Boolean(errors.phone)}
                        errorMessage={errors.phone?.message}
                    >
                        <Controller
                            name="phone"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    placeholder="Company phone"
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>

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
                                    placeholder="company@example.com"
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label="Address line 1"
                        invalid={Boolean(errors.addressLine1)}
                        errorMessage={errors.addressLine1?.message}
                    >
                        <Controller
                            name="addressLine1"
                            control={control}
                            render={({ field }) => (
                                <Input type="text" placeholder="Address line 1" autoComplete="off" {...field} />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label="Address line 2"
                        invalid={Boolean(errors.addressLine2)}
                        errorMessage={errors.addressLine2?.message}
                    >
                        <Controller
                            name="addressLine2"
                            control={control}
                            render={({ field }) => (
                                <Input type="text" placeholder="Address line 2" autoComplete="off" {...field} />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label="City"
                        invalid={Boolean(errors.city)}
                        errorMessage={errors.city?.message}
                    >
                        <Controller
                            name="city"
                            control={control}
                            render={({ field }) => (
                                <Input type="text" placeholder="City" autoComplete="off" {...field} />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label="Postal code"
                        invalid={Boolean(errors.postalCode)}
                        errorMessage={errors.postalCode?.message}
                    >
                        <Controller
                            name="postalCode"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    placeholder="Postal code"
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label="Country"
                        invalid={Boolean(errors.country)}
                        errorMessage={errors.country?.message}
                    >
                        <Controller
                            name="country"
                            control={control}
                            render={({ field }) => (
                                <Input type="text" placeholder="Country" autoComplete="off" {...field} />
                            )}
                        />
                    </FormItem>

                    <FormItem
                        label="Timezone"
                        invalid={Boolean(errors.timezone)}
                        errorMessage={errors.timezone?.message}
                    >
                        <Controller
                            name="timezone"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    placeholder="Africa/Tunis"
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>

                <Button block loading={isSubmitting} variant="solid" type="submit">
                    {isSubmitting ? 'Saving company...' : 'Create company'}
                </Button>
            </Form>
        </div>
    )
}

export default CompanySetup