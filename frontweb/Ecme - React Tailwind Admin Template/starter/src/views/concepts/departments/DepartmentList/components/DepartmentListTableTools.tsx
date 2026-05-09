import cloneDeep from 'lodash/cloneDeep'
import useDepartmentList from '../hooks/useDepartmentList'
import DepartmentListSearch from './DepartmentListSearch'
import DepartmentListTableFilter from './DepartmentListTableFilter'

const DepartmentListTableTools = () => {
    const { tableData, setTableData } = useDepartmentList()

    const handleInputChange = (val: string) => {
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        setTableData(newTableData)
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <DepartmentListSearch onInputChange={handleInputChange} />
            <DepartmentListTableFilter />
        </div>
    )
}

export default DepartmentListTableTools
