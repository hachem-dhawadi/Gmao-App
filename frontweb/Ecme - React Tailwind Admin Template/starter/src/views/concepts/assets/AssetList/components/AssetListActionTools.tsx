import Button from '@/components/ui/Button'
import { TbCloudDownload, TbPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import { CSVLink } from 'react-csv'
import useAssetList from '../hooks/useAssetList'

const AssetListActionTools = () => {
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, [ADMIN, MANAGER])

    const { rawList } = useAssetList()

    const csvData = rawList.map((a) => ({
        Name: a.name,
        Code: a.code,
        Type: a.asset_type?.name ?? '',
        Status: a.status,
        'Serial Number': a.serial_number ?? '',
        Manufacturer: a.manufacturer ?? '',
        Model: a.model ?? '',
        Location: a.location ?? '',
        'Purchase Date': a.purchase_date ?? '',
        'Warranty End': a.warranty_end_at ?? '',
    }))

    return (
        <div className="flex flex-col md:flex-row gap-3">
            <CSVLink className="w-full" filename="assets.csv" data={csvData}>
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
                    onClick={() => navigate('/concepts/assets/asset-create')}
                >
                    Add Asset
                </Button>
            )}
        </div>
    )
}

export default AssetListActionTools
