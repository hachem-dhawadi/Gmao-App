import Button from '@/components/ui/Button'
import { TbCloudDownload, TbPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import { CSVLink } from 'react-csv'
import useWarehouseList from '../hooks/useWarehouseList'

const WarehouseListActionTools = () => {
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, [ADMIN, MANAGER])

    const { warehouseList } = useWarehouseList()

    const csvData = warehouseList.map((w) => ({
        Code: w.code,
        Name: w.name,
        Location: w.location ?? '',
    }))

    return (
        <div className="flex flex-col md:flex-row gap-3">
            <CSVLink
                className="w-full"
                filename="warehouses.csv"
                data={csvData}
            >
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
                        navigate(
                            '/concepts/inventory/warehouses/warehouse-create',
                        )
                    }
                >
                    Add Warehouse
                </Button>
            )}
        </div>
    )
}

export default WarehouseListActionTools
