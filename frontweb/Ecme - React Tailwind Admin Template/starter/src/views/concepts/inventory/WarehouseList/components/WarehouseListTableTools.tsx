import { useTranslation } from 'react-i18next'
import cloneDeep from 'lodash/cloneDeep'
import DebouceInput from '@/components/shared/DebouceInput'
import WarehouseListTableFilter from './WarehouseListTableFilter'
import { TbSearch } from 'react-icons/tb'
import useWarehouseList from '../hooks/useWarehouseList'

const WarehouseListTableTools = () => {
    const { t } = useTranslation()
    const { tableData, setTableData } = useWarehouseList()

    const handleInputChange = (val: string) => {
        const next = cloneDeep(tableData)
        next.query = val
        next.pageIndex = 1
        setTableData(next)
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex-1">
                <DebouceInput
                    placeholder={t('warehouse.search')}
                    suffix={<TbSearch className="text-lg" />}
                    onChange={(e) => handleInputChange(e.target.value)}
                />
            </div>
            <WarehouseListTableFilter />
        </div>
    )
}

export default WarehouseListTableTools
