import Button from '@/components/ui/Button'
import { TbCloudDownload, TbPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import { CSVLink } from 'react-csv'
import useItemList from '../hooks/useItemList'

const ItemListActionTools = () => {
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, [ADMIN, MANAGER])

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
                    Download
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
                    Add Item
                </Button>
            )}
        </div>
    )
}

export default ItemListActionTools
