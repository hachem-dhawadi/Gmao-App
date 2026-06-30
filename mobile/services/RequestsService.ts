import api from './ApiService'

export type MaintenanceRequest = {
    id: number
    code: string
    title: string
    description: string | null
    priority: 'low' | 'medium' | 'high' | 'critical'
    status: 'pending' | 'converted' | 'rejected'
    location: string | null
    review_note: string | null
    created_at: string | null
    updated_at: string | null
    asset: { id: number; code: string; name: string } | null
    requested_by: { id: number; name: string | null } | null
    reviewed_by: { id: number; name: string | null } | null
    work_order: { id: number; code: string } | null
}

export type RequestsListResponse = {
    success: boolean
    data: {
        requests: MaintenanceRequest[]
        pagination: { current_page: number; per_page: number; total: number; last_page: number }
    }
}

export type RequestResponse = {
    success: boolean
    data: { request: MaintenanceRequest }
}

export async function apiGetRequests(params?: Record<string, unknown>) {
    return api.get<RequestsListResponse>('/requests', { params })
}

export async function apiGetRequest(id: number) {
    return api.get<RequestResponse>(`/requests/${id}`)
}

export async function apiCreateRequest(data: {
    title: string
    description?: string | null
    priority: string
    asset_id?: number | null
    location?: string | null
}) {
    return api.post<RequestResponse>('/requests', data)
}

export async function apiDeleteRequest(id: number) {
    return api.delete(`/requests/${id}`)
}
