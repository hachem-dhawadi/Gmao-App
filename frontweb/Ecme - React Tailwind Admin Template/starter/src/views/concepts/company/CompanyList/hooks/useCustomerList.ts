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
    return {
        id: String(company.id),
        name: company.legal_name || company.name || '-',
        firstName: company.name,
        lastName: '',
        email: company.email || '-',
        img: resolveCompanyLogoUrl(company),
        role: 'Company',
        lastOnline: Date.now(),
        status: (company.approval_status || '').toLowerCase(),
        personalInfo: {
            location: company.city || '-',
            title: '',
            birthday: '',
            phoneNumber: company.phone || '-',
            dialCode: '',
            address: company.address_line1 || '',
            postcode: company.postal_code || '',
            city: company.city || '-',
            country: company.country || '',
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

    const customerList = (data?.data?.companies || []).map(toCustomer)

    const customerListTotal = data?.data?.pagination?.total || 0

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
