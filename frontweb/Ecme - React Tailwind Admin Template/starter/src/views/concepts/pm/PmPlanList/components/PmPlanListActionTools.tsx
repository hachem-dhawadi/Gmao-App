import Button from '@/components/ui/Button'
import { TbPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'

const PmPlanListActionTools = () => {
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, [ADMIN, MANAGER])

    return (
        <div className="flex flex-col md:flex-row gap-3">
            {canCreate && (
                <Button
                    variant="solid"
                    icon={<TbPlus className="text-xl" />}
                    onClick={() => navigate('/concepts/pm/pm-create')}
                >
                    New PM Plan
                </Button>
            )}
        </div>
    )
}

export default PmPlanListActionTools
