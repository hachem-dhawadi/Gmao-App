import Button from '@/components/ui/Button'
import { useMailStore } from '../store/mailStore'
import useNotifications from '../hooks/useMail'
import { TbMailOpened } from 'react-icons/tb'

const MailDetailAction = () => {
    const { activeNotification } = useMailStore()
    const { handleMarkRead } = useNotifications()

    if (!activeNotification || activeNotification.read) return null

    return (
        <Button
            size="sm"
            icon={<TbMailOpened />}
            onClick={() => handleMarkRead(activeNotification.id)}
        >
            Mark read
        </Button>
    )
}

export default MailDetailAction
