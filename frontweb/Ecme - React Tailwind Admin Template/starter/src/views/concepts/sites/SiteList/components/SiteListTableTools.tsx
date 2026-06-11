import cloneDeep from 'lodash/cloneDeep'
import SiteListSearch from './SiteListSearch'
import SiteListTableFilter from './SiteListTableFilter'
import useSiteList from '../hooks/useSiteList'

const SiteListTableTools = () => {
    const { tableData, setTableData } = useSiteList()

    const handleInputChange = (val: string) => {
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        setTableData(newTableData)
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
                <SiteListSearch onInputChange={handleInputChange} />
            </div>
            <SiteListTableFilter />
        </div>
    )
}

export default SiteListTableTools
