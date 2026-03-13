import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import Loading from '@/components/shared/Loading'
import NoUserFound from '@/assets/svg/NoUserFound'
import ProfileSection, { type CompanyDetailsData } from './components/ProfileSection'
import OverviewSection from './components/OverviewSection'
import ActivitySection from './components/ActivitySection'
import {
    apiGetCompany,
    resolveCompanyLogoUrl,
    type SuperadminCompanyResponse,
} from '@/services/CompaniesService'
import useSWR from 'swr'
import { useParams } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'

const { TabNav, TabList, TabContent } = Tabs

const CompanyDetails = () => {
    const { id } = useParams()

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

    const detailsData: (CompanyDetailsData & {
        legalName: string
        timezone: string
        membersCount: number
        isActive: boolean
        addressLine1: string
        addressLine2: string
        postalCode: string
        createdAt: string
    }) | null = company
        ? {
              id: String(company.id),
              img: resolveCompanyLogoUrl(company),
              name: company.name || '-',
              legalName: company.legal_name || '-',
              email: company.email || '-',
              approvalStatus: (company.approval_status || 'pending').toLowerCase(),
              updatedAt: company.updated_at,
              createdAt: company.created_at,
              timezone: company.timezone || '-',
              membersCount: Number(company.members_count || 0),
              isActive: Boolean(company.is_active),
              addressLine1: company.address_line1 || '-',
              addressLine2: company.address_line2 || '-',
              postalCode: company.postal_code || '-',
              personalInfo: {
                  phoneNumber: company.phone || '-',
                  city: company.city || '-',
                  country: company.country || '-',
              },
          }
        : null

    return (
        <Loading loading={isLoading}>
            {!isLoading && isEmpty(company) && (
                <div className="h-full flex flex-col items-center justify-center">
                    <NoUserFound height={280} width={280} />
                    <h3 className="mt-8">No company found!</h3>
                </div>
            )}
            {!isLoading && detailsData && (
                <div className="flex flex-col xl:flex-row gap-4">
                    <div className="min-w-[330px] 2xl:min-w-[400px]">
                        <ProfileSection data={detailsData} />
                    </div>
                    <Card className="w-full">
                        <Tabs defaultValue="overview">
                            <TabList>
                                <TabNav value="overview">Overview</TabNav>
                                <TabNav value="activity">Activity</TabNav>
                            </TabList>
                            <div className="p-4">
                                <TabContent value="overview">
                                    <OverviewSection data={detailsData} />
                                </TabContent>
                                <TabContent value="activity">
                                    <ActivitySection
                                        companyName={detailsData.name}
                                        createdAt={detailsData.createdAt}
                                        updatedAt={detailsData.updatedAt}
                                    />
                                </TabContent>
                            </div>
                        </Tabs>
                    </Card>
                </div>
            )}
        </Loading>
    )
}

export default CompanyDetails
