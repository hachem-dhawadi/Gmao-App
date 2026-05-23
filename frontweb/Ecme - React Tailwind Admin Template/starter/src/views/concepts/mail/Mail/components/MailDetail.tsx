import Card from '@/components/ui/Card'
import MailDetailTitle from './MailDetailTitle'
import MailDetailContent from './MailDetailContent'
import MailDetailAction from './MailDetailAction'
import { useMailStore } from '../store/mailStore'

const MailDetail = () => {
    const { activeNotification } = useMailStore()

    if (!activeNotification) return null

    return (
        <Card
            className="flex-1 h-full max-h-full dark:border-gray-700"
            bodyClass="h-full relative"
            header={{
                content: <MailDetailTitle />,
                extra: <MailDetailAction />,
                className: 'bg-gray-100 dark:bg-gray-700 h-[70px]',
            }}
        >
            <MailDetailContent />
        </Card>
    )
}

export default MailDetail
