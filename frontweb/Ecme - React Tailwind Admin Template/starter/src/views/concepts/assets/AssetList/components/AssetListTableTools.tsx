import { useState } from 'react'
import cloneDeep from 'lodash/cloneDeep'
import useAssetList from '../hooks/useAssetList'
import AssetListSearch from './AssetListSearch'
import AssetListTableFilter from './AssetListTableFilter'
import QrScanDialog from './QrScanDialog'
import Button from '@/components/ui/Button'
import { TbQrcode } from 'react-icons/tb'
import { useTranslation } from 'react-i18next'

const AssetListTableTools = () => {
    const { tableData, setTableData } = useAssetList()
    const { t } = useTranslation()
    const [scanOpen, setScanOpen] = useState(false)

    const handleInputChange = (val: string) => {
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        setTableData(newTableData)
    }

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <AssetListSearch onInputChange={handleInputChange} />
                <div className="flex items-center gap-2">
                    <Button icon={<TbQrcode />} onClick={() => setScanOpen(true)}>
                        {t('assets.scan')}
                    </Button>
                    <AssetListTableFilter />
                </div>
            </div>
            <QrScanDialog isOpen={scanOpen} onClose={() => setScanOpen(false)} />
        </>
    )
}

export default AssetListTableTools
