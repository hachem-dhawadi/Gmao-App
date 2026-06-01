import { create } from 'zustand'
import type { ChatConversation, ChatMessage } from '@/services/ChatService'
import type { SelectedConversation } from '../types'

type ChatState = {
    conversations: ChatConversation[]
    selectedConversation: SelectedConversation
    messages: ChatMessage[]
    messagesLoading: boolean
    mobileSideBarExpand: boolean
}

type ChatAction = {
    setConversations: (payload: ChatConversation[]) => void
    setSelectedConversation: (payload: SelectedConversation) => void
    setMessages: (payload: ChatMessage[]) => void
    prependMessages: (payload: ChatMessage[]) => void
    pushMessage: (payload: ChatMessage) => void
    setMessagesLoading: (payload: boolean) => void
    setMobileSidebar: (payload: boolean) => void
    markConversationRead: (id: number) => void
    updateConversationLastMessage: (conversationId: number, message: ChatMessage) => void
    upsertConversationFromNotification: (conv: { id: number; name: string; type: 'direct' | 'group'; avatar: string | null; unread_count: number }, message: ChatMessage) => void
    prependConversationIfMissing: (conv: ChatConversation) => void
    removeConversation: (id: number) => void
}

export const useChatStore = create<ChatState & ChatAction>((set, get) => ({
    conversations: [],
    selectedConversation: {},
    messages: [],
    messagesLoading: false,
    mobileSideBarExpand: false,

    setConversations: (payload) => set({ conversations: payload }),

    setSelectedConversation: (payload) =>
        set({ selectedConversation: payload, messages: [] }),

    setMessages: (payload) => set({ messages: payload }),

    prependMessages: (payload) =>
        set((state) => ({ messages: [...payload, ...state.messages] })),

    pushMessage: (payload) =>
        set((state) => {
            if (state.messages.some((m) => m.id === payload.id)) return state
            return { messages: [...state.messages, payload] }
        }),

    setMessagesLoading: (payload) => set({ messagesLoading: payload }),

    setMobileSidebar: (payload) => set({ mobileSideBarExpand: payload }),

    markConversationRead: (id) =>
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c.id === id ? { ...c, unread_count: 0 } : c,
            ),
        })),

    updateConversationLastMessage: (conversationId, message) =>
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c.id === conversationId
                    ? {
                          ...c,
                          last_message: {
                              id: message.id,
                              body: message.body,
                              type: message.type,
                              created_at: message.created_at,
                              sender: message.sender,
                          },
                      }
                    : c,
            ),
        })),

    prependConversationIfMissing: (conv) =>
        set((state) => {
            if (state.conversations.some((c) => c.id === conv.id)) return state
            return { conversations: [conv, ...state.conversations] }
        }),

    removeConversation: (id) =>
        set((state) => ({
            conversations: state.conversations.filter((c) => c.id !== id),
            selectedConversation:
                state.selectedConversation.id === id ? {} : state.selectedConversation,
            messages: state.selectedConversation.id === id ? [] : state.messages,
        })),

    upsertConversationFromNotification: (conv, message) =>
        set((state) => {
            // If this conversation is currently open the user is reading it — keep unread at 0
            const isOpen    = state.selectedConversation.id === conv.id
            const unread    = isOpen ? 0 : conv.unread_count
            const lastMessage = {
                id:         message.id,
                body:       message.body,
                type:       message.type,
                created_at: message.created_at,
                sender:     message.sender,
            }
            const exists = state.conversations.some((c) => c.id === conv.id)
            if (exists) {
                return {
                    conversations: state.conversations.map((c) =>
                        c.id === conv.id
                            ? { ...c, unread_count: unread, last_message: lastMessage }
                            : c,
                    ),
                }
            }
            // Not yet in the list — prepend it
            const newConv: ChatConversation = {
                ...conv,
                unread_count: unread,
                members:      [],
                last_message: lastMessage,
                created_at:   message.created_at,
            }
            return { conversations: [newConv, ...state.conversations] }
        }),
}))
