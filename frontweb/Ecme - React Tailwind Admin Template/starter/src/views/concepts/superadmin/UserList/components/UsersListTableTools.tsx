import Select from '@/components/ui/Select'
import useUserList from '../hooks/useUserList'
import UserListSearch from './UserListSearch'
import cloneDeep from 'lodash/cloneDeep'
import type { Filter } from '../types'

type Option = { value: string; label: string }

const roleOptions: Option[] = [
    { value: 'superadmin', label: 'Superadmin' },
    { value: 'user', label: 'User' },
]

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

    const handleRoleChange = (options: Option[]) => {
        const newFilter: Filter = {
            ...filterData,
            userRole: options.map((o) => o.value) as Filter['userRole'],
        }
        setFilterData(newFilter)
    }

    const handleStatusChange = (options: Option[]) => {
        const newFilter: Filter = {
            ...filterData,
            userStatus: options.map((o) => o.value) as Filter['userStatus'],
        }
        setFilterData(newFilter)
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex-1">
                <UserListSearch onInputChange={handleSearch} />
            </div>
            <div className="w-full md:w-44">
                <Select
                    isMulti
                    placeholder="Role"
                    options={roleOptions}
                    value={roleOptions.filter((o) =>
                        filterData.userRole.includes(o.value as Filter['userRole'][number]),
                    )}
                    onChange={(selected) => handleRoleChange((selected as Option[]) || [])}
                />
            </div>
            <div className="w-full md:w-44">
                <Select
                    isMulti
                    placeholder="Status"
                    options={statusOptions}
                    value={statusOptions.filter((o) =>
                        filterData.userStatus.includes(o.value as Filter['userStatus'][number]),
                    )}
                    onChange={(selected) => handleStatusChange((selected as Option[]) || [])}
                />
            </div>
        </div>
    )
}

export default UsersListTableTools
