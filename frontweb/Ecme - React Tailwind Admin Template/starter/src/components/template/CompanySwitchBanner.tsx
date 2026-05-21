import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import { useCompanySwitchStore } from '@/store/companySwitchStore'
import { TbBuilding, TbX } from 'react-icons/tb'

const CompanySwitchBanner = () => {
    const navigate = useNavigate()
    const isSuperadmin = useSessionUser((s) => s.user?.isSuperadmin)
    const { activeCompany, exit } = useCompanySwitchStore()

    if (!isSuperadmin || !activeCompany) return null

    const handleExit = () => {
        exit()
        navigate('/dashboard')
    }

    return (
        <div className="bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 flex items-center justify-between gap-4 text-sm font-semibold flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
                <TbBuilding className="text-base flex-shrink-0" />
                <span className="truncate">
                    Superadmin — managing:{' '}
                    <strong>{activeCompany.name}</strong>
                </span>
            </div>
            <button
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg whitespace-nowrap flex-shrink-0"
                onClick={handleExit}
            >
                <TbX className="text-base" />
                Exit company
            </button>
        </div>
    )
}

export default CompanySwitchBanner
