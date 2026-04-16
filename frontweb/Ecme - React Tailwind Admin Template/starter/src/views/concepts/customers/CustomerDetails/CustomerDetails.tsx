import { useMemo } from 'react'
import Loading from '@/components/shared/Loading'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import NoUserFound from '@/assets/svg/NoUserFound'
import {
    apiGetCompanyMemberById,
    apiGetSuperadminUserById,
    type CompanyMemberListItem,
    type CompanyMemberResponse,
    type SuperadminUserListItem,
    type SuperadminUserResponse,
} from '@/services/CustomersService'
import { useSessionUser } from '@/store/authStore'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { TbArrowNarrowLeft, TbPencil } from 'react-icons/tb'
import { useNavigate, useParams } from 'react-router-dom'

type DetailsMode = 'superadmin' | 'owner'

type CustomerDetailsData =
    | { mode: 'superadmin'; user: SuperadminUserListItem }
    | { mode: 'owner'; member: CompanyMemberListItem }

type DetailsRow = {
    label: string
    value: string
}

const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)

    if (parts.length === 0) {
        return { firstName: '-', lastName: '-' }
    }

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: parts[0] }
    }

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    }
}

const formatDateTime = (value?: string | null): string => {
    if (!value) {
        return '-'
    }

    const formatted = dayjs(value)
    return formatted.isValid() ? formatted.format('DD MMM YYYY, HH:mm') : '-'
}

const CustomerDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const isSuperadmin = useSessionUser((state) => Boolean(state.user.isSuperadmin))

    const { data, isLoading } = useSWR<CustomerDetailsData>(
        id ? ['/customers/details', id, isSuperadmin] : null,
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

    const detailRows = useMemo<DetailsRow[]>(() => {
        if (!data) {
            return []
        }

        if (data.mode === 'superadmin') {
            return [
                { label: 'User ID', value: String(data.user.id) },
                { label: 'Email', value: data.user.email || '-' },
                { label: 'Phone', value: data.user.phone || '-' },
                { label: 'Locale', value: data.user.locale || '-' },
                {
                    label: 'Last Login',
                    value: formatDateTime(data.user.last_login_at),
                },
                {
                    label: 'Created At',
                    value: formatDateTime(data.user.created_at),
                },
                {
                    label: 'Members Count',
                    value: String(data.user.members_count || 0),
                },
            ]
        }

        return [
            { label: 'Member ID', value: String(data.member.id) },
            { label: 'User ID', value: String(data.member.user_id) },
            { label: 'Company ID', value: String(data.member.company_id) },
            { label: 'Email', value: data.member.user?.email || '-' },
            { label: 'Phone', value: data.member.user?.phone || '-' },
            {
                label: 'Employee Code',
                value: data.member.employee_code || '-',
            },
            { label: 'Job Title', value: data.member.job_title || '-' },
            {
                label: 'Roles',
                value:
                    data.member.roles?.map((role) => role.label).join(', ') ||
                    '-',
            },
        ]
    }, [data])

    const meta = useMemo(() => {
        if (!data) {
            return {
                mode: 'owner' as DetailsMode,
                name: '-',
                avatar: '',
                roleLabel: '-',
                statusLabel: '-',
                statusClass: 'bg-gray-200 text-gray-800',
                firstName: '-',
                lastName: '-',
            }
        }

        if (data.mode === 'superadmin') {
            const fullName = data.user.name || ''
            const { firstName, lastName } = splitFullName(fullName)
            const isActive = Boolean(data.user.is_active)

            return {
                mode: 'superadmin' as DetailsMode,
                name: fullName || '-',
                avatar: data.user.avatar_url || data.user.avatar_path || '',
                roleLabel: data.user.is_superadmin ? 'Superadmin' : 'User',
                statusLabel: isActive ? 'Active' : 'Blocked',
                statusClass: isActive
                    ? 'bg-emerald-200 text-gray-900'
                    : 'bg-red-200 text-gray-900',
                firstName,
                lastName,
            }
        }

        const fullName = data.member.user?.name || ''
        const { firstName, lastName } = splitFullName(fullName)
        const isActive = (data.member.status || '').toLowerCase() === 'active'

        return {
            mode: 'owner' as DetailsMode,
            name: fullName || '-',
            avatar:
                data.member.user?.avatar_url || data.member.user?.avatar_path || '',
            roleLabel:
                data.member.roles?.[0]?.label || data.member.job_title || 'Member',
            statusLabel: isActive ? 'Active' : 'Blocked',
            statusClass: isActive
                ? 'bg-emerald-200 text-gray-900'
                : 'bg-red-200 text-gray-900',
            firstName,
            lastName,
        }
    }, [data])

    return (
        <Loading loading={isLoading}>
            {!isLoading && !data && (
                <div className="h-full flex flex-col items-center justify-center">
                    <NoUserFound height={280} width={280} />
                    <h3 className="mt-8">No user found.</h3>
                </div>
            )}
            {data && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Button
                            type="button"
                            variant="plain"
                            icon={<TbArrowNarrowLeft />}
                            onClick={() => navigate(-1)}
                        >
                            Back
                        </Button>
                        <Button
                            variant="solid"
                            icon={<TbPencil />}
                            onClick={() =>
                                navigate(`/concepts/customers/customer-edit/${id}`)
                            }
                        >
                            Edit
                        </Button>
                    </div>

                    <div className="flex flex-col xl:flex-row gap-4">
                        <Card className="xl:w-[360px]">
                            <div className="flex flex-col items-center gap-4">
                                <Avatar size={96} shape="circle" src={meta.avatar} />
                                <div className="text-center space-y-1">
                                    <h4>{meta.name}</h4>
                                    <p className="text-sm text-gray-500">
                                        {meta.roleLabel}
                                    </p>
                                </div>
                                <Tag className={meta.statusClass}>
                                    {meta.statusLabel}
                                </Tag>
                                <p className="text-xs text-gray-500">
                                    View mode:{' '}
                                    {meta.mode === 'superadmin'
                                        ? 'Superadmin User'
                                        : 'Company Member'}
                                </p>
                            </div>
                        </Card>

                        <Card className="flex-1">
                            <h5 className="mb-4">User Details</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        First Name
                                    </p>
                                    <p className="font-semibold">{meta.firstName}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        Last Name
                                    </p>
                                    <p className="font-semibold">{meta.lastName}</p>
                                </div>
                                {detailRows.map((row) => (
                                    <div key={row.label}>
                                        <p className="text-xs uppercase text-gray-500">
                                            {row.label}
                                        </p>
                                        <p className="font-semibold break-words">
                                            {row.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </Loading>
    )
}

export default CustomerDetails
