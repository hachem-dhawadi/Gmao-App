import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar/Avatar'
import Notification from '@/components/ui/Notification'
import Tooltip from '@/components/ui/Tooltip'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import dayjs from 'dayjs'
import { HiPencil, HiOutlineTrash } from 'react-icons/hi'
import {
    FaXTwitter,
    FaFacebookF,
    FaLinkedinIn,
    FaPinterestP,
} from 'react-icons/fa6'
import { useNavigate } from 'react-router-dom'
import { apiDeleteCompany } from '@/services/CompaniesService'
import { mutate as globalMutate } from 'swr'

export type CompanyDetailsViewData = Partial<{
    id: string
    img: string
    name: string
    email: string
    lastOnline: number
    approvalStatus: string
    isActive: boolean
    timezone: string
    addressLine1: string
    addressLine2: string
    city: string
    postalCode: string
    country: string
    ownerName: string
    ownerEmail: string
    ownerPhone: string
    createdAt: string
    updatedAt: string
    personalInfo: {
        location: string
        title: string
        birthday: string
        phoneNumber: string
        facebook: string
        twitter: string
        pinterest: string
        linkedIn: string
        address: string
        postcode: string
        city: string
        country: string
    }
}>

type CustomerInfoFieldProps = {
    title?: string
    value?: string
}

type ProfileSectionProps = {
    data: CompanyDetailsViewData
}

type ApiError = {
    response?: {
        data?: {
            message?: string
        }
    }
}

const CustomerInfoField = ({ title, value }: CustomerInfoFieldProps) => {
    return (
        <div>
            <span className="font-semibold">{title}</span>
            <p className="heading-text font-bold">{value || '-'}</p>
        </div>
    )
}

const ProfileSection = ({ data = {} }: ProfileSectionProps) => {
    const navigate = useNavigate()

    const [dialogOpen, setDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleSocialNavigate = (link: string = '') => {
        if (!link) {
            return
        }
        window.open(`https://${link}`, '_blank', 'rel=noopener noreferrer')
    }

    const handleDialogClose = () => {
        if (!isDeleting) {
            setDialogOpen(false)
        }
    }

    const handleDialogOpen = () => {
        setDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!data.id) {
            setDialogOpen(false)
            return
        }

        setIsDeleting(true)

        try {
            await apiDeleteCompany(data.id)
            await globalMutate((key) => {
                return (
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/superadmin/companies'
                )
            })

            setDialogOpen(false)
            navigate('/concepts/company/company-list')
            toast.push(
                <Notification title={'Successfully Deleted'} type="success">
                    Company successfully deleted
                </Notification>,
                {
                    placement: 'top-center',
                },
            )
        } catch (error) {
            const message =
                (error as ApiError).response?.data?.message ||
                'Failed to delete company.'

            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleSendMessage = () => {
        navigate('/concepts/chat')
    }

    const handleEdit = () => {
        navigate(`/concepts/company/company-edit/${data.id}`)
    }

    const lastOnlineText =
        typeof data.lastOnline === 'number'
            ? dayjs.unix(data.lastOnline).format('DD MMM YYYY hh:mm A')
            : '-'

    return (
        <Card className="w-full">
            <div className="flex justify-end">
                <Tooltip title="Edit company">
                    <button
                        className="close-button button-press-feedback"
                        type="button"
                        onClick={handleEdit}
                    >
                        <HiPencil />
                    </button>
                </Tooltip>
            </div>
            <div className="flex flex-col xl:justify-between h-full 2xl:min-w-[360px] mx-auto">
                <div className="flex xl:flex-col items-center gap-4 mt-6">
                    <Avatar size={90} shape="circle" src={data.img} />
                    <h4 className="font-bold">{data.name || '-'}</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-y-7 gap-x-4 mt-10">
                    <CustomerInfoField title="Email" value={data.email} />
                    <CustomerInfoField
                        title="Phone"
                        value={data.personalInfo?.phoneNumber}
                    />
                    <CustomerInfoField
                        title="Date of birth"
                        value={data.personalInfo?.birthday}
                    />
                    <CustomerInfoField title="Last Online" value={lastOnlineText} />
                    <div className="mb-7">
                        <span>Social</span>
                        <div className="flex mt-4 gap-2">
                            <Button
                                size="sm"
                                icon={<FaFacebookF className="text-[#2259f2]" />}
                                onClick={() =>
                                    handleSocialNavigate(data.personalInfo?.facebook)
                                }
                            />
                            <Button
                                size="sm"
                                icon={
                                    <FaXTwitter className="text-black dark:text-white" />
                                }
                                onClick={() =>
                                    handleSocialNavigate(data.personalInfo?.twitter)
                                }
                            />
                            <Button
                                size="sm"
                                icon={<FaLinkedinIn className="text-[#155fb8]" />}
                                onClick={() =>
                                    handleSocialNavigate(data.personalInfo?.linkedIn)
                                }
                            />
                            <Button
                                size="sm"
                                icon={<FaPinterestP className="text-[#df0018]" />}
                                onClick={() =>
                                    handleSocialNavigate(data.personalInfo?.pinterest)
                                }
                            />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    <Button block variant="solid" onClick={handleSendMessage}>
                        Send Messsage
                    </Button>
                    <Button
                        block
                        customColorClass={() =>
                            'text-error hover:border-error hover:ring-1 ring-error hover:text-error'
                        }
                        icon={<HiOutlineTrash />}
                        onClick={handleDialogOpen}
                    >
                        Delete
                    </Button>
                </div>
                <ConfirmDialog
                    isOpen={dialogOpen}
                    type="danger"
                    title="Delete company"
                    onClose={handleDialogClose}
                    onRequestClose={handleDialogClose}
                    onCancel={handleDialogClose}
                    onConfirm={handleConfirmDelete}
                    confirmButtonProps={{ loading: isDeleting }}
                >
                    <p>
                        Are you sure you want to delete this company? All records
                        related to this company will be deleted as well. This action
                        cannot be undone.
                    </p>
                </ConfirmDialog>
            </div>
        </Card>
    )
}

export default ProfileSection
