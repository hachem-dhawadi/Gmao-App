import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import { useMailStore } from '../store/mailStore'
import useNotifications from '../hooks/useMail'
import useResponsive from '@/utils/hooks/useResponsive'
import { TbChecks, TbMenu2 } from 'react-icons/tb'

const MailBodyTop = () => {
    const { t } = useTranslation()
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
                    {t('mail.markAllRead')}
                </Button>
            )}
        </div>
    )
}

export default MailBodyTop
