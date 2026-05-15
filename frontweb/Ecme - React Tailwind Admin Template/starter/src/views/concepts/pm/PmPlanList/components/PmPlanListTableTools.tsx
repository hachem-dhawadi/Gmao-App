import cloneDeep from 'lodash/cloneDeep'
import usePmPlanList from '../hooks/usePmPlanList'
import PmPlanListSearch from './PmPlanListSearch'
import PmPlanListTableFilter from './PmPlanListTableFilter'

const PmPlanListTableTools = () => {
    const { tableData, setTableData } = usePmPlanList()

    const handleInputChange = (val: string) => {
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        setTableData(newTableData)
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <PmPlanListSearch onInputChange={handleInputChange} />
            <PmPlanListTableFilter />
        </div>
    )
}

export default PmPlanListTableTools
