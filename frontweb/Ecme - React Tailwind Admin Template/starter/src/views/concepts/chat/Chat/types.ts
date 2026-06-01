import type { ChatConversation, ChatMessage } from '@/services/ChatService'

export type { ChatConversation, ChatMessage }

export type SelectedConversation = {
    id?: number
    name?: string
    avatar?: string | null
    type?: 'direct' | 'group'
    members?: { id: number; name: string | null; avatar: string | null }[]
    created_by_member_id?: number | null
}
