import ApiService from './ApiService'
import type { PostAiChatResponse, GetChatHistoryResponse } from '@/views/concepts/ai/Chat/types'

export async function apiPostChat<T>(data: {
    prompt: string
    attachments?: File[]
    page_context?: string
}): Promise<T> {
    return ApiService.fetchDataWithAxios<T>({
        url: '/ai/chat',
        method: 'post',
        data: {
            prompt: data.prompt,
            ...(data.page_context ? { page_context: data.page_context } : {}),
        },
    })
}

export async function apiGetChatHistory<T>(): Promise<T> {
    return ApiService.fetchDataWithAxios<T>({
        url: '/ai/chat/history',
        method: 'get',
    })
}

export type SuggestTechnicianRequest = {
    due_at?: string
    estimated_minutes?: number
    priority?: string
    description?: string
    asset_id?: number | null
}

export type SuggestTechnicianResponse = {
    member_id: number
    name: string
    reason: string
}

export async function apiSuggestTechnician(
    data: SuggestTechnicianRequest,
): Promise<SuggestTechnicianResponse> {
    return ApiService.fetchDataWithAxios<SuggestTechnicianResponse>({
        url: '/ai/suggest-technician',
        method: 'post',
        data,
    })
}

export type FillWorkOrderResponse = {
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    due_at: string | null
    estimated_minutes: number | null
}

export async function apiFillWorkOrder(prompt: string): Promise<FillWorkOrderResponse> {
    return ApiService.fetchDataWithAxios<FillWorkOrderResponse>({
        url: '/ai/fill-work-order',
        method: 'post',
        data: { prompt },
    })
}

export type GeneratePmChecklistResponse = {
    tasks: { title: string }[]
}

export async function apiGeneratePmChecklist(
    assetId: number,
): Promise<GeneratePmChecklistResponse> {
    return ApiService.fetchDataWithAxios<GeneratePmChecklistResponse>({
        url: '/ai/generate-checklist',
        method: 'post',
        data: { asset_id: assetId },
    })
}

export type PmPlanSuggestion = {
    asset_id: number
    asset_name: string
    name: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    status: 'active' | 'draft'
    estimated_minutes: number
    interval_value: number
    interval_unit: 'days' | 'weeks' | 'months'
    next_run_at: string
    assigned_member_id: number | null
    assigned_member_name: string | null
    tasks: string[]
}

export type CreateWorkOrderFromAiResponse = {
    id: number
    code: string
    title: string
    priority: string
    asset_name: string | null
}

export async function apiCreateWorkOrderFromAi(data: {
    title: string
    description?: string
    priority: string
    due_at?: string | null
    estimated_minutes?: number | null
    asset_id?: number | null
}): Promise<CreateWorkOrderFromAiResponse> {
    return ApiService.fetchDataWithAxios<CreateWorkOrderFromAiResponse>({
        url: '/ai/create-work-order',
        method: 'post',
        data,
    })
}

export type CreateMaintenanceRequestFromAiResponse = {
    id: number
    code: string
    title: string
    priority: string
    asset_name: string | null
    location: string | null
}

export async function apiCreateMaintenanceRequestFromAi(data: {
    title: string
    description?: string
    priority: string
    asset_id?: number | null
    location?: string | null
}): Promise<CreateMaintenanceRequestFromAiResponse> {
    return ApiService.fetchDataWithAxios<CreateMaintenanceRequestFromAiResponse>({
        url: '/ai/create-maintenance-request',
        method: 'post',
        data,
    })
}

export type BulkCreatePmPlansResponse = {
    created_count: number
    created: { code: string; name: string; asset_id: number; asset_name: string }[]
    errors: string[]
}

export async function apiCreatePmPlans(
    plans: PmPlanSuggestion[],
): Promise<BulkCreatePmPlansResponse> {
    return ApiService.fetchDataWithAxios<BulkCreatePmPlansResponse>({
        url: '/ai/bulk-create-pm-plans',
        method: 'post',
        data: { plans },
    })
}

export type { PostAiChatResponse, GetChatHistoryResponse }
