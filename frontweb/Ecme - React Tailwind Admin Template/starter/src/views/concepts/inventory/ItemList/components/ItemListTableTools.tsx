import cloneDeep from 'lodash/cloneDeep'
import DebouceInput from '@/components/shared/DebouceInput'
import ItemTableFilter from './ItemTableFilter'
import { TbSearch } from 'react-icons/tb'
import useItemList from '../hooks/useItemList'

const ItemListTableTools = () => {
    const { tableData, setTableData } = useItemList()

    const handleInputChange = (val: string) => {
        const next = cloneDeep(tableData)
        next.query = val
        next.pageIndex = 1
        setTableData(next)
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <DebouceInput
                placeholder="Search by name, code, barcode…"
                suffix={<TbSearch className="text-lg" />}
                onChange={(e) => handleInputChange(e.target.value)}
            />
            <ItemTableFilter />
        </div>
    )
}

export default ItemListTableTools
