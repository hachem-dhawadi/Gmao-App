import Button from '@/components/ui/Button'
import { TbCloudDownload, TbPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { CSVLink } from 'react-csv'
import useItemList from '../hooks/useItemList'
import { useTranslation } from 'react-i18next'

const ItemListActionTools = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, ['inventory.write', 'admin', 'manager'])

    const { itemList } = useItemList()

    const csvData = itemList.map((i) => ({
        Code: i.code,
        Name: i.name,
        Unit: i.unit ?? '',
        'Unit Cost': i.unit_cost ?? '',
        'Min Stock': i.min_stock ?? '',
        'Total Stock': i.total_stock,
        Barcode: i.barcode ?? '',
        Description: i.description ?? '',
    }))

    return (
        <div className="flex flex-col md:flex-row gap-3">
            <CSVLink className="w-full" filename="items.csv" data={csvData}>
                <Button
                    icon={<TbCloudDownload className="text-xl" />}
                    className="w-full"
                >
                    {t('common.download')}
                </Button>
            </CSVLink>
            {canCreate && (
                <Button
                    variant="solid"
                    icon={<TbPlus className="text-xl" />}
                    onClick={() =>
                        navigate('/concepts/inventory/items/item-create')
                    }
                >
                    {t('inventory.new')}
                </Button>
            )}
        </div>
    )
}

export default ItemListActionTools
