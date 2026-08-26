import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ChatHistories, ChatHistory, Conversation } from '../types'

const getUserEmail = (): string => {
    try {
        const raw = localStorage.getItem('sessionUser')
        if (raw) {
            const parsed = JSON.parse(raw)
            return parsed?.state?.user?.email || 'anonymous'
        }
    } catch {}
    return 'anonymous'
}

const userScopedStorage = {
    getItem: (name: string) => localStorage.getItem(`${name}-${getUserEmail()}`),
    setItem: (name: string, value: string) =>
        localStorage.setItem(`${name}-${getUserEmail()}`, value),
    removeItem: (name: string) =>
        localStorage.removeItem(`${name}-${getUserEmail()}`),
}

type RenameDialog = {
    id: string
    title: string
    open: boolean
}

export type GenerativeChatState = {
    selectedConversation: string
    selectedConversationRecord: string[]
    chatHistory: ChatHistories
    renameDialog: RenameDialog
    isTyping: boolean
}

type GenerativeChatAction = {
    setSelectedConversation: (payload: string) => void
    setSelectedConversationRecord: (payload: string) => void
    setChatHistory: (payload: ChatHistories) => void
    setChatHistoryName: (payload: { id: string; title: string }) => void
    setRenameDialog: (payload: RenameDialog) => void
    setIsTyping: (payload: boolean) => void
    pushChatHistory: (payload: ChatHistory) => void
    pushConversation: (id: string, conversation: Conversation) => void
    enableChat: (id: string, lastConversation: string) => void
    disabledChatFresh: (id: string) => void
}

const initialState: GenerativeChatState = {
    selectedConversation: '',
    selectedConversationRecord: [],
    chatHistory: [],
    renameDialog: {
        id: '',
        title: '',
        open: false,
    },
    isTyping: false,
}

export const usGenerativeChatStore = create<
    GenerativeChatState & GenerativeChatAction
>()(
persist(
(set, get) => ({
    ...initialState,
    setSelectedConversation: (payload) =>
        set(() => ({ selectedConversation: payload })),
    setChatHistory: (payload) => set(() => ({ chatHistory: payload })),
    setChatHistoryName: (payload) =>
        set(() => {
            const chatHistory = get().chatHistory.map((chat) => {
                if (chat.id === payload.id) {
                    chat.title = payload.title
                }
                return chat
            })
            return { chatHistory }
        }),
    setRenameDialog: (payload) => set(() => ({ renameDialog: payload })),
    setSelectedConversationRecord: (payload) =>
        set(() => {
            let record = get().selectedConversationRecord

            if (record.includes(payload)) {
                record = record.filter((item) => item !== payload)
            } else {
                record.push(payload)
            }

            return { selectedConversationRecord: record }
        }),
    pushChatHistory: (payload) =>
        set(() => {
            const existing = get().chatHistory
            if (existing.some((c) => c.id === payload.id)) return {}
            return { chatHistory: [payload, ...existing] }
        }),
    pushConversation: (id, conversation) =>
        set(() => {
            const chatHistory = get().chatHistory.map((chat) => {
                if (chat.id === id) {
                    if (!chat.conversation) chat.conversation = []
                    if (!chat.conversation.some((c) => c.id === conversation.id)) {
                        chat.conversation.push(conversation)
                    }
                }
                return chat
            })
            return { chatHistory }
        }),
    setIsTyping: (payload) => set(() => ({ isTyping: payload })),
    enableChat: (id, lastConversation) =>
        set(() => {
            const chatHistory = get().chatHistory.map((chat) => {
                if (chat.id === id) {
                    chat.enable = true
                    chat.lastConversation = lastConversation
                }
                return chat
            })
            return { chatHistory }
        }),
    disabledChatFresh: () =>
        set(() => {
            const chatHistory = get().chatHistory.map((chat) => {
                if (chat.id === get().selectedConversation) {
                    chat.conversation = chat.conversation?.map(
                        (conversation) => {
                            if (conversation.fresh) {
                                conversation.fresh = false
                            }
                            return conversation
                        },
                    )
                }
                return chat
            })
            return { chatHistory }
        }),
}),
    {
        name: 'ai-chat-history',
        storage: createJSONStorage(() => userScopedStorage),
        partialize: (state) => ({
            chatHistory: state.chatHistory,
            selectedConversation: state.selectedConversation,
        }),
        onRehydrateStorage: () => (state) => {
            if (!state) return
            const seenChats = new Set<string>()
            state.chatHistory = state.chatHistory.filter((chat) => {
                if (seenChats.has(chat.id)) return false
                seenChats.add(chat.id)
                if (chat.conversation) {
                    const seenConvs = new Set<string>()
                    chat.conversation = chat.conversation.filter((c) => {
                        if (seenConvs.has(c.id)) return false
                        seenConvs.add(c.id)
                        return true
                    })
                }
                return true
            })
        },
    },
)
)
