import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Form, FormItem } from '@/components/ui/Form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { apiUpdatePassword } from '@/services/AuthService'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import type { ZodType } from 'zod'

type PasswordSchema = {
    currentPassword: string
    newPassword: string
    confirmNewPassword: string
}

const SettingsSecurity = () => {
    const { t } = useTranslation()
    const [confirmationOpen, setConfirmationOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const formRef = useRef<HTMLFormElement>(null)

    const validationSchema: ZodType<PasswordSchema> = z
        .object({
            currentPassword: z
                .string()
                .min(1, { message: t('settingsSecurity.validation.currentPassword') }),
            newPassword: z
                .string()
                .min(8, { message: t('settingsSecurity.validation.newPassword') }),
            confirmNewPassword: z
                .string()
                .min(1, { message: t('settingsSecurity.validation.confirmNewPassword') }),
        })
        .refine((data) => data.confirmNewPassword === data.newPassword, {
            message: t('settingsSecurity.validation.passwordMatch'),
            path: ['confirmNewPassword'],
        })

    const {
        getValues,
        reset,
        handleSubmit,
        formState: { errors },
        control,
    } = useForm<PasswordSchema>({
        resolver: zodResolver(validationSchema),
    })

    const handlePostSubmit = async () => {
        setIsSubmitting(true)

        try {
            const values = getValues()

            await apiUpdatePassword({
                currentPassword: values.currentPassword,
                password: values.newPassword,
                passwordConfirmation: values.confirmNewPassword,
            })

            setConfirmationOpen(false)
            reset({
                currentPassword: '',
                newPassword: '',
                confirmNewPassword: '',
            })

            toast.push(
                <Notification type="success">{t('settingsSecurity.toast.success')}</Notification>,
                { placement: 'top-center' },
            )
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || t('settingsSecurity.toast.failed')

            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const onSubmit = async () => {
        setConfirmationOpen(true)
    }

    return (
        <div>
            <div className="mb-8">
                <h4>{t('settingsSecurity.title')}</h4>
                <p>{t('settingsSecurity.description')}</p>
            </div>
            <Form
                ref={formRef}
                className="mb-8"
                onSubmit={handleSubmit(onSubmit)}
            >
                <FormItem
                    label={t('settingsSecurity.currentPassword')}
                    invalid={Boolean(errors.currentPassword)}
                    errorMessage={errors.currentPassword?.message}
                >
                    <Controller
                        name="currentPassword"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="password"
                                autoComplete="off"
                                placeholder="********"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label={t('settingsSecurity.newPassword')}
                    invalid={Boolean(errors.newPassword)}
                    errorMessage={errors.newPassword?.message}
                >
                    <Controller
                        name="newPassword"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="password"
                                autoComplete="off"
                                placeholder="********"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label={t('settingsSecurity.confirmNewPassword')}
                    invalid={Boolean(errors.confirmNewPassword)}
                    errorMessage={errors.confirmNewPassword?.message}
                >
                    <Controller
                        name="confirmNewPassword"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="password"
                                autoComplete="off"
                                placeholder="********"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <div className="flex justify-end">
                    <Button variant="solid" type="submit">
                        {t('settingsSecurity.updateBtn')}
                    </Button>
                </div>
            </Form>
            <ConfirmDialog
                isOpen={confirmationOpen}
                type="warning"
                title={t('settingsSecurity.confirmTitle')}
                confirmButtonProps={{
                    loading: isSubmitting,
                    onClick: handlePostSubmit,
                }}
                onClose={() => setConfirmationOpen(false)}
                onRequestClose={() => setConfirmationOpen(false)}
                onCancel={() => setConfirmationOpen(false)}
            >
                <p>{t('settingsSecurity.confirmBody')}</p>
            </ConfirmDialog>
        </div>
    )
}

export default SettingsSecurity
