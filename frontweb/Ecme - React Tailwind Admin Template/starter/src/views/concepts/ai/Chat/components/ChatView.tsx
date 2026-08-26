import { useRef, useEffect, useMemo } from 'react'
import Card from '@/components/ui/Card'
import ChatBox from '@/components/view/ChatBox'
import ChatLandingView from './ChatLandingView'
import ChatMobileNav from './ChatMobileNav'
import ChatCustomContent from './ChatCustomContent'
import ChatCustomAction from './ChatCustomAction'
import ChatActionCard from './ChatActionCard'
import { usGenerativeChatStore } from '../store/generativeChatStore'
import useChatSend from '../hooks/useChatSend'
import type { ScrollBarRef } from '@/components/view/ChatBox'

const ChatView = () => {
    const scrollRef = useRef<ScrollBarRef>(null)
    const { selectedConversation, chatHistory, isTyping, disabledChatFresh } =
        usGenerativeChatStore()
    const { handleSend } = useChatSend()

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [selectedConversation, chatHistory])

    const messageList = useMemo(() => {
        const chat = chatHistory.find(
            (chat) => chat.id === selectedConversation,
        )
        return (chat?.conversation || []).map((msg) =>
            msg.sender.id === 'ai'
                ? { ...msg, sender: { ...msg.sender, avatarImageUrl: '/ailogo.jpg' } }
                : msg,
        )
    }, [selectedConversation, chatHistory])

    const handleInputChange = async ({
        value,
        attachments,
    }: {
        value: string
        attachments?: File[]
    }) => {
        await handleSend(value, attachments)
    }

    const handleFinish = (id: string) => {
        disabledChatFresh(id)
        scrollToBottom()
    }

    return (
        <Card className="flex-1 h-full" bodyClass="h-full">
            <ChatMobileNav />
            <ChatBox
                ref={scrollRef}
                messageList={messageList}
                placeholder="Ask me anything about maintenance..."
                showMessageList={Boolean(selectedConversation)}
                showAvatar={true}
                avatarGap={true}
                containerClass="h-[calc(100%-30px)] xl:h-full"
                messageListClass="h-[calc(100%-100px)] xl:h-[calc(100%-70px)]"
                typing={
                    isTyping
                        ? {
                              id: 'ai',
                              name: 'AI Assistant',
                              avatarImageUrl: '/ailogo.jpg',
                          }
                        : false
                }
                customRenderer={(message) => {
                    if (message.sender.id === 'ai') {
                        return (
                            <>
                                <ChatCustomContent
                                    content={message.content as string}
                                    triggerTyping={
                                        message.fresh ? message.fresh : false
                                    }
                                    onFinish={() => handleFinish(message.id)}
                                />
                                {message.actionData && (
                                    <ChatActionCard actionData={message.actionData} messageId={message.id} />
                                )}
                            </>
                        )
                    }

                    const imgAttachment = message.attachments?.find(
                        (a) => a.type === 'image',
                    )
                    return (
                        <div className="flex flex-col gap-1">
                            {imgAttachment && (
                                <img
                                    src={imgAttachment.mediaUrl}
                                    alt="attachment"
                                    className="max-w-[200px] rounded-lg border border-white/20 object-cover"
                                />
                            )}
                            {message.content && (
                                <span>{message.content as string}</span>
                            )}
                        </div>
                    )
                }}
                customAction={(message) => {
                    if (message.sender.id === 'ai') {
                        return (
                            <ChatCustomAction
                                content={message.content as string}
                            />
                        )
                    }

                    return null
                }}
                onInputChange={handleInputChange}
            >
                {!selectedConversation && <ChatLandingView />}
            </ChatBox>
        </Card>
    )
}

export default ChatView
