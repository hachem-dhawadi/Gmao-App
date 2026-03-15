import { useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import CustomerForm from '../CustomerForm'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { TbTrash } from 'react-icons/tb'
import { mutate as globalMutate } from 'swr'
import { useNavigate } from 'react-router-dom'
import {
    apiCreateCompany,
    type SuperadminCompanyResponse,
} from '@/services/CompaniesService'
import type { CustomerFormSchema } from '../CustomerForm'

type ApiError = {
    response?: {
        data?: {
            message?: string
            errors?: Record<string, string[]>
        }
    }
}

const DEFAULT_COMPANY_LOGO_PATH = '/img/others/upload.png'

const loadDefaultCompanyLogoFile = async (): Promise<File | null> => {
    try {
        const response = await fetch(DEFAULT_COMPANY_LOGO_PATH)
        if (!response.ok) {
            return null
        }

        const blob = await response.blob()
        return new File([blob], 'company-default.png', {
            type: blob.type || 'image/png',
        })
    } catch {
        return null
    }
}

const CompanyCreate = () => {
    const navigate = useNavigate()

    const [discardConfirmationOpen, setDiscardConfirmationOpen] =
        useState(false)
    const [isSubmiting, setIsSubmiting] = useState(false)

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

        if (rawPhone.startsWith('+')) {
            return `+${phoneDigits}`
        }

        return phoneDigits
    }

    const handleFormSubmit = async (values: CustomerFormSchema) => {
        setIsSubmiting(true)

        try {
            const logoFile =
                values.logoFile || (await loadDefaultCompanyLogoFile())

            const response = await apiCreateCompany<SuperadminCompanyResponse>({
                name: values.firstName,
                legal_name: values.lastName || null,
                email: values.email || null,
                phone: buildPhone(values.dialCode, values.phoneNumber),
                country: values.country || null,
                address_line1: values.address || null,
                city: values.city || null,
                postal_code: values.postcode || null,
                timezone: 'Africa/Tunis',
                logo: logoFile,
            })

            await globalMutate((key) => {
                return (
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/superadmin/companies'
                )
            })

            toast.push(
                <Notification type="success">Company created!</Notification>,
                {
                    placement: 'top-center',
                },
            )

            const createdId = response?.data?.company?.id
            if (createdId) {
                navigate(`/concepts/company/company-details/${createdId}`)
                return
            }

            navigate('/concepts/company/company-list')
        } catch (error) {
            const apiError = error as ApiError
            const validationErrors = apiError.response?.data?.errors
            const firstValidationError = validationErrors
                ? Object.values(validationErrors)[0]?.[0]
                : undefined

            const message =
                firstValidationError ||
                apiError.response?.data?.message ||
                'Failed to create company.'

            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmiting(false)
        }
    }

    const handleConfirmDiscard = () => {
        setDiscardConfirmationOpen(false)
        toast.push(<Notification type="success">Changes discarded!</Notification>, {
            placement: 'top-center',
        })
        navigate('/concepts/company/company-list')
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
                defaultValues={{
                    firstName: '',
                    lastName: '',
                    email: '',
                    img: '',
                    logoFile: null,
                    phoneNumber: '',
                    dialCode: '+216',
                    country: '',
                    address: '',
                    city: '',
                    postcode: '',
                    tags: [],
                    isActive: false,
                    approvalStatus: 'pending',
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
                    Are you sure you want discard this? This action can&apos;t be
                    undo.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default CompanyCreate


