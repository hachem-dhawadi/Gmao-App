import {
    apiGetCompanyMembersList,
    apiGetSuperadminUsersList,
    type CompanyMemberListItem,
    type CompanyMembersListResponse,
    type SuperadminUserListItem,
    type SuperadminUsersListResponse,
} from '@/services/CustomersService'
import { CURRENT_COMPANY_ID_KEY } from '@/constants/app.constant'
import { useSessionUser } from '@/store/authStore'
import useSWR from 'swr'
import { useCustomerListStore } from '../store/customerListStore'
import type { Customer } from '../types'

type ListQueryParams = {
    page?: number
    per_page?: number
    site_id?: number
}

const toNameParts = (name: string) => {
    const trimmed = name.trim()

    if (!trimmed) {
        return {
            firstName: '',
            lastName: '',
        }
    }

    const parts = trimmed.split(/\s+/)

    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' '),
    }
}

const toStatus = (
    value: string | boolean | null | undefined,
): 'active' | 'blocked' => {
    if (typeof value === 'boolean') {
        return value ? 'active' : 'blocked'
    }

    return String(value || '').toLowerCase() === 'active'
        ? 'active'
        : 'blocked'
}

function toCustomerFromSuperadminUser(user: SuperadminUserListItem): Customer {
    const name = user.name || '-'
    const { firstName, lastName } = toNameParts(name)

    return {
        id: String(user.id),
        userId: String(user.id),
        name,
        firstName,
        lastName,
        email: user.email || '-',
        img: user.avatar_url || user.avatar_path || '',
        role: user.is_superadmin ? 'Superadmin' : 'User',
        lastOnline: Date.now(),
        status: toStatus(user.is_active),
        personalInfo: {
            location: user.locale || '-',
            title: '',
            birthday: '',
            phoneNumber: user.phone || '-',
            dialCode: '',
            address: '',
            postcode: '',
            city: '',
            country: '',
            facebook: '',
            twitter: '',
            pinterest: '',
            linkedIn: '',
        },
        orderHistory: [],
        paymentMethod: [],
        subscription: [],
        totalSpending: Number(user.members_count || 0),
    }
}

function toCustomerFromMember(member: CompanyMemberListItem): Customer {
    const user = member.user
    const name = user?.name || `Member #${member.id}`
    const { firstName, lastName } = toNameParts(name)

    return {
        id: String(member.id),
        userId: String(user?.id || member.user_id || ''),
        name,
        firstName,
        lastName,
        email: user?.email || '-',
        img: user?.avatar_url || user?.avatar_path || '',
        role: member.roles?.[0]?.label || member.job_title || 'Member',
        lastOnline: Date.now(),
        status: toStatus(member.status),
        site_id: member.site_id ?? null,
        siteName: member.site ? `${member.site.name} (${member.site.code})` : null,
        sites: member.sites ?? [],
        personalInfo: {
            location: '-',
            title: member.job_title || '',
            birthday: '',
            phoneNumber: user?.phone || '-',
            dialCode: '',
            address: '',
            postcode: '',
            city: '',
            country: '',
            facebook: '',
            twitter: '',
            pinterest: '',
            linkedIn: '',
        },
        orderHistory: [],
        paymentMethod: [],
        subscription: [],
        totalSpending: 0,
    }
}

export default function useCustomerList() {
    const {
        tableData,
        filterData,
        setTableData,
        selectedCustomer,
        setSelectedCustomer,
        setSelectAllCustomer,
        setFilterData,
    } = useCustomerListStore((state) => state)

    const isSuperadmin = useSessionUser((state) => Boolean(state.user.isSuperadmin))
    const sessionUserId = useSessionUser((state) => state.user.userId || '')
    const normalizedSessionUserId = String(sessionUserId || '').trim()
    const currentCompanyId = localStorage.getItem(CURRENT_COMPANY_ID_KEY) || ''

    const queryParams: ListQueryParams = {
        page: Number(tableData.pageIndex || 1),
        per_page: Number(tableData.pageSize || 10),
    }

    if (!isSuperadmin && filterData.site_id != null) {
        queryParams.site_id = filterData.site_id
    }

    const { data, error, isLoading, mutate } = useSWR(
        [
            isSuperadmin ? '/superadmin/users' : '/members',
            sessionUserId,
            currentCompanyId,
            tableData.pageIndex,
            tableData.pageSize,
            filterData.site_id,
        ],
        () =>
            isSuperadmin
                ? apiGetSuperadminUsersList<
                      SuperadminUsersListResponse,
                      ListQueryParams
                  >(queryParams)
                : apiGetCompanyMembersList<
                      CompanyMembersListResponse,
                      ListQueryParams
                  >(queryParams),
        {
            revalidateOnFocus: false,
        },
    )

    const mappedCustomerList = isSuperadmin
        ? (data as SuperadminUsersListResponse | undefined)
              ?.data?.users?.map(toCustomerFromSuperadminUser) || []
        : (data as CompanyMembersListResponse | undefined)
              ?.data?.members?.map(toCustomerFromMember) || []

    const queryText = String(tableData.query || '').trim().toLowerCase()
    const statusFilter = filterData.status || 'all'

    const customerList = mappedCustomerList.filter((customer) => {
        if (
            !isSuperadmin &&
            normalizedSessionUserId &&
            customer.userId === normalizedSessionUserId
        ) {
            return false
        }

        const searchable = [
            customer.name,
            customer.email,
            customer.personalInfo.phoneNumber,
            customer.role,
        ]
            .join(' ')
            .toLowerCase()

        const queryMatches = !queryText || searchable.includes(queryText)
        const statusMatches = statusFilter === 'all' || customer.status === statusFilter

        return queryMatches && statusMatches
    })

    const usingClientFilter = queryText.length > 0 || statusFilter !== 'all' || filterData.site_id != null

    const apiTotal = isSuperadmin
        ? (data as SuperadminUsersListResponse | undefined)?.data?.pagination
              ?.total || 0
        : (data as CompanyMembersListResponse | undefined)?.data?.pagination
              ?.total || 0

    const adjustedApiTotal =
        !isSuperadmin && normalizedSessionUserId
            ? Math.max(0, apiTotal - 1)
            : apiTotal

    const customerListTotal = usingClientFilter
        ? customerList.length
        : adjustedApiTotal

    return {
        customerList,
        customerListTotal,
        error,
        isLoading,
        tableData,
        filterData,
        mutate,
        setTableData,
        selectedCustomer,
        setSelectedCustomer,
        setSelectAllCustomer,
        setFilterData,
    }
}
