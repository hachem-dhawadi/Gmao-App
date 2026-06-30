import api from './ApiService'

export type ConversationMember = {
    id: number
    name: string | null
    avatar: string | null
}

export type LastMessage = {
    id: number
    body: string | null
    type: string
    created_at: string | null
    sender: { id: number; name: string | null; avatar: string | null } | null
}

export type Conversation = {
    id: number
    type: 'direct' | 'group'
    name: string
    avatar: string | null
    unread_count: number
    members: ConversationMember[]
    last_message: LastMessage | null
    created_at: string | null
    created_by_member_id: number | null
}

export type MessageAttachment = {
    id: number
    original_name: string
    mime_type: string | null
    size_bytes: number | null
    url: string | null
}

export type Message = {
    id: number
    body: string | null
    type: 'text' | 'image' | 'file'
    is_mine: boolean
    created_at: string | null
    sender: { id: number; name: string | null; avatar: string | null } | null
    attachments: MessageAttachment[]
}

export type ConversationsResponse = {
    success: boolean
    data: { conversations: Conversation[] }
}

export type MessagesResponse = {
    success: boolean
    data: { messages: Message[]; has_more: boolean }
}

export type MemberForChat = {
    id: number
    name: string | null
    avatar: string | null
    role_name: string | null
}

export async function apiGetConversations() {
    return api.get<ConversationsResponse>('/chat/conversations')
}

export async function apiGetMessages(convId: number, before?: number) {
    const params: Record<string, unknown> = {}
    if (before) params.before = before
    return api.get<MessagesResponse>(`/chat/conversations/${convId}/messages`, { params })
}

export async function apiSendMessage(convId: number, body: string) {
    return api.post<{ success: boolean; data: { message: Message } }>(
        `/chat/conversations/${convId}/messages`,
        { body }
    )
}

export async function apiMarkRead(convId: number) {
    return api.post(`/chat/conversations/${convId}/read`)
}

export async function apiCreateConversation(data: {
    type: 'direct' | 'group'
    member_ids: number[]
    name?: string
}) {
    return api.post<{ success: boolean; data: { conversation: Conversation } }>(
        '/chat/conversations',
        data
    )
}

export async function apiGetMembersForChat() {
    return api.get<{ success: boolean; data: { members: MemberForChat[] } }>('/members/for-chat')
}
