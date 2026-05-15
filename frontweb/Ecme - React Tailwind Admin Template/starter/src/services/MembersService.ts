import ApiService from './ApiService'

export type MemberRole = {
    id: number
    code: string
    label: string
}

export type MemberUser = {
    id: number
    name: string
    email: string
    phone: string | null
    last_login_at: string | null
}

export type Member = {
    id: number
    company_id: number
    user_id: number
    department_id: number | null
    employee_code: string
    job_title: string | null
    status: string
    user: MemberUser | null
    roles: MemberRole[]
}

export type MembersListResponse = {
    success: boolean
    message: string
    data: {
        members: Member[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export async function apiGetMembersList<
    T = MembersListResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/members',
        method: 'get',
        params,
    })
}

export async function apiUpdateMemberRoles<
    T = { success: boolean; message: string },
>(memberId: number, roleCodes: string[]) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/members/${memberId}`,
        method: 'patch',
        data: { roles: roleCodes },
    })
}
