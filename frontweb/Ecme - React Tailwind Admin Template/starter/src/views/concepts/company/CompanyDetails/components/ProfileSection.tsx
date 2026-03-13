import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar/Avatar'
import Tooltip from '@/components/ui/Tooltip'
import dayjs from 'dayjs'
import { HiPencil } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'

export type CompanyDetailsData = {
    id: string
    img: string
    name: string
    email: string
    approvalStatus: string
    updatedAt: string
    personalInfo: {
        phoneNumber: string
        city: string
        country: string
    }
}

type CompanyInfoFieldProps = {
    title?: string
    value?: string
}

const CompanyInfoField = ({ title, value }: CompanyInfoFieldProps) => {
    return (
        <div>
            <span className="font-semibold">{title}</span>
            <p className="heading-text font-bold">{value || '-'}</p>
        </div>
    )
}

const statusColor: Record<string, string> = {
    approved: 'text-emerald-600 dark:text-emerald-400',
    pending: 'text-amber-600 dark:text-amber-400',
    rejected: 'text-red-600 dark:text-red-400',
}

const ProfileSection = ({ data }: { data: CompanyDetailsData }) => {
    const navigate = useNavigate()

    const handleEdit = () => {
        navigate(`/concepts/company/company-edit/${data.id}`)
    }

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
                    <div className="text-center">
                        <h4 className="font-bold">{data.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{data.email || '-'}</p>
                        <p
                            className={`text-sm capitalize mt-1 ${statusColor[data.approvalStatus] || statusColor.pending}`}
                        >
                            {data.approvalStatus}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-y-7 gap-x-4 mt-10">
                    <CompanyInfoField
                        title="Phone"
                        value={data.personalInfo.phoneNumber}
                    />
                    <CompanyInfoField title="City" value={data.personalInfo.city} />
                    <CompanyInfoField
                        title="Country"
                        value={data.personalInfo.country}
                    />
                    <CompanyInfoField
                        title="Last update"
                        value={dayjs(data.updatedAt).format('DD MMM YYYY hh:mm A')}
                    />
                </div>
                <div className="flex flex-col gap-4 mt-8">
                    <Button block variant="solid" onClick={handleEdit}>
                        Edit company
                    </Button>
                    <Button
                        block
                        onClick={() => navigate('/concepts/company/company-list')}
                    >
                        Back to list
                    </Button>
                </div>
            </div>
        </Card>
    )
}

export default ProfileSection
