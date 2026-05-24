import Button from '@/components/ui/Button'
import { TbCloudDownload, TbPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { CSVLink } from 'react-csv'
import useAssetList from '../hooks/useAssetList'
import { useTranslation } from 'react-i18next'

const AssetListActionTools = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, ['assets.write', 'admin', 'manager'])

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
                    {t('common.download')}
                </Button>
            </CSVLink>
            {canCreate && (
                <Button
                    variant="solid"
                    icon={<TbPlus className="text-xl" />}
                    onClick={() => navigate('/concepts/assets/asset-create')}
                >
                    {t('assets.new')}
                </Button>
            )}
        </div>
    )
}

export default AssetListActionTools
