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
    name: string
    email: string
    password: string
    passwordConfirmation: string
}

const validationSchema: ZodType<SignUpFormSchema> = z
    .object({
        name: z
            .string({ required_error: 'Please enter your name' })
            .min(1, { message: 'Please enter your name' }),
        email: z
            .string({ required_error: 'Please enter your email' })
            .email('Please enter a valid email'),
        password: z
            .string({ required_error: 'Please enter password' })
            .min(8, { message: 'Password must be at least 8 characters' }),
        passwordConfirmation: z
            .string({ required_error: 'Please confirm password' })
            .min(1, { message: 'Please confirm password' }),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
        message: 'Password confirmation does not match',
        path: ['passwordConfirmation'],
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
            name: '',
            email: '',
            password: '',
            passwordConfirmation: '',
        },
        resolver: zodResolver(validationSchema),
    })

    const onSignUp = async (values: SignUpFormSchema) => {
        if (!disableSubmit) {
            setSubmitting(true)
            const result = await signUp({
                name: values.name,
                email: values.email,
                password: values.password,
                passwordConfirmation: values.passwordConfirmation,
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
                    label="Name"
                    invalid={Boolean(errors.name)}
                    errorMessage={errors.name?.message}
                >
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                placeholder="Your name"
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
                                placeholder="you@example.com"
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                </FormItem>

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
                                autoComplete="off"
                                placeholder="Password"
                                {...field}
                            />
                        )}
                    />
                </FormItem>

                <FormItem
                    label="Confirm password"
                    invalid={Boolean(errors.passwordConfirmation)}
                    errorMessage={errors.passwordConfirmation?.message}
                >
                    <Controller
                        name="passwordConfirmation"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="password"
                                autoComplete="off"
                                placeholder="Confirm password"
                                {...field}
                            />
                        )}
                    />
                </FormItem>

                <Button block loading={isSubmitting} variant="solid" type="submit">
                    {isSubmitting ? 'Creating account...' : 'Create account'}
                </Button>
            </Form>
        </div>
    )
}

export default SignUpForm