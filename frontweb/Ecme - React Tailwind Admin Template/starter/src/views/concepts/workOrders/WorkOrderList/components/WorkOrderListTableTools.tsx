import cloneDeep from 'lodash/cloneDeep'
import useWorkOrderList from '../hooks/useWorkOrderList'
import WorkOrderListSearch from './WorkOrderListSearch'
import WorkOrderListTableFilter from './WorkOrderListTableFilter'

const WorkOrderListTableTools = () => {
    const { tableData, setTableData } = useWorkOrderList()

    const handleInputChange = (val: string) => {
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        setTableData(newTableData)
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <WorkOrderListSearch onInputChange={handleInputChange} />
            <WorkOrderListTableFilter />
        </div>
    )
}

export default WorkOrderListTableTools
