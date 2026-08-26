import api from './ApiService'

export type AiAction = {
    type: string
    data: Record<string, unknown>[]
}

export type AiMessage = {
    id: string
    role: 'user' | 'assistant'
    content: string
    action?: AiAction | null
    createdAt: number
}

export async function apiAiChat(prompt: string): Promise<{ content: string; action: AiAction | null }> {
    const res = await api.post('/ai/chat', { prompt, page_context: 'Mobile App' })
    return {
        content: res.data?.choices?.[0]?.message?.content ?? '',
        action:  res.data?.action ?? null,
    }
}
