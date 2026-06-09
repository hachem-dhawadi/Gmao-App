import useCustomerList from '../hooks/useCustomerList'
import CustomerListSearch from './CustomerListSearch'
import CustomerListTableFilter from './CustomerListTableFilter'
import cloneDeep from 'lodash/cloneDeep'

const CustomersListTableTools = () => {
    const { tableData, setTableData } = useCustomerList()

    const handleInputChange = (val: string) => {
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        if (val.length > 1 || val.length === 0) setTableData(newTableData)
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex-1">
                <CustomerListSearch onInputChange={handleInputChange} />
            </div>
            <CustomerListTableFilter />
        </div>
    )
}

export default CustomersListTableTools
