import {
    apiGetCompaniesList,
    resolveCompanyLogoUrl,
    type SuperadminCompany,
    type SuperadminCompaniesResponse,
} from '@/services/CompaniesService'
import useSWR from 'swr'
import { useCustomerListStore } from '../store/customerListStore'
import type { Customer } from '../types'
import type { TableQueries } from '@/@types/common'

function toCustomer(company: SuperadminCompany): Customer {
    const companyName = company.name || company.legal_name || '-'

    return {
        id: String(company.id),
        name: companyName,
        firstName: company.name || '',
        lastName: company.legal_name || '',
        email: company.email || '-',
        img: resolveCompanyLogoUrl(company),
        role: 'Company',
        lastOnline: Date.now(),
        status: (company.approval_status || '').toLowerCase() || 'pending',
        personalInfo: {
            location: company.country || '-',
            title: '',
            birthday: '',
            phoneNumber: company.phone || '-',
            dialCode: '',
            address: company.address_line1 || '',
            postcode: company.postal_code || '',
            city: company.city || '-',
            country: company.country || '-',
            facebook: '',
            twitter: '',
            pinterest: '',
            linkedIn: '',
        },
        orderHistory: [],
        paymentMethod: [],
        subscription: [],
        totalSpending: Number(company.members_count || 0),
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

    const { data, error, isLoading, mutate } = useSWR(
        ['/superadmin/companies', { ...tableData, ...filterData }],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, params]) =>
            apiGetCompaniesList<SuperadminCompaniesResponse, TableQueries>(
                params,
            ),
        {
            revalidateOnFocus: false,
        },
    )

    const mappedCustomerList = (data?.data?.companies || []).map(toCustomer)

    const queryText = String(tableData.query || '')
        .trim()
        .toLowerCase()
    const modalNameText = String(filterData.companyName || '')
        .trim()
        .toLowerCase()
    const selectedStatuses = (filterData.companyStatus || []).map((status) =>
        status.toLowerCase(),
    )

    const customerList = mappedCustomerList.filter((customer) => {
        const searchable = [
            customer.name,
            customer.firstName,
            customer.lastName,
            customer.email,
            customer.personalInfo.phoneNumber,
            customer.personalInfo.country,
        ]
            .join(' ')
            .toLowerCase()

        const queryMatches = !queryText || searchable.includes(queryText)
        const nameMatches =
            !modalNameText || customer.name.toLowerCase().includes(modalNameText)
        const statusMatches =
            selectedStatuses.length === 0 ||
            selectedStatuses.includes((customer.status || '').toLowerCase())

        return queryMatches && nameMatches && statusMatches
    })

    const usingClientFilter =
        queryText.length > 0 ||
        modalNameText.length > 0 ||
        selectedStatuses.length > 0

    const customerListTotal = usingClientFilter
        ? customerList.length
        : (data?.data?.pagination?.total || 0)

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


