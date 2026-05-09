import ApiService from './ApiService'

export type Department = {
    id: number
    company_id: number
    parent_department_id: number | null
    name: string
    code: string
    description: string | null
    created_at: string | null
    updated_at: string | null
    archived_at: string | null
    parent: { id: number; name: string; code: string } | null
    children_count: number
    members_count: number
}

export type DepartmentsListResponse = {
    success: boolean
    message: string
    data: {
        departments: Department[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type DepartmentResponse = {
    success: boolean
    message: string
    data: { department: Department }
}

export type CreateDepartmentRequest = {
    name: string
    code: string
    description?: string | null
    parent_department_id?: number | null
}

export type UpdateDepartmentRequest = {
    name?: string
    code?: string
    description?: string | null
    parent_department_id?: number | null
}

export async function apiGetDepartmentsList<
    T = DepartmentsListResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/departments',
        method: 'get',
        params,
    })
}

export async function apiGetDepartmentById<T = DepartmentResponse>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/departments/${id}`,
        method: 'get',
    })
}

export async function apiCreateDepartment<T = DepartmentResponse>(
    data: CreateDepartmentRequest,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/departments',
        method: 'post',
        data,
    })
}

export async function apiUpdateDepartment<T = DepartmentResponse>(
    id: string | number,
    data: UpdateDepartmentRequest,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/departments/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteDepartment<T = { success: boolean; message: string }>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/departments/${id}`,
        method: 'delete',
    })
}
