import ApiService from './ApiService'

export type Permission = {
    id: number
    code: string
    label: string
}

export type Role = {
    id: number
    code: string
    label: string
    description: string | null
    sort_order: number
    is_system: boolean
    permissions: Permission[]
}

export type RolesResponse = {
    success: boolean
    message: string
    data: { roles: Role[] }
}

export async function apiGetRoles<T = RolesResponse>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/roles',
        method: 'get',
    })
}

export async function apiUpdateRole<T = { success: boolean; message: string; data: { role: Role } }>(
    id: number,
    data: { label?: string; description?: string | null; permissions?: string[] },
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/roles/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiCreateRole<T = { success: boolean; message: string; data: { role: Role } }>(data: {
    label: string
    description?: string | null
    permissions: string[]
}) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/roles',
        method: 'post',
        data,
    })
}
