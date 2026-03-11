import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import { useAuth } from '@/auth'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ZodType } from 'zod'
import type { CommonProps } from '@/@types/common'

interface SignUpFormProps extends CommonProps {
    disableSubmit?: boolean
    setMessage?: (message: string) => void
}

type SignUpFormSchema = {
    ownerName: string
    ownerEmail: string
    ownerPhone: string
    ownerPassword: string
    ownerPasswordConfirmation: string
    companyName: string
    companyTimezone: string
    proofFiles: FileList | null
}

const validationSchema: ZodType<Omit<SignUpFormSchema, 'proofFiles'>> = z
    .object({
        ownerName: z
            .string({ required_error: 'Please enter owner name' })
            .min(1, { message: 'Please enter owner name' }),
        ownerEmail: z
            .string({ required_error: 'Please enter owner email' })
            .email('Please enter a valid email'),
        ownerPhone: z
            .string({ required_error: 'Please enter owner phone' })
            .min(1, { message: 'Please enter owner phone' }),
        ownerPassword: z
            .string({ required_error: 'Please enter password' })
            .min(8, { message: 'Password must be at least 8 characters' }),
        ownerPasswordConfirmation: z
            .string({ required_error: 'Please confirm password' })
            .min(1, { message: 'Please confirm password' }),
        companyName: z
            .string({ required_error: 'Please enter company name' })
            .min(1, { message: 'Please enter company name' }),
        companyTimezone: z
            .string({ required_error: 'Please enter company timezone' })
            .min(1, { message: 'Please enter company timezone' }),
    })
    .refine((data) => data.ownerPassword === data.ownerPasswordConfirmation, {
        message: 'Password confirmation does not match',
        path: ['ownerPasswordConfirmation'],
    })

const SignUpForm = (props: SignUpFormProps) => {
    const { disableSubmit = false, className, setMessage } = props

    const [isSubmitting, setSubmitting] = useState<boolean>(false)

    const { signUp } = useAuth()

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm<SignUpFormSchema>({
        defaultValues: {
            ownerName: '',
            ownerEmail: '',
            ownerPhone: '',
            ownerPassword: '',
            ownerPasswordConfirmation: '',
            companyName: '',
            companyTimezone: 'Africa/Tunis',
            proofFiles: null,
        },
        resolver: zodResolver(validationSchema),
    })

    const onSignUp = async (values: SignUpFormSchema) => {
        if (!values.proofFiles || values.proofFiles.length === 0) {
            setMessage?.('Please upload at least one company proof file (pdf/jpg/png).')
            return
        }

        if (!disableSubmit) {
            setSubmitting(true)
            const result = await signUp({
                ownerName: values.ownerName,
                ownerEmail: values.ownerEmail,
                ownerPhone: values.ownerPhone,
                ownerPassword: values.ownerPassword,
                ownerPasswordConfirmation: values.ownerPasswordConfirmation,
                companyName: values.companyName,
                companyTimezone: values.companyTimezone,
                proofFiles: Array.from(values.proofFiles),
            })

            if (result?.status === 'failed') {
                setMessage?.(result.message)
            }

            setSubmitting(false)
        }
    }

    return (
        <div className={className}>
            <Form onSubmit={handleSubmit(onSignUp)}>
                <FormItem
                    label="Owner name"
                    invalid={Boolean(errors.ownerName)}
                    errorMessage={errors.ownerName?.message}
                >
                    <Controller
                        name="ownerName"
                        control={control}
                        render={({ field }) => (
                            <Input type="text" placeholder="Owner name" autoComplete="off" {...field} />
                        )}
                    />
                </FormItem>

                <FormItem
                    label="Owner email"
                    invalid={Boolean(errors.ownerEmail)}
                    errorMessage={errors.ownerEmail?.message}
                >
                    <Controller
                        name="ownerEmail"
                        control={control}
                        render={({ field }) => (
                            <Input type="email" placeholder="owner@example.com" autoComplete="off" {...field} />
                        )}
                    />
                </FormItem>

                <FormItem
                    label="Owner phone"
                    invalid={Boolean(errors.ownerPhone)}
                    errorMessage={errors.ownerPhone?.message}
                >
                    <Controller
                        name="ownerPhone"
                        control={control}
                        render={({ field }) => (
                            <Input type="text" placeholder="216..." autoComplete="off" {...field} />
                        )}
                    />
                </FormItem>

                <FormItem
                    label="Owner password"
                    invalid={Boolean(errors.ownerPassword)}
                    errorMessage={errors.ownerPassword?.message}
                >
                    <Controller
                        name="ownerPassword"
                        control={control}
                        render={({ field }) => (
                            <Input type="password" autoComplete="off" placeholder="Password" {...field} />
                        )}
                    />
                </FormItem>

                <FormItem
                    label="Confirm password"
                    invalid={Boolean(errors.ownerPasswordConfirmation)}
                    errorMessage={errors.ownerPasswordConfirmation?.message}
                >
                    <Controller
                        name="ownerPasswordConfirmation"
                        control={control}
                        render={({ field }) => (
                            <Input type="password" autoComplete="off" placeholder="Confirm password" {...field} />
                        )}
                    />
                </FormItem>

                <FormItem
                    label="Company name"
                    invalid={Boolean(errors.companyName)}
                    errorMessage={errors.companyName?.message}
                >
                    <Controller
                        name="companyName"
                        control={control}
                        render={({ field }) => (
                            <Input type="text" placeholder="Company name" autoComplete="off" {...field} />
                        )}
                    />
                </FormItem>

                <FormItem
                    label="Company timezone"
                    invalid={Boolean(errors.companyTimezone)}
                    errorMessage={errors.companyTimezone?.message}
                >
                    <Controller
                        name="companyTimezone"
                        control={control}
                        render={({ field }) => (
                            <Input type="text" placeholder="Africa/Tunis" autoComplete="off" {...field} />
                        )}
                    />
                </FormItem>

                <FormItem label="Proof files (pdf/jpg/png)">
                    <Controller
                        name="proofFiles"
                        control={control}
                        render={({ field: { onChange, name, ref } }) => (
                            <input
                                name={name}
                                ref={ref}
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(event) => onChange(event.target.files)}
                                className="block w-full text-sm text-gray-600 dark:text-gray-300"
                            />
                        )}
                    />
                </FormItem>

                <Button block loading={isSubmitting} variant="solid" type="submit">
                    {isSubmitting ? 'Submitting...' : 'Register company'}
                </Button>
            </Form>
        </div>
    )
}

export default SignUpForm
