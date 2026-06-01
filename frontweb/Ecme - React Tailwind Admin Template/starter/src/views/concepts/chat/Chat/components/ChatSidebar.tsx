import ChatList from './ChatList'
import { useChatStore } from '../store/chatStore'
import classNames from '@/utils/classNames'

type Props = {
    onConversationCreated: () => void
}

const ChatSidebar = ({ onConversationCreated }: Props) => {
    const selectedConversation = useChatStore((state) => state.selectedConversation)

    return (
        <div
            className={classNames(
                'w-full md:w-[300px] md:block',
                selectedConversation.id && 'hidden',
            )}
        >
            <ChatList onConversationCreated={onConversationCreated} />
        </div>
    )
}

export default ChatSidebar
