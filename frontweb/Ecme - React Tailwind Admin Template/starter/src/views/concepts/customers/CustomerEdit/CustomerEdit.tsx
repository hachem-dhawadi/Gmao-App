import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
    apiDeleteCompanyMemberById,
    apiDeleteSuperadminUserById,
    apiGetCompanyMemberById,
    apiGetSuperadminUserById,
    apiUpdateCompanyMemberById,
    apiUpdateSuperadminUserById,
    type CompanyMemberListItem,
    type CompanyMemberResponse,
    type SuperadminUserListItem,
    type SuperadminUserResponse,
    type UpdateMemberRequest,
    type UpdateSuperadminUserRequest,
} from '@/services/CustomersService'
import CustomerForm from '../CustomerForm'
import NoUserFound from '@/assets/svg/NoUserFound'
import { useSessionUser } from '@/store/authStore'
import { TbTrash, TbArrowNarrowLeft } from 'react-icons/tb'
import { useParams, useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { mutate as globalMutate } from 'swr'
import type { CustomerFormSchema } from '../CustomerForm'

type RoleCode = CustomerFormSchema['role']

type CustomerEditData =
    | { mode: 'superadmin'; user: SuperadminUserListItem }
    | { mode: 'owner'; member: CompanyMemberListItem }

const allowedRoleCodes: RoleCode[] = ['admin', 'hr', 'manager', 'technician']

const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)

    if (parts.length === 0) {
        return { firstName: '', lastName: '' }
    }

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: parts[0] }
    }

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    }
}

const splitPhone = (phone: string | null): { dialCode: string; phoneNumber: string } => {
    const defaultDialCode = '+216'
    const rawPhone = (phone || '').trim()

    if (!rawPhone) {
        return {
            dialCode: defaultDialCode,
            phoneNumber: '',
        }
    }

    const formattedMatch = rawPhone.match(/^(\+\d{1,4})\s+(.+)$/)
    if (formattedMatch) {
        return {
            dialCode: formattedMatch[1],
            phoneNumber: formattedMatch[2].replace(/[^\d]/g, ''),
        }
    }

    return {
        dialCode: defaultDialCode,
        phoneNumber: rawPhone.replace(/[^\d]/g, ''),
    }
}

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

const normalizeRole = (value?: string | null): RoleCode => {
    const lowered = (value || '').toLowerCase()
    return allowedRoleCodes.includes(lowered as RoleCode)
        ? (lowered as RoleCode)
        : 'technician'
}

const toTitleCase = (value: string): string =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : value

const toDefaultValuesFromSuperadmin = (
    user: SuperadminUserListItem,
): CustomerFormSchema => {
    const { firstName, lastName } = splitFullName(user.name || '')
    const { dialCode, phoneNumber } = splitPhone(user.phone)

    return {
        firstName,
        lastName,
        email: user.email || '',
        img: user.avatar_url || user.avatar_path || '',
        dialCode,
        phoneNumber,
        country: 'TN',
        address: '',
        city: 'Tunis',
        postcode: '',
        role: normalizeRole(user.is_superadmin ? 'admin' : 'technician'),
        locale: user.locale || 'TN',
        banAccount: !user.is_active,
        accountVerified: user.is_active,
        password: '',
        passwordConfirmation: '',
        imgFile: null,
        removeAvatar: false,
    }
}

const toDefaultValuesFromMember = (
    member: CompanyMemberListItem,
): CustomerFormSchema => {
    const fullName = member.user?.name || ''
    const { firstName, lastName } = splitFullName(fullName)
    const { dialCode, phoneNumber } = splitPhone(member.user?.phone || null)
    const primaryRoleCode = normalizeRole(
        member.roles?.[0]?.code || member.job_title || '',
    )
    const isActive = (member.status || '').toLowerCase() === 'active'

    return {
        firstName,
        lastName,
        email: member.user?.email || '',
        img: member.user?.avatar_url || member.user?.avatar_path || '',
        dialCode,
        phoneNumber,
        country: 'TN',
        address: '',
        city: 'Tunis',
        postcode: '',
        role: primaryRoleCode,
        employeeCode: member.employee_code || '',
        banAccount: !isActive,
        accountVerified: isActive,
        password: '',
        passwordConfirmation: '',
        imgFile: null,
        removeAvatar: false,
    }
}

const CustomerEdit = () => {
    const { id } = useParams()
    const isSuperadmin = useSessionUser((state) => Boolean(state.user.isSuperadmin))

    const navigate = useNavigate()

    const { data, isLoading } = useSWR<CustomerEditData>(
        id ? ['/customers/edit', id, isSuperadmin] : null,
        async () => {
            if (!id) {
                throw new Error('User id is required.')
            }

            if (isSuperadmin) {
                const response =
                    await apiGetSuperadminUserById<SuperadminUserResponse>(id)

                return {
                    mode: 'superadmin',
                    user: response.data.user,
                }
            }

            const response =
                await apiGetCompanyMemberById<CompanyMemberResponse>(id)

            return {
                mode: 'owner',
                member: response.data.member,
            }
        },
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
        },
    )

    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
    const [isSubmiting, setIsSubmiting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleFormSubmit = async (values: CustomerFormSchema) => {
        if (!id || !data) {
            return
        }

        try {
            setIsSubmiting(true)

            const name = `${values.firstName} ${values.lastName}`.trim()
            const phone = buildPhone(values.dialCode, values.phoneNumber)

            if (data.mode === 'superadmin') {
                const payload: UpdateSuperadminUserRequest = {
                    name,
                    email: values.email,
                    phone,
                    locale: values.locale || 'TN',
                    is_active: !values.banAccount,
                }
                if (values.imgFile instanceof File) {
                    payload.avatar = values.imgFile
                }
                if (values.removeAvatar) {
                    payload.remove_avatar = true
                }

                const password = (values.password || '').trim()
                const passwordConfirmation = (
                    values.passwordConfirmation || ''
                ).trim()

                if (password || passwordConfirmation) {
                    if (!password || !passwordConfirmation) {
                        throw new Error(
                            'Password and confirmation are both required.',
                        )
                    }

                    if (password.length < 8) {
                        throw new Error(
                            'Password must be at least 8 characters.',
                        )
                    }

                    if (password !== passwordConfirmation) {
                        throw new Error('Password confirmation does not match.')
                    }

                    payload.password = password
                    payload.password_confirmation = passwordConfirmation
                }

                await apiUpdateSuperadminUserById(id, payload)
            } else {
                const selectedRole =
                    normalizeRole(values.role) ||
                    normalizeRole(data.member.roles?.[0]?.code)
                const payload: UpdateMemberRequest = {
                    name,
                    email: values.email,
                    phone,
                    roles: [selectedRole],
                    job_title: toTitleCase(selectedRole),
                    status: values.banAccount ? 'inactive' : 'active',
                    ...(values.employeeCode ? { employee_code: values.employeeCode } : {}),
                }
                if (values.imgFile instanceof File) {
                    payload.avatar = values.imgFile
                }
                if (values.removeAvatar) {
                    payload.remove_avatar = true
                }

                await apiUpdateCompanyMemberById(id, payload)
            }

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    (key[0] === '/members' || key[0] === '/superadmin/users'),
            )

            toast.push(
                <Notification type="success">Changes saved.</Notification>,
                {
                    placement: 'top-center',
                },
            )
            navigate('/concepts/customers/customer-list')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ||
                (error as Error)?.message ||
                'Failed to update user.'

            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmiting(false)
        }
    }

    const getDefaultValues = (): CustomerFormSchema => {
        if (!data) {
            return {
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
                role: 'technician',
                banAccount: false,
                accountVerified: true,
                password: '',
                passwordConfirmation: '',
                imgFile: null,
                removeAvatar: false,
            }
        }

        return data.mode === 'superadmin'
            ? toDefaultValuesFromSuperadmin(data.user)
            : toDefaultValuesFromMember(data.member)
    }

    const handleDelete = () => {
        setDeleteConfirmationOpen(true)
    }

    const handleCancel = () => {
        setDeleteConfirmationOpen(false)
    }

    const handleConfirmDelete = async () => {
        if (!id) {
            return
        }

        try {
            setIsDeleting(true)

            if (isSuperadmin) {
                await apiDeleteSuperadminUserById(id)
            } else {
                await apiDeleteCompanyMemberById(id)
            }

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    (key[0] === '/members' || key[0] === '/superadmin/users'),
            )

            toast.push(
                <Notification type="success">User deleted.</Notification>,
                {
                    placement: 'top-center',
                },
            )

            navigate('/concepts/customers/customer-list')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to delete user.'

            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsDeleting(false)
            setDeleteConfirmationOpen(false)
        }
    }

    const handleBack = () => {
        navigate(-1)
    }

    return (
        <>
            {!isLoading && !data && (
                <div className="h-full flex flex-col items-center justify-center">
                    <NoUserFound height={280} width={280} />
                    <h3 className="mt-8">No user found!</h3>
                </div>
            )}
            {!isLoading && data && (
                <>
                    <CustomerForm
                        defaultValues={getDefaultValues() as CustomerFormSchema}
                        newCustomer={false}
                        showPasswordFields={isSuperadmin}
                        showEmployeeCode={!isSuperadmin}
                        showLocale={isSuperadmin}
                        onFormSubmit={handleFormSubmit}
                    >
                        <Container>
                            <div className="flex items-center justify-between px-8">
                                <Button
                                    className="ltr:mr-3 rtl:ml-3"
                                    type="button"
                                    variant="plain"
                                    icon={<TbArrowNarrowLeft />}
                                    onClick={handleBack}
                                >
                                    Back
                                </Button>
                                <div className="flex items-center">
                                    <Button
                                        className="ltr:mr-3 rtl:ml-3"
                                        type="button"
                                        customColorClass={() =>
                                            'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error bg-transparent'
                                        }
                                        icon={<TbTrash />}
                                        onClick={handleDelete}
                                    >
                                        Delete
                                    </Button>
                                    <Button
                                        variant="solid"
                                        type="submit"
                                        loading={isSubmiting}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </Container>
                    </CustomerForm>
                    <ConfirmDialog
                        isOpen={deleteConfirmationOpen}
                        type="danger"
                        title="Remove customers"
                        onClose={handleCancel}
                        onRequestClose={handleCancel}
                        onCancel={handleCancel}
                        onConfirm={handleConfirmDelete}
                        confirmButtonProps={{ loading: isDeleting }}
                    >
                        <p>
                            Are you sure you want to remove this user? This
                            action can&apos;t be undone.
                        </p>
                    </ConfirmDialog>
                </>
            )}
        </>
    )
}

export default CustomerEdit
