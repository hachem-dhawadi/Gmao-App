import { useSessionUser } from '@/store/authStore'
import { TbClockHour4, TbAlertCircle, TbBuildingPlus, TbSettings } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'

const PendingApprovalBanner = () => {
    const navigate = useNavigate()
    const companyApprovalStatus = useSessionUser((s) => s.user?.companyApprovalStatus)
    const isSuperadmin = useSessionUser((s) => s.user?.isSuperadmin)

    if (isSuperadmin || companyApprovalStatus === 'approved') return null

    const config = companyApprovalStatus === 'rejected'
        ? {
              bg: 'bg-red-600 dark:bg-red-700',
              icon: <TbAlertCircle className="text-base flex-shrink-0" />,
              text: 'Your company registration was rejected. Please update your information and resubmit.',
          }
        : companyApprovalStatus === 'pending'
          ? {
                bg: 'bg-blue-600 dark:bg-blue-700',
                icon: <TbClockHour4 className="text-base flex-shrink-0" />,
                text: 'Your company is pending approval from a superadmin. Full access will be unlocked once approved.',
            }
          : {
                bg: 'bg-amber-500 dark:bg-amber-600',
                icon: <TbBuildingPlus className="text-base flex-shrink-0" />,
                text: 'Please complete your company setup to unlock the platform.',
            }

    return (
        <div className={`${config.bg} text-white px-4 py-2.5 flex items-center justify-between gap-4 text-sm font-medium flex-shrink-0`}>
            <div className="flex items-center gap-2 min-w-0">
                {config.icon}
                <span>{config.text}</span>
            </div>
            <button
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg whitespace-nowrap flex-shrink-0 text-sm"
                onClick={() => navigate('/concepts/account/settings?view=company')}
            >
                <TbSettings className="text-base" />
                {companyApprovalStatus === null ? 'Set up company' : 'View status'}
            </button>
        </div>
    )
}

export default PendingApprovalBanner
