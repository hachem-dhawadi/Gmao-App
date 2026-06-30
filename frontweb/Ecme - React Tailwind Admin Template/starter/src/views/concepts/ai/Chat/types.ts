export type ChatActionType =
    | 'get_work_orders'
    | 'get_assets'
    | 'get_technicians'
    | 'get_members'
    | 'get_pm_plans'
    | 'analyze_asset_health'
    | 'detect_anomalies'
    | 'prefill_work_order'

export type ChatActionData = {
    type: ChatActionType
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[] | Record<string, any>
}

export type Conversation = {
    id: string
    sender: {
        id: string
        name: string
        avatarImageUrl?: string
    }
    content?: string
    timestamp?: Date
    type: 'regular' | 'reply' | 'deleted' | 'divider'
    attachments?: Array<{
        type: 'image' | 'video' | 'audio' | 'misc'
        source: File
        mediaUrl: string
    }>
    isMyMessage?: boolean
    fresh?: boolean
    actionData?: ChatActionData | null
}

export type PostAiChatResponse = {
    id: string
    choices: {
        finish_reason:
            | 'stop'
            | 'length'
            | 'tool_calls'
            | 'content_filter'
            | 'function_call'
        index: number
        logprobs: {
            content: Array<{
                token: string
                bytes: Array<number> | null
                top_logprobs: Array<{
                    token: string
                    bytes: Array<number> | null
                    logprob: number
                }>
            }>
        } | null
        message: {
            content: string | null
            role: string
        }
    }[]
    created: number
    model: string
    action?: ChatActionData | null
}

export type ChatHistory = {
    id: string
    title: string
    conversation?: Conversation[]
    lastConversation: string
    createdTime: number
    updatedTime: number
    enable: boolean
}

export type ChatHistories = ChatHistory[]

export type GetChatHistoryResponse = ChatHistories
