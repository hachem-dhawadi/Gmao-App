import Button from '@/components/ui/Button'
import { TbCloudDownload, TbUserPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import useCustomerList from '../hooks/useCustomerList'
import { CSVLink } from 'react-csv'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { useTranslation } from 'react-i18next'

const CustomerListActionTools = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()

    const { customerList } = useCustomerList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, ['members.create', 'admin', 'hr'])

    return (
        <div className="flex flex-col md:flex-row gap-3">
            <CSVLink
                className="w-full"
                filename="customerList.csv"
                data={customerList}
            >
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
                    icon={<TbUserPlus className="text-xl" />}
                    onClick={() =>
                        navigate('/concepts/customers/customer-create')
                    }
                >
                    {t('members.new')}
                </Button>
            )}
        </div>
    )
}

export default CustomerListActionTools
