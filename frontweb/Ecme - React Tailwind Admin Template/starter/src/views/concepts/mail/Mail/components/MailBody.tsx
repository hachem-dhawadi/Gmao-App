import AdaptiveCard from '@/components/shared/AdaptiveCard'
import MailList from './MailList'
import MailSidebar from './MailSidebar'
import MailDetail from './MailDetail'
import MailBodyTop from './MailBodyTop'
import { useMailStore } from '../store/mailStore'

const MailBody = () => {
    const { activeNotification } = useMailStore()

    return (
        <AdaptiveCard
            className="h-full border-0"
            bodyClass="h-full flex flex-col"
        >
            <div className="flex flex-auto h-full">
                <MailSidebar />
                <div className="lg:ltr:pl-6 lg:rtl:pr-6 flex-1">
                    <MailBodyTop />
                    <div className="relative h-[calc(100%-70px)]">
                        {activeNotification ? (
                            <MailDetail />
                        ) : (
                            <MailList />
                        )}
                    </div>
                </div>
            </div>
        </AdaptiveCard>
    )
}

export default MailBody
