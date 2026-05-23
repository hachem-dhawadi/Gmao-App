import ActionButton from './ActionButton'
import { useMailStore } from '../store/mailStore'
import { TbArrowLeft } from 'react-icons/tb'

const MailDetailTitle = () => {
    const { activeNotification, setActiveNotification } = useMailStore()

    return (
        <div className="flex items-center gap-2">
            <ActionButton onClick={() => setActiveNotification(null)}>
                <TbArrowLeft />
            </ActionButton>
            <h4 className="truncate">{activeNotification?.title}</h4>
        </div>
    )
}

export default MailDetailTitle
