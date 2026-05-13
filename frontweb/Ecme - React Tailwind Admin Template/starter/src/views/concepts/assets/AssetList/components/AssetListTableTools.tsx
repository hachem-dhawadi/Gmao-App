import cloneDeep from 'lodash/cloneDeep'
import useAssetList from '../hooks/useAssetList'
import AssetListSearch from './AssetListSearch'
import AssetListTableFilter from './AssetListTableFilter'

const AssetListTableTools = () => {
    const { tableData, setTableData } = useAssetList()

    const handleInputChange = (val: string) => {
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        setTableData(newTableData)
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <AssetListSearch onInputChange={handleInputChange} />
            <AssetListTableFilter />
        </div>
    )
}

export default AssetListTableTools
