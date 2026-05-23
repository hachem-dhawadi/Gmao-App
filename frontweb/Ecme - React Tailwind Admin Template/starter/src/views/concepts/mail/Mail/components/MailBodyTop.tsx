import Button from '@/components/ui/Button'
import { useMailStore } from '../store/mailStore'
import useNotifications from '../hooks/useMail'
import useResponsive from '@/utils/hooks/useResponsive'
import { TbChecks, TbMenu2 } from 'react-icons/tb'

const MailBodyTop = () => {
    const { notifications, toggleMobileSidebar } = useMailStore()
    const { handleMarkAllRead } = useNotifications()
    const { smaller } = useResponsive()

    const hasUnread = notifications.some((n) => !n.read)

    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                {smaller.xl && (
                    <button
                        className="close-button"
                        type="button"
                        onClick={() => toggleMobileSidebar(true)}
                    >
                        <TbMenu2 />
                    </button>
                )}
            </div>
            {hasUnread && (
                <Button
                    size="sm"
                    variant="solid"
                    icon={<TbChecks />}
                    onClick={handleMarkAllRead}
                >
                    Mark all read
                </Button>
            )}
        </div>
    )
}

export default MailBodyTop
