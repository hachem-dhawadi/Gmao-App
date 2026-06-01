import Card from '@/components/ui/Card'
import ChatSidebar from './components/ChatSidebar'
import ChatBody from './components/ChatBody'
import useChat from './hooks/useChat'

const Chat = () => {
    const { fetchConversations } = useChat()

    return (
        <Card className="h-full border-0" bodyClass="h-full flex flex-col">
            <div className="flex flex-auto h-full gap-4">
                <ChatSidebar onConversationCreated={fetchConversations} />
                <ChatBody />
            </div>
        </Card>
    )
}

export default Chat
