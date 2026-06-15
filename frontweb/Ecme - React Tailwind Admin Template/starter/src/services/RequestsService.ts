import ApiService from './ApiService'

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
    message: string
    data: {
        requests: MaintenanceRequest[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type RequestResponse = {
    success: boolean
    message: string
    data: { request: MaintenanceRequest }
}

export async function apiGetRequestsList<T = RequestsListResponse>(
    params?: Record<string, unknown>,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/requests',
        method: 'get',
        params,
    })
}

export async function apiGetRequestById<T = RequestResponse>(id: number | string) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/requests/${id}`,
        method: 'get',
    })
}

export async function apiCreateRequest<T = RequestResponse>(data: {
    title: string
    description?: string | null
    priority: string
    asset_id?: number | null
    location?: string | null
}) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/requests',
        method: 'post',
        data,
    })
}

export async function apiConvertRequest<T = { success: boolean; message: string; data: { request: MaintenanceRequest; work_order: { id: number; code: string } } }>(
    id: number | string,
    payload?: { title?: string; priority?: string; assigned_member_id?: number | null },
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/requests/${id}/convert`,
        method: 'post',
        data: payload,
    })
}

export async function apiRejectRequest<T = RequestResponse>(
    id: number | string,
    review_note?: string | null,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/requests/${id}/reject`,
        method: 'post',
        data: { review_note },
    })
}

export async function apiDeleteRequest<T = { success: boolean; message: string }>(
    id: number | string,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/requests/${id}`,
        method: 'delete',
    })
}
