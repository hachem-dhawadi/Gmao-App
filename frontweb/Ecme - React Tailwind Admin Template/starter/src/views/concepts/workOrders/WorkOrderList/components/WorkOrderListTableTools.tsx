import cloneDeep from 'lodash/cloneDeep'
import useWorkOrderList from '../hooks/useWorkOrderList'
import WorkOrderListSearch from './WorkOrderListSearch'
import WorkOrderListTableFilter from './WorkOrderListTableFilter'
import Button from '@/components/ui/Button'
import { TbUser } from 'react-icons/tb'

const WorkOrderListTableTools = () => {
    const { tableData, setTableData, filterData, setFilterData } = useWorkOrderList()

    const handleInputChange = (val: string) => {
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        setTableData(newTableData)
    }

    const toggleMyOnly = () => {
        setFilterData({ ...filterData, myOnly: !filterData.myOnly })
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <WorkOrderListSearch onInputChange={handleInputChange} />
            <div className="flex items-center gap-2">
                <Button
                    icon={<TbUser />}
                    onClick={toggleMyOnly}
                    className={filterData.myOnly ? 'border-primary ring-1 ring-primary text-primary' : ''}
                >
                    {filterData.myOnly ? 'My WOs' : 'All WOs'}
                </Button>
                <WorkOrderListTableFilter />
            </div>
        </div>
    )
}

export default WorkOrderListTableTools
