import Button from '@/components/ui/Button'
import { TbCloudDownload, TbPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { CSVLink } from 'react-csv'
import useSiteList from '../hooks/useSiteList'

const SiteListActionTools = () => {
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, ['sites.create', 'admin'])

    const { rawList } = useSiteList()

    const csvData = rawList.map((s) => ({
        Name: s.name,
        Code: s.code,
        Address: s.address ?? '',
        Description: s.description ?? '',
        Assets: s.assets_count,
        Members: s.members_count,
        Warehouses: s.warehouses_count,
    }))

    return (
        <div className="flex flex-col md:flex-row gap-3">
            <CSVLink className="w-full" filename="sites.csv" data={csvData}>
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
                    onClick={() => navigate('/concepts/sites/site-create')}
                >
                    Add Site
                </Button>
            )}
        </div>
    )
}

export default SiteListActionTools
