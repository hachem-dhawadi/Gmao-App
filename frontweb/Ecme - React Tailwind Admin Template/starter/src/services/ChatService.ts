import ApiService from './ApiService'
import echo from '@/utils/echo'

export type ChatMember = {
    id: number
    name: string | null
    avatar: string | null
}

export type ChatAttachment = {
    id: number
    original_name: string
    url: string
    mime_type: string | null
    size_bytes: number | null
}

export type ChatMessage = {
    id: number
    conversation_id: number
    body: string | null
    type: 'text' | 'file' | 'image'
    is_mine: boolean
    created_at: string
    sender: ChatMember
    attachments: ChatAttachment[]
}

export type ChatLastMessage = {
    id: number
    body: string | null
    type: string
    created_at: string
    sender: ChatMember
} | null

export type ChatConversation = {
    id: number
    type: 'direct' | 'group'
    name: string
    avatar: string | null
    unread_count: number
    members: ChatMember[]
    last_message: ChatLastMessage
    created_at: string
    created_by_member_id?: number | null
}

export type ConversationsResponse = {
    success: boolean
    data: { conversations: ChatConversation[] }
}

export type ConversationResponse = {
    success: boolean
    data: { conversation: ChatConversation }
}

export type MessagesResponse = {
    success: boolean
    data: { messages: ChatMessage[]; has_more: boolean }
}

export type MessageResponse = {
    success: boolean
    data: { message: ChatMessage }
}

export async function apiGetConversations() {
    return ApiService.fetchDataWithAxios<ConversationsResponse>({
        url: '/chat/conversations',
        method: 'get',
    })
}

export async function apiCreateConversation(data: {
    type: 'direct' | 'group'
    member_ids: number[]
    name?: string
}) {
    return ApiService.fetchDataWithAxios<ConversationResponse>({
        url: '/chat/conversations',
        method: 'post',
        data,
    })
}

export async function apiMarkConversationRead(conversationId: number) {
    return ApiService.fetchDataWithAxios<{ success: boolean }>({
        url: `/chat/conversations/${conversationId}/read`,
        method: 'post',
    })
}

export async function apiGetMessages(conversationId: number, before?: number) {
    return ApiService.fetchDataWithAxios<MessagesResponse>({
        url: `/chat/conversations/${conversationId}/messages`,
        method: 'get',
        params: before ? { before } : undefined,
    })
}

export async function apiSendMessage(
    conversationId: number,
    body: string,
    files?: File[],
) {
    const socketId = echo.socketId()
    const socketHeader = socketId ? { 'X-Socket-ID': socketId } : {}

    if (files && files.length > 0) {
        const formData = new FormData()
        if (body) formData.append('body', body)
        files.forEach((f) => formData.append('files[]', f))
        return ApiService.fetchDataWithAxios<MessageResponse>({
            url: `/chat/conversations/${conversationId}/messages`,
            method: 'post',
            data: formData as unknown as Record<string, unknown>,
            headers: { 'Content-Type': 'multipart/form-data', ...socketHeader },
        })
    }

    return ApiService.fetchDataWithAxios<MessageResponse>({
        url: `/chat/conversations/${conversationId}/messages`,
        method: 'post',
        data: { body },
        headers: socketHeader,
    })
}

export async function apiDeleteMessage(messageId: number) {
    return ApiService.fetchDataWithAxios<{ success: boolean }>({
        url: `/chat/messages/${messageId}`,
        method: 'delete',
    })
}

export type ConversationFile = {
    id: number
    original_name: string
    url: string
    mime_type: string | null
    size_bytes: number | null
    created_at: string
    sender_name: string | null
}

export type ConversationFilesResponse = {
    success: boolean
    data: { files: ConversationFile[] }
}

export async function apiGetConversationFiles(conversationId: number) {
    return ApiService.fetchDataWithAxios<ConversationFilesResponse>({
        url: `/chat/conversations/${conversationId}/files`,
        method: 'get',
    })
}

export async function apiLeaveConversation(conversationId: number) {
    return ApiService.fetchDataWithAxios<{ success: boolean }>({
        url: `/chat/conversations/${conversationId}/leave`,
        method: 'post',
    })
}

export async function apiDeleteConversation(conversationId: number) {
    return ApiService.fetchDataWithAxios<{ success: boolean }>({
        url: `/chat/conversations/${conversationId}`,
        method: 'delete',
    })
}
