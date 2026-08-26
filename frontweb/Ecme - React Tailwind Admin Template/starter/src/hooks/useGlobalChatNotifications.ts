import { useEffect, createElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import { useChatStore } from '@/views/concepts/chat/Chat/store/chatStore'
import echo from '@/utils/echo'
import toast from '@/components/ui/toast'
import ChatMessageToast from '@/components/template/ChatMessageToast'
import type { ChatMessage, ChatConversation } from '@/services/ChatService'

type MessagePayload = {
    conversation: {
        id: number
        name: string
        type: 'direct' | 'group'
        avatar: string | null
        unread_count: number
    }
    message: ChatMessage
}

type ConversationCreatedPayload = {
    conversation: ChatConversation
}

const useGlobalChatNotifications = () => {
    const memberId = useSessionUser((state) => state.user.memberId)
    const navigate  = useNavigate()

    useEffect(() => {
        if (!memberId) return

        const channel = echo.private(`user.${memberId}`)

        channel.listen('.new.chat.message', (event: MessagePayload) => {
            const { conversation, message } = event
            const store = useChatStore.getState()

            // Update sidebar conversation list
            store.upsertConversationFromNotification(conversation, message)

            const selectedId = store.selectedConversation.id

            if (selectedId === conversation.id) {
                // Backup delivery: push message directly if conversation is open.
                // Deduplication in pushMessage prevents doubles if MessageSent
                // already delivered it via the conversation channel.
                store.pushMessage(message)
            } else {
                const preview = message.body
                    ? message.body.slice(0, 120) + (message.body.length > 120 ? '…' : '')
                    : '📎 Attachment'
                toast.push(
                    createElement(ChatMessageToast, {
                        senderName:       message.sender?.name ?? null,
                        senderAvatar:     message.sender?.avatar ?? null,
                        conversationName: conversation.name,
                        conversationType: conversation.type,
                        preview,
                        onClick: () => {
                            store.setSelectedConversation({
                                id:     conversation.id,
                                name:   conversation.name,
                                type:   conversation.type,
                                avatar: conversation.avatar,
                            })
                            navigate('/concepts/chat')
                        },
                    }),
                    { placement: 'top-end' },
                )
            }
        })

        // New conversation (group created by someone else) — add to sidebar immediately
        channel.listen('.conversation.created', (event: ConversationCreatedPayload) => {
            useChatStore.getState().prependConversationIfMissing(event.conversation)
        })

        return () => {
            channel.stopListening('.new.chat.message')
            channel.stopListening('.conversation.created')
            echo.leave(`user.${memberId}`)
        }
    }, [memberId, navigate])
}

export default useGlobalChatNotifications
