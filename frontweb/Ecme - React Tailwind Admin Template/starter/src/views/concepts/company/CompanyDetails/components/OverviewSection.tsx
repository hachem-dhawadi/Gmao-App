import Card from '@/components/ui/Card'
import type { CompanyDetailsData } from './ProfileSection'

const Field = ({
    title,
    value,
}: {
    title: string
    value?: string | number | null
}) => (
    <div>
        <span className="font-semibold">{title}</span>
        <p className="heading-text font-bold break-words">{value || '-'}</p>
    </div>
)

type OverviewSectionProps = {
    data: CompanyDetailsData & {
        legalName: string
        timezone: string
        membersCount: number
        isActive: boolean
        addressLine1: string
        addressLine2: string
        postalCode: string
    }
}

const OverviewSection = ({ data }: OverviewSectionProps) => {
    return (
        <div>
            <h6 className="mb-4">Company profile</h6>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field title="Name" value={data.name} />
                    <Field title="Legal name" value={data.legalName} />
                    <Field title="Email" value={data.email} />
                    <Field title="Phone" value={data.personalInfo.phoneNumber} />
                    <Field title="Address" value={data.addressLine1} />
                    <Field title="Address line 2" value={data.addressLine2} />
                    <Field title="City" value={data.personalInfo.city} />
                    <Field title="Postal code" value={data.postalCode} />
                    <Field title="Country" value={data.personalInfo.country} />
                    <Field title="Timezone" value={data.timezone} />
                    <Field title="Members" value={data.membersCount} />
                    <Field title="Active" value={data.isActive ? 'Yes' : 'No'} />
                </div>
            </Card>
        </div>
    )
}

export default OverviewSection
