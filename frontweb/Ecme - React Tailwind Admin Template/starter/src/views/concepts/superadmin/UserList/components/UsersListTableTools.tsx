import Select from '@/components/ui/Select'
import useUserList from '../hooks/useUserList'
import UserListSearch from './UserListSearch'
import cloneDeep from 'lodash/cloneDeep'
import type { Filter } from '../types'

type Option = { value: string; label: string }

const statusOptions: Option[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
]

const UsersListTableTools = () => {
    const { tableData, filterData, setTableData, setFilterData } = useUserList()

    const handleSearch = (val: string) => {
        const newData = cloneDeep(tableData)
        newData.query = val
        newData.pageIndex = 1
        setTableData(newData)
    }

    const handleStatusChange = (option: Option | null) => {
        setFilterData({
            ...filterData,
            userStatus: option
                ? [option.value as Filter['userStatus'][number]]
                : [],
        })
    }

    const selectedStatus = statusOptions.find(
        (o) => filterData.userStatus.length > 0 && filterData.userStatus[0] === o.value,
    ) || null

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex-1">
                <UserListSearch onInputChange={handleSearch} />
            </div>
            <div className="w-full md:w-44">
                <Select
                    isClearable
                    placeholder="Status"
                    options={statusOptions}
                    value={selectedStatus}
                    onChange={(selected) => handleStatusChange(selected as Option | null)}
                />
            </div>
        </div>
    )
}

export default UsersListTableTools
