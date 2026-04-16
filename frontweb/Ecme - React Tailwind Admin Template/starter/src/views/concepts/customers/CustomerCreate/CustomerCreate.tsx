import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import CustomerForm from '../CustomerForm'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
    apiCreateMember,
    apiCreateSuperadminUser,
} from '@/services/CustomersService'
import { useSessionUser } from '@/store/authStore'
import { TbTrash } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import type { CustomerFormSchema } from '../CustomerForm'

const buildPhone = (dialCode: string, phoneNumber: string): string => {
    const dialDigits = (dialCode || '').replace(/[^\d]/g, '')
    const formattedDial = dialDigits ? `+${dialDigits}` : ''
    const rawPhone = (phoneNumber || '').trim()

    if (!rawPhone) {
        return ''
    }

    const phoneDigits = rawPhone.replace(/[^\d]/g, '')

    if (!phoneDigits) {
        return ''
    }

    if (formattedDial) {
        const localDigits = phoneDigits.startsWith(dialDigits)
            ? phoneDigits.slice(dialDigits.length)
            : phoneDigits

        return `${formattedDial}${localDigits ? ` ${localDigits}` : ''}`
    }

    return rawPhone.startsWith('+') ? `+${phoneDigits}` : phoneDigits
}

const generateEmployeeCode = (firstName: string, lastName: string): string => {
    const prefix = `${(firstName || '').slice(0, 2)}${(lastName || '').slice(0, 2)}`
        .replace(/\s+/g, '')
        .toUpperCase()

    return `EMP-${prefix || 'USER'}-${Date.now().toString().slice(-6)}`
}

const CustomerCreate = () => {
    const navigate = useNavigate()

    const isSuperadmin = useSessionUser((state) => Boolean(state.user.isSuperadmin))

    const [discardConfirmationOpen, setDiscardConfirmationOpen] =
        useState(false)
    const [isSubmiting, setIsSubmiting] = useState(false)

    const handleFormSubmit = async (values: CustomerFormSchema) => {
        const name = `${values.firstName} ${values.lastName}`.trim()
        const phone = buildPhone(values.dialCode, values.phoneNumber)
        const selectedRole = values.role || 'technician'

        try {
            setIsSubmiting(true)

            if (isSuperadmin) {
                const password = (values.password || '').trim()
                const passwordConfirmation = (values.passwordConfirmation || '').trim()

                if (!password || !passwordConfirmation) {
                    throw new Error('Password and confirmation are required for superadmin user creation.')
                }

                if (password.length < 8) {
                    throw new Error('Password must be at least 8 characters.')
                }

                if (password !== passwordConfirmation) {
                    throw new Error('Password confirmation does not match.')
                }

                await apiCreateSuperadminUser({
                    name,
                    email: values.email,
                    phone,
                    password,
                    password_confirmation: passwordConfirmation,
                    locale: values.locale || 'TN',
                    is_active: true,
                    is_superadmin: false,
                    two_factor_enabled: false,
                    avatar: values.imgFile || null,
                })
            } else {
                await apiCreateMember({
                    name,
                    email: values.email,
                    phone,
                    employee_code:
                        values.employeeCode?.trim() ||
                        generateEmployeeCode(values.firstName, values.lastName),
                    job_title: selectedRole
                        ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)
                        : null,
                    roles: [selectedRole],
                    department_id: null,
                    avatar: values.imgFile || null,
                })
            }

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    (key[0] === '/members' || key[0] === '/superadmin/users'),
            )

            toast.push(
                <Notification type="success">User created successfully.</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/customers/customer-list')
        } catch (error: unknown) {
            const backendMessage =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ||
                (error as Error)?.message ||
                'Failed to create user.'

            toast.push(<Notification type="danger">{backendMessage}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmiting(false)
        }
    }

    const handleConfirmDiscard = () => {
        setDiscardConfirmationOpen(false)
        toast.push(
            <Notification type="success">Changes discarded.</Notification>,
            { placement: 'top-center' },
        )
        navigate('/concepts/customers/customer-list')
    }

    const handleDiscard = () => {
        setDiscardConfirmationOpen(true)
    }

    const handleCancel = () => {
        setDiscardConfirmationOpen(false)
    }

    return (
        <>
            <CustomerForm
                newCustomer
                showPasswordFields={isSuperadmin}
                showEmployeeCode={!isSuperadmin}
                showLocale={isSuperadmin}
                defaultValues={{
                    firstName: '',
                    lastName: '',
                    email: '',
                    img: '',
                    phoneNumber: '',
                    dialCode: '+216',
                    country: 'TN',
                    address: '',
                    city: 'Tunis',
                    postcode: '',
                    password: '',
                    passwordConfirmation: '',
                    imgFile: null,
                    removeAvatar: false,
                    role: 'technician',
                    employeeCode: '',
                }}
                onFormSubmit={handleFormSubmit}
            >
                <Container>
                    <div className="flex items-center justify-between px-8">
                        <span></span>
                        <div className="flex items-center">
                            <Button
                                className="ltr:mr-3 rtl:ml-3"
                                type="button"
                                customColorClass={() =>
                                    'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error bg-transparent'
                                }
                                icon={<TbTrash />}
                                onClick={handleDiscard}
                            >
                                Discard
                            </Button>
                            <Button
                                variant="solid"
                                type="submit"
                                loading={isSubmiting}
                            >
                                Create
                            </Button>
                        </div>
                    </div>
                </Container>
            </CustomerForm>
            <ConfirmDialog
                isOpen={discardConfirmationOpen}
                type="danger"
                title="Discard changes"
                onClose={handleCancel}
                onRequestClose={handleCancel}
                onCancel={handleCancel}
                onConfirm={handleConfirmDiscard}
            >
                <p>
                    Are you sure you want discard this? This action can&apos;t
                    be undo.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default CustomerCreate
