import Button from '@/components/ui/Button'
import { TbPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { useTranslation } from 'react-i18next'

const PmPlanListActionTools = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, ['pm_plans.write', 'admin', 'manager'])

    return (
        <div className="flex flex-col md:flex-row gap-3">
            {canCreate && (
                <Button
                    variant="solid"
                    icon={<TbPlus className="text-xl" />}
                    onClick={() => navigate('/concepts/pm/pm-create')}
                >
                    {t('pm.new')}
                </Button>
            )}
        </div>
    )
}

export default PmPlanListActionTools
