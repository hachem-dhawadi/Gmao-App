import Select from '@/components/ui/Select'
import useCustomerList from '../hooks/useCustomerList'
import CustomerListSearch from './CustomerListSearch'
import cloneDeep from 'lodash/cloneDeep'
import { useTranslation } from 'react-i18next'
import type { Filter } from '../types'

type Option = { value: string; label: string }

const CustomersListTableTools = () => {
    const { tableData, filterData, setTableData, setFilterData } = useCustomerList()
    const { t } = useTranslation()

    const statusOptions: Option[] = [
        { value: 'active',  label: t('members.status.active') },
        { value: 'blocked', label: t('members.status.blocked') },
    ]

    const handleInputChange = (val: string) => {
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        if (val.length > 1 || val.length === 0) setTableData(newTableData)
    }

    const handleStatusChange = (option: Option | null) => {
        setFilterData({
            ...filterData,
            status: (option?.value ?? 'all') as Filter['status'],
        })
    }

    const selectedStatus = statusOptions.find((o) => o.value === filterData.status) || null

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex-1">
                <CustomerListSearch onInputChange={handleInputChange} />
            </div>
            <div className="w-full md:w-40">
                <Select
                    isClearable
                    placeholder={t('common.status')}
                    options={statusOptions}
                    value={selectedStatus}
                    onChange={(opt) => handleStatusChange(opt as Option | null)}
                />
            </div>
        </div>
    )
}

export default CustomersListTableTools
