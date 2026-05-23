import Select from '@/components/ui/Select'
import useCustomerList from '../hooks/useCustomerList'
import CustomerListSearch from './CustomerListSearch'
import cloneDeep from 'lodash/cloneDeep'
import type { Filter } from '../types'

type Option = { value: string; label: string }

const statusOptions: Option[] = [
    { value: 'active', label: 'Active' },
    { value: 'blocked', label: 'Inactive' },
]

const CustomersListTableTools = () => {
    const { tableData, filterData, setTableData, setFilterData } = useCustomerList()

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
                    placeholder="Status"
                    options={statusOptions}
                    value={selectedStatus}
                    onChange={(opt) => handleStatusChange(opt as Option | null)}
                />
            </div>
        </div>
    )
}

export default CustomersListTableTools
