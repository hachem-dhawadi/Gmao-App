import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import Loading from '@/components/shared/Loading'
import ProfileSection, {
    type CompanyDetailsViewData,
} from './components/ProfileSection'
import BillingSection from './components/BillingSection'
import ActivitySection from './components/ActivitySection'
import {
    apiGetCompany,
    apiGetCompanyMembers,
    apiGetSuperadminUser,
    resolveCompanyLogoUrl,
    type SuperadminCompanyMembersResponse,
    type SuperadminCompanyResponse,
    type SuperadminUserResponse,
} from '@/services/CompaniesService'
import useSWR from 'swr'
import { useParams } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'
import dayjs from 'dayjs'

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

    const { data: membersResp, isLoading: membersLoading } = useSWR(
        id ? ['/superadmin/companies/members', id] : null,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, companyId]) =>
            apiGetCompanyMembers<SuperadminCompanyMembersResponse>(
                companyId as string,
                {
                    per_page: 100,
                },
            ),
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
        },
    )

    const company = data?.data?.company
    const members = membersResp?.data?.members || []

    const ownerMember =
        members.find(
            (member) => (member.job_title || '').toLowerCase() === 'owner',
        ) ||
        members.find((member) =>
            (member.roles || []).some(
                (role) => (role.code || '').toLowerCase() === 'admin',
            ),
        ) ||
        members[0]

    const ownerUserId = ownerMember?.user?.id

    const { data: ownerUserResp, isLoading: ownerUserLoading } = useSWR(
        ownerUserId
            ? ['/superadmin/users/details', String(ownerUserId)]
            : null,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, userId]) =>
            apiGetSuperadminUser<SuperadminUserResponse>(userId as string),
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
        },
    )

    const ownerUser = ownerUserResp?.data?.user || null

    const detailsData: CompanyDetailsViewData | null = company
        ? {
              id: String(company.id),
              img: resolveCompanyLogoUrl(company),
              name: company.name || '-',
              email: company.email || '-',
              lastOnline: dayjs(company.updated_at).unix(),
              approvalStatus: (company.approval_status || 'pending').toLowerCase(),
              isActive: Boolean(company.is_active),
              timezone: company.timezone || '-',
              addressLine1: company.address_line1 || '-',
              addressLine2: company.address_line2 || '-',
              city: company.city || '-',
              postalCode: company.postal_code || '-',
              country: company.country || '-',
              ownerName: ownerMember?.user?.name || '-',
              ownerEmail: ownerMember?.user?.email || '-',
              ownerPhone: ownerMember?.user?.phone || '-',
              createdAt: company.created_at,
              updatedAt: company.updated_at,
              personalInfo: {
                  location: company.city || '-',
                  title: company.legal_name || company.name || '-',
                  birthday: dayjs(company.created_at).format('DD MMM YYYY'),
                  phoneNumber: company.phone || '-',
                  facebook: '',
                  twitter: '',
                  pinterest: '',
                  linkedIn: '',
                  address: [company.address_line1, company.address_line2]
                      .filter(Boolean)
                      .join(', ') || '-',
                  postcode: company.postal_code || '-',
                  city: company.city || '-',
                  country: company.country || '-',
              },
          }
        : null

    const ownerRolesLabel = (ownerMember?.roles || [])
        .map((role) => role.label || role.code)
        .filter(Boolean)
        .join(', ')

    return (
        <Loading loading={isLoading || membersLoading || ownerUserLoading}>
            {!isEmpty(detailsData) && detailsData && company && (
                <div className="flex flex-col xl:flex-row gap-4">
                    <div className="min-w-[330px] 2xl:min-w-[400px]">
                        <ProfileSection data={detailsData} />
                    </div>
                    <Card className="w-full">
                        <Tabs defaultValue="companyInformation">
                            <TabList>
                                <TabNav value="companyInformation">
                                    Company information
                                </TabNav>
                                <TabNav value="owner">Owner</TabNav>
                            </TabList>
                            <div className="p-4">
                                <TabContent value="companyInformation">
                                    <BillingSection data={detailsData} />
                                </TabContent>
                                <TabContent value="owner">
                                    <ActivitySection
                                        ownerName={detailsData.ownerName || '-'}
                                        ownerEmail={detailsData.ownerEmail || '-'}
                                        ownerPhone={detailsData.ownerPhone || '-'}
                                        ownerJobTitle={ownerMember?.job_title || '-'}
                                        ownerEmployeeCode={ownerMember?.employee_code || '-'}
                                        ownerStatus={ownerMember?.status || '-'}
                                        ownerRoles={ownerRolesLabel || '-'}
                                        createdAt={company.created_at}
                                        updatedAt={company.updated_at}
                                        ownerDetails={ownerUser}
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
