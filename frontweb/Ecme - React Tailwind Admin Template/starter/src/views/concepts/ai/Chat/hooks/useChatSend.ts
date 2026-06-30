import { usGenerativeChatStore } from '../store/generativeChatStore'
import { apiPostChat } from '@/services/AiService'
import { useSessionUser } from '@/store/authStore'
import dayjs from 'dayjs'
import type { PostAiChatResponse } from '../types'

const useChatSend = () => {
    const {
        selectedConversation,
        setSelectedConversation,
        pushChatHistory,
        pushConversation,
        enableChat,
        setIsTyping,
    } = usGenerativeChatStore()

    const { user } = useSessionUser()

    const creteMyMessage = (id: string, prompt: string) => {
        pushConversation(id, {
            id: `ai-conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            sender: {
                id: 'me',
                name: user.userName || 'You',
                avatarImageUrl: user.avatar || undefined,
            },
            content: prompt,
            timestamp: dayjs().toDate(),
            type: 'regular',
            isMyMessage: true,
        })
    }

    const sendMessage = async (
        id: string,
        prompt: string,
        attachments?: File[],
        pageContext?: string,
    ) => {
        try {
            const resp = await apiPostChat<PostAiChatResponse>({
                prompt,
                attachments,
                page_context: pageContext,
            })
            const aiContent = resp.choices[0].message.content || ''
            pushConversation(id, {
                id: `ai-conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
                sender: {
                    id: 'ai',
                    name: 'AI Assistant',
                    avatarImageUrl: '/ailogo.jpg',
                },
                content: aiContent,
                timestamp: dayjs().toDate(),
                type: 'regular',
                isMyMessage: false,
                fresh: true,
                actionData: resp.action ?? null,
            })
            enableChat(id, prompt)
        } catch {
            pushConversation(id, {
                id: `ai-conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
                sender: {
                    id: 'ai',
                    name: 'AI Assistant',
                    avatarImageUrl: '/ailogo.jpg',
                },
                content: 'Sorry, I could not process your request. Please try again.',
                timestamp: dayjs().toDate(),
                type: 'regular',
                isMyMessage: false,
                fresh: false,
                actionData: null,
            })
            enableChat(id, prompt)
        } finally {
            setIsTyping(false)
        }
    }

    const createConversation = async (
        id: string,
        prompt: string,
        attachments?: File[],
        pageContext?: string,
    ) => {
        setSelectedConversation(id)
        await sendMessage(id, prompt, attachments, pageContext)
    }

    const handleSend = async (prompt: string, attachments?: File[], pageContext?: string) => {
        setIsTyping(true)
        if (selectedConversation) {
            creteMyMessage(selectedConversation, prompt)
            await sendMessage(selectedConversation, prompt, attachments, pageContext)
        } else {
            const newId = `ai-chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
            pushChatHistory({
                id: newId,
                title: prompt,
                lastConversation: '',
                createdTime: dayjs().unix(),
                updatedTime: dayjs().unix(),
                enable: false,
            })
            creteMyMessage(newId, prompt)
            await createConversation(newId, prompt, attachments, pageContext)
        }
    }

    return {
        handleSend,
    }
}

export default useChatSend
