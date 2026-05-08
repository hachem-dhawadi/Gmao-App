import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import CustomerForm from '../CustomerForm'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { apiCreateMember } from '@/services/CustomersService'
import {
    apiGetCompaniesList,
    type SuperadminCompany,
} from '@/services/CompaniesService'
import { useSessionUser } from '@/store/authStore'
import { CURRENT_COMPANY_ID_KEY } from '@/constants/app.constant'
import { TbTrash } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import useSWR from 'swr'
import type { CustomerFormSchema } from '../CustomerForm'

const buildPhone = (dialCode: string, phoneNumber: string): string => {
    const dialDigits = (dialCode || '').replace(/[^\d]/g, '')
    const formattedDial = dialDigits ? `+${dialDigits}` : ''
    const rawPhone = (phoneNumber || '').trim()
    if (!rawPhone) return ''
    const phoneDigits = rawPhone.replace(/[^\d]/g, '')
    if (!phoneDigits) return ''
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

type CompanyOption = { value: number; label: string }

const CustomerCreate = () => {
    const navigate = useNavigate()
    const isSuperadmin = useSessionUser((state) => Boolean(state.user.isSuperadmin))

    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
    const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false)
    const [isSubmiting, setIsSubmiting] = useState(false)

    const { data: companiesData } = useSWR<SuperadminCompany[]>(
        isSuperadmin ? '/superadmin/companies/all' : null,
        async () => {
            const res = await apiGetCompaniesList<{
                success: boolean
                data: { companies: SuperadminCompany[] }
            }>({ per_page: 200 })
            return res.data.companies
        },
        { revalidateOnFocus: false },
    )

    const companyOptions: CompanyOption[] = (companiesData || [])
        .filter((c) => c.is_active && c.approval_status === 'approved')
        .map((c) => ({ value: c.id, label: c.name }))

    const handleFormSubmit = async (values: CustomerFormSchema) => {
        if (isSuperadmin && !selectedCompanyId) {
            toast.push(
                <Notification type="warning">
                    Please select a company to assign this user to.
                </Notification>,
                { placement: 'top-center' },
            )
            return
        }

        const name = `${values.firstName} ${values.lastName}`.trim()
        const phone = buildPhone(values.dialCode, values.phoneNumber)
        const selectedRole = values.role || 'technician'
        const password = (values.password || '').trim()
        const passwordConfirmation = (values.passwordConfirmation || '').trim()

        if (password && password !== passwordConfirmation) {
            toast.push(
                <Notification type="danger">
                    Password confirmation does not match.
                </Notification>,
                { placement: 'top-center' },
            )
            return
        }

        try {
            setIsSubmiting(true)

            const prevCompanyId = localStorage.getItem(CURRENT_COMPANY_ID_KEY)
            if (isSuperadmin && selectedCompanyId) {
                localStorage.setItem(
                    CURRENT_COMPANY_ID_KEY,
                    String(selectedCompanyId),
                )
            }

            try {
                await apiCreateMember({
                    name,
                    email: values.email,
                    phone,
                    employee_code: generateEmployeeCode(
                        values.firstName,
                        values.lastName,
                    ),
                    job_title: selectedRole
                        ? selectedRole.charAt(0).toUpperCase() +
                          selectedRole.slice(1)
                        : null,
                    roles: [selectedRole],
                    locale: values.locale || 'TN',
                    password: password || null,
                    password_confirmation: password ? passwordConfirmation : null,
                    department_id: null,
                    avatar: values.imgFile || null,
                })
            } finally {
                if (isSuperadmin) {
                    if (prevCompanyId) {
                        localStorage.setItem(
                            CURRENT_COMPANY_ID_KEY,
                            prevCompanyId,
                        )
                    } else {
                        localStorage.removeItem(CURRENT_COMPANY_ID_KEY)
                    }
                }
            }

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/members',
            )

            toast.push(
                <Notification type="success">
                    User created successfully.
                </Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/customers/customer-list')
        } catch (error: unknown) {
            const backendMessage =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ||
                (error as Error)?.message ||
                'Failed to create user.'

            toast.push(
                <Notification type="danger">{backendMessage}</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setIsSubmiting(false)
        }
    }

    return (
        <>
            <CustomerForm
                newCustomer
                companyOptions={isSuperadmin ? companyOptions : []}
                selectedCompanyId={selectedCompanyId}
                onCompanyChange={setSelectedCompanyId}
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
                    locale: 'TN',
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
                                onClick={() =>
                                    setDiscardConfirmationOpen(true)
                                }
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
                onClose={() => setDiscardConfirmationOpen(false)}
                onRequestClose={() => setDiscardConfirmationOpen(false)}
                onCancel={() => setDiscardConfirmationOpen(false)}
                onConfirm={() => {
                    setDiscardConfirmationOpen(false)
                    navigate('/concepts/customers/customer-list')
                }}
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
