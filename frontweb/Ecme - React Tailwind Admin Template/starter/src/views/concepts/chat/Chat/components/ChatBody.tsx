import { useRef, useEffect, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import ChatBox from '@/components/view/ChatBox'
import StartConverstation from '@/assets/svg/StartConverstation'
import ConversationInfoPanel from './ConversationInfoPanel'
import { useChatStore } from '../store/chatStore'
import { apiSendMessage } from '@/services/ChatService'
import classNames from '@/utils/classNames'
import useResponsive from '@/utils/hooks/useResponsive'
import { TbChevronLeft, TbUsers, TbInfoCircle } from 'react-icons/tb'
import type { ScrollBarRef } from '@/components/view/ChatBox'

const ChatBody = () => {
    const scrollRef = useRef<ScrollBarRef>(null)

    const selectedConversation = useChatStore((state) => state.selectedConversation)
    const messages             = useChatStore((state) => state.messages)
    const messagesLoading      = useChatStore((state) => state.messagesLoading)
    const pushMessage          = useChatStore((state) => state.pushMessage)
    const updateConversationLastMessage = useChatStore((state) => state.updateConversationLastMessage)
    const setSelectedConversation = useChatStore((state) => state.setSelectedConversation)

    const { smaller } = useResponsive()
    const [sending, setSending] = useState(false)
    const [infoOpen, setInfoOpen] = useState(false)

    const scrollToBottom = () => {
        // requestAnimationFrame ensures the DOM has painted before we scroll
        requestAnimationFrame(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
        })
    }

    useEffect(() => {
        if (messages.length > 0) scrollToBottom()
    }, [messages.length])

    const handleInputChange = async ({
        value,
        attachments,
    }: {
        value: string
        attachments?: File[]
    }) => {
        if (!selectedConversation.id || (!value.trim() && !attachments?.length)) return
        setSending(true)
        try {
            const resp = await apiSendMessage(
                selectedConversation.id,
                value,
                attachments,
            )
            const msg = resp.data.message
            pushMessage(msg)
            updateConversationLastMessage(selectedConversation.id, msg)
            scrollToBottom()
        } finally {
            setSending(false)
        }
    }

    // Map backend messages to ChatBox format
    const messageList = messages.map((msg) => ({
        id:        String(msg.id),
        sender: {
            id:              String(msg.sender.id),
            name:            msg.sender.name ?? 'Unknown',
            avatarImageUrl:  msg.sender.avatar ?? undefined,
        },
        content:     msg.body ?? '',
        attachments: msg.attachments.map((a) => ({
            type:     a.mime_type?.startsWith('image/') ? 'image' as const : 'misc' as const,
            source:   new File([], a.original_name),
            mediaUrl: a.url,
        })),
        timestamp:   new Date(msg.created_at),
        type:        'regular' as const,
        isMyMessage: msg.is_mine,
        showAvatar:  !msg.is_mine,
    }))

    const cardHeaderContent = selectedConversation.id ? (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
                {smaller.md && (
                    <button className="text-xl hover:text-primary" onClick={() => setSelectedConversation({})}>
                        <TbChevronLeft />
                    </button>
                )}
                <div className="flex items-center gap-2">
                    {selectedConversation.type === 'group' ? (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <TbUsers className="text-xl" />
                        </div>
                    ) : (
                        <Avatar src={selectedConversation.avatar ?? undefined}>
                            {!selectedConversation.avatar
                                ? (selectedConversation.name?.charAt(0)?.toUpperCase() ?? '?')
                                : null}
                        </Avatar>
                    )}
                    <div className="min-w-0">
                        <div className="font-bold heading-text truncate">{selectedConversation.name}</div>
                        {selectedConversation.type === 'group' && (
                            <div className="text-xs text-gray-400">
                                {selectedConversation.members?.length ?? 0} members
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <button
                className="text-xl text-gray-500 hover:text-primary transition-colors"
                onClick={() => setInfoOpen((v) => !v)}
                title="Conversation info"
            >
                <TbInfoCircle />
            </button>
        </div>
    ) : null

    return (
        <div className={classNames('w-full md:block', !selectedConversation.id && 'hidden')}>
            {selectedConversation.id ? (
                <div className="flex flex-col h-full rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gray-100 dark:bg-gray-600 px-4 h-[72px] flex items-center border-b border-gray-200 dark:border-gray-700">
                        {cardHeaderContent}
                    </div>

                    {/* Messages + Info Panel */}
                    <div className="flex flex-1 overflow-hidden">
                        <div className="flex-1 overflow-hidden relative">
                            {messagesLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Spinner size={40} />
                                </div>
                            ) : (
                                <ChatBox
                                    ref={scrollRef}
                                    messageList={messageList}
                                    placeholder="Type a message..."
                                    showAvatar={true}
                                    avatarGap={true}
                                    messageListClass="h-[calc(100%-72px)]"
                                    bubbleClass="max-w-[340px]"
                                    onInputChange={handleInputChange}
                                />
                            )}
                            {sending && (
                                <div className="absolute bottom-20 right-6 flex items-center gap-1 text-xs text-gray-400">
                                    <Spinner size={14} /> Sending...
                                </div>
                            )}
                        </div>
                        {infoOpen && (
                            <ConversationInfoPanel
                                conversation={selectedConversation}
                                onClose={() => setInfoOpen(false)}
                            />
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 h-full max-h-full flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-800">
                    <StartConverstation height={250} width={250} />
                    <div className="mt-10 text-center">
                        <h3>Start Chatting!</h3>
                        <p className="mt-2 text-base">Pick a conversation or begin a new one</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ChatBody
