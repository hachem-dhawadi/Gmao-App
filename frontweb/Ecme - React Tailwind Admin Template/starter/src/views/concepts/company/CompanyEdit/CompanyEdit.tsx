import { useMemo, useState } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Loading from '@/components/shared/Loading'
import NoUserFound from '@/assets/svg/NoUserFound'
import CustomerForm from '../CustomerForm'
import {
    apiDeleteCompany,
    apiGetCompany,
    apiUpdateCompany,
    resolveCompanyLogoUrl,
    type SuperadminCompany,
    type SuperadminCompanyResponse,
} from '@/services/CompaniesService'
import { TbTrash, TbArrowNarrowLeft } from 'react-icons/tb'
import { mutate as globalMutate } from 'swr'
import { useParams, useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import type { CustomerFormSchema, ApprovalStatus } from '../CustomerForm'

type ApiError = {
    response?: {
        data?: {
            message?: string
        }
    }
}

function normalizeApprovalStatus(status?: string | null): ApprovalStatus {
    const normalized = (status || '').toLowerCase()

    if (normalized === 'approved' || normalized === 'rejected') {
        return normalized
    }

    return 'pending'
}

function mapCompanyToForm(company: SuperadminCompany): CustomerFormSchema {
    return {
        firstName: company.name || '',
        lastName: company.legal_name || '',
        email: company.email || '',
        img: resolveCompanyLogoUrl(company),
        logoFile: null,
        phoneNumber: company.phone || '',
        dialCode: '+216',
        country: company.country || '',
        address: company.address_line1 || '',
        city: company.city || '',
        postcode: company.postal_code || '',
        tags: [],
        isActive: Boolean(company.is_active),
        approvalStatus: normalizeApprovalStatus(company.approval_status),
    }
}

const CompanyEdit = () => {
    const { id } = useParams()
    const navigate = useNavigate()

    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
    const [isSubmiting, setIsSubmiting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const { data, isLoading } = useSWR(
        id ? ['/superadmin/companies', { id }] : null,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, params]) =>
            apiGetCompany<SuperadminCompanyResponse, { id: string }>(params),
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
        },
    )

    const company = data?.data?.company

    const defaultValues = useMemo(() => {
        if (!company) {
            return undefined
        }

        return mapCompanyToForm(company)
    }, [company])

    const handleFormSubmit = async (values: CustomerFormSchema) => {
        if (!id || !company) {
            return
        }

        setIsSubmiting(true)

        try {
            const response = await apiUpdateCompany(id, {
                name: values.firstName,
                legal_name: values.lastName || null,
                email: values.email || null,
                phone: values.phoneNumber || null,
                country: values.country || null,
                address_line1: values.address || null,
                city: values.city || null,
                postal_code: values.postcode || null,
                timezone: company.timezone,
                logo: values.logoFile || null,
                is_active: Boolean(values.isActive),
                approval_status: values.approvalStatus || 'pending',
            })

            await globalMutate((key) => {
                return (
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/superadmin/companies'
                )
            })

            toast.push(<Notification type="success">Changes Saved!</Notification>, {
                placement: 'top-center',
            })
            navigate(`/concepts/company/company-details/${response.data.company.id}`)
        } catch (error) {
            const message =
                (error as ApiError).response?.data?.message ||
                'Failed to update company.'

            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmiting(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!id) {
            return
        }

        setIsDeleting(true)

        try {
            await apiDeleteCompany(id)
            await globalMutate((key) => {
                return (
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/superadmin/companies'
                )
            })

            toast.push(<Notification type="success">Company deleted!</Notification>, {
                placement: 'top-center',
            })
            navigate('/concepts/company/company-list')
        } catch (error) {
            const message =
                (error as ApiError).response?.data?.message ||
                'Failed to delete company.'
            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsDeleting(false)
            setDeleteConfirmationOpen(false)
        }
    }

    const handleDelete = () => {
        setDeleteConfirmationOpen(true)
    }

    const handleCancel = () => {
        setDeleteConfirmationOpen(false)
    }

    const handleBack = () => {
        history.back()
    }

    return (
        <>
            <Loading loading={isLoading}>
                {!isLoading && !company && (
                    <div className="h-full flex flex-col items-center justify-center">
                        <NoUserFound height={280} width={280} />
                        <h3 className="mt-8">No company found!</h3>
                    </div>
                )}
                {!isLoading && company && defaultValues && (
                    <CustomerForm
                        defaultValues={defaultValues}
                        newCustomer={false}
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
                                        loading={isDeleting}
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
                )}
            </Loading>
            <ConfirmDialog
                isOpen={deleteConfirmationOpen}
                type="danger"
                title="Remove company"
                onClose={handleCancel}
                onRequestClose={handleCancel}
                onCancel={handleCancel}
                onConfirm={handleConfirmDelete}
                confirmButtonProps={{ loading: isDeleting }}
            >
                <p>
                    Are you sure you want to remove this company? This action
                    can&apos;t be undo.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default CompanyEdit
