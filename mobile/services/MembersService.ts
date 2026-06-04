import api from './ApiService'

export type Member = {
    id: number
    employee_code: string
    job_title: string | null
    status: string
    user: {
        id: number
        name: string
        email: string
        phone: string | null
        avatar_url: string | null
    } | null
    roles: { id: number; code: string; label: string }[]
}

export type MembersListResponse = {
    success: boolean
    data: {
        members: Member[]
        pagination: { current_page: number; per_page: number; total: number; last_page: number }
    }
}

export async function apiGetMembers(params?: Record<string, unknown>) {
    return api.get<MembersListResponse>('/members', { params })
}
