import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import { useMailStore } from '../store/mailStore'
import useNotifications from '../hooks/useMail'
import { TbMailOpened } from 'react-icons/tb'

const MailDetailAction = () => {
    const { t } = useTranslation()
    const { activeNotification } = useMailStore()
    const { handleMarkRead } = useNotifications()

    if (!activeNotification || activeNotification.read) return null

    return (
        <Button
            size="sm"
            icon={<TbMailOpened />}
            onClick={() => handleMarkRead(activeNotification.id)}
        >
            {t('mail.markRead')}
        </Button>
    )
}

export default MailDetailAction
