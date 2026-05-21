import useSWR from 'swr'
import {
    apiGetUsersList,
    type SuperadminUser,
    type SuperadminUsersResponse,
} from '@/services/CompaniesService'
import { useUserListStore } from '../store/userListStore'
import type { Customer } from '../types'
import type { TableQueries } from '@/@types/common'

const backendBase = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')

function resolveAvatarUrl(user: SuperadminUser): string {
    if (!user.avatar_path) return ''
    if (user.avatar_path.startsWith('http')) return user.avatar_path
    return `${backendBase}/storage/${user.avatar_path.replace(/^\/+/, '')}`
}

function toCustomer(user: SuperadminUser): Customer {
    return {
        id: String(user.id),
        name: user.name || '—',
        firstName: user.name || '',
        lastName: '',
        email: user.email || '—',
        img: resolveAvatarUrl(user),
        role: user.is_superadmin ? 'Superadmin' : 'User',
        isSuperadmin: user.is_superadmin,
        lastOnline: Date.now(),
        status: user.is_active ? 'active' : 'inactive',
        membersCount: user.members_count ?? 0,
        personalInfo: {
            location: '',
            title: '',
            birthday: '',
            phoneNumber: user.phone || '',
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
        totalSpending: user.members_count ?? 0,
    }
}

export default function useUserList() {
    const {
        tableData,
        filterData,
        setTableData,
        selectedCustomer,
        setSelectedCustomer,
        setSelectAllCustomer,
        setFilterData,
    } = useUserListStore()

    const { data, error, isLoading, mutate } = useSWR(
        ['/superadmin/users', { ...tableData, ...filterData }],
        ([_, params]) =>
            apiGetUsersList<SuperadminUsersResponse, TableQueries>(params as TableQueries),
        { revalidateOnFocus: false },
    )

    const allUsers = (data?.data?.users || []).map(toCustomer)

    const queryText = String(tableData.query || '').trim().toLowerCase()
    const selectedRoles = filterData.userRole.map((r) => r.toLowerCase())
    const selectedStatuses = filterData.userStatus.map((s) => s.toLowerCase())

    const customerList = allUsers.filter((u) => {
        const searchable = [u.name, u.email, u.personalInfo.phoneNumber].join(' ').toLowerCase()
        const queryMatch = !queryText || searchable.includes(queryText)
        const roleMatch = selectedRoles.length === 0 || selectedRoles.includes(u.role.toLowerCase())
        const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(u.status)
        return queryMatch && roleMatch && statusMatch
    })

    const usingFilter = queryText.length > 0 || selectedRoles.length > 0 || selectedStatuses.length > 0
    const customerListTotal = usingFilter ? customerList.length : (data?.data?.pagination?.total || 0)

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
