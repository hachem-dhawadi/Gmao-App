import { useState } from 'react'
import cloneDeep from 'lodash/cloneDeep'
import DebouceInput from '@/components/shared/DebouceInput'
import Button from '@/components/ui/Button'
import ItemTableFilter from './ItemTableFilter'
import BarcodeScanDialog from './BarcodeScanDialog'
import { TbSearch, TbBarcode } from 'react-icons/tb'
import useItemList from '../hooks/useItemList'
import { useTranslation } from 'react-i18next'

const ItemListTableTools = () => {
    const { tableData, setTableData } = useItemList()
    const { t } = useTranslation()
    const [scanOpen, setScanOpen] = useState(false)

    const handleInputChange = (val: string) => {
        const next = cloneDeep(tableData)
        next.query = val
        next.pageIndex = 1
        setTableData(next)
    }

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                    <DebouceInput
                        placeholder={t('inventory.searchPlaceholder')}
                        suffix={<TbSearch className="text-lg" />}
                        onChange={(e) => handleInputChange(e.target.value)}
                    />
                    <Button
                        variant="default"
                        icon={<TbBarcode />}
                        onClick={() => setScanOpen(true)}
                        title={t('inventory.scan')}
                    >
                        {t('common.scan')}
                    </Button>
                </div>
                <ItemTableFilter />
            </div>

            <BarcodeScanDialog
                isOpen={scanOpen}
                onClose={() => setScanOpen(false)}
            />
        </>
    )
}

export default ItemListTableTools
