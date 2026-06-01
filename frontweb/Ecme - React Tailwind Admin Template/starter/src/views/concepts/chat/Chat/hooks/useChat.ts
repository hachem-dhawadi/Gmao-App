import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chatStore'
import { useSessionUser } from '@/store/authStore'
import { apiGetConversations, apiGetMessages, apiMarkConversationRead } from '@/services/ChatService'
import echo from '@/utils/echo'
import type { ChatMessage } from '@/services/ChatService'

const useChat = () => {
    const selectedConversation     = useChatStore((state) => state.selectedConversation)
    const setConversations         = useChatStore((state) => state.setConversations)
    const setMessages              = useChatStore((state) => state.setMessages)
    const setMessagesLoading       = useChatStore((state) => state.setMessagesLoading)
    const pushMessage              = useChatStore((state) => state.pushMessage)
    const markConversationRead     = useChatStore((state) => state.markConversationRead)
    const updateConversationLastMessage = useChatStore((state) => state.updateConversationLastMessage)

    const echoChannelRef = useRef<ReturnType<typeof echo.private> | null>(null)

    const fetchConversations = async () => {
        try {
            const resp = await apiGetConversations()
            setConversations(resp.data.conversations)
        } catch {
            // silently fail
        }
    }

    // Load conversations on mount
    useEffect(() => {
        fetchConversations()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Load messages + subscribe to real-time when conversation changes
    useEffect(() => {
        if (!selectedConversation.id) return

        // Fetch message history
        setMessagesLoading(true)
        apiGetMessages(selectedConversation.id)
            .then((resp) => setMessages(resp.data.messages))
            .finally(() => setMessagesLoading(false))

        // Mark as read
        apiMarkConversationRead(selectedConversation.id)
        markConversationRead(selectedConversation.id)

        // Subscribe to real-time events
        console.log('[Echo] subscribing to conversation', selectedConversation.id)
        const channel = echo.private(`conversation.${selectedConversation.id}`)
        echoChannelRef.current = channel

        channel.listen('.message.sent', (event: { conversation_id: number; message: ChatMessage }) => {
            console.log('[Echo] message.sent received', event)
            const currentMemberId = useSessionUser.getState().user.memberId
            const msg = { ...event.message, is_mine: event.message.sender.id === currentMemberId }
            pushMessage(msg)
            updateConversationLastMessage(event.conversation_id, msg)
        })

        return () => {
            console.log('[Echo] leaving conversation', selectedConversation.id)
            channel.stopListening('.message.sent')
            echo.leave(`conversation.${selectedConversation.id}`)
            echoChannelRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConversation.id])

    return { fetchConversations }
}

export default useChat
