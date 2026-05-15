import cloneDeep from 'lodash/cloneDeep'
import DebouceInput from '@/components/shared/DebouceInput'
import { TbSearch } from 'react-icons/tb'
import useWarehouseList from '../hooks/useWarehouseList'

const WarehouseListTableTools = () => {
    const { tableData, setTableData } = useWarehouseList()

    const handleInputChange = (val: string) => {
        const next = cloneDeep(tableData)
        next.query = val
        next.pageIndex = 1
        setTableData(next)
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <DebouceInput
                placeholder="Search by name, code, location…"
                suffix={<TbSearch className="text-lg" />}
                onChange={(e) => handleInputChange(e.target.value)}
            />
        </div>
    )
}

export default WarehouseListTableTools
