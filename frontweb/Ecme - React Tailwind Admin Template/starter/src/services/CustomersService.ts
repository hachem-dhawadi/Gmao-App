import ApiService from './ApiService'

export type SuperadminUserListItem = {
    id: number
    name: string
    email: string
    phone: string | null
    avatar_path: string | null
    avatar_url?: string | null
    locale: string | null
    is_active: boolean
    is_superadmin: boolean
    last_login_at: string | null
    created_at: string | null
    members_count: number
    deleted_at: string | null
}

export type SuperadminUsersListResponse = {
    success: boolean
    message: string
    data: {
        users: SuperadminUserListItem[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type CompanyMemberListItem = {
    id: number
    company_id: number
    user_id: number
    department_id: number | null
    employee_code: string | null
    job_title: string | null
    status: string
    user: {
        id: number
        name: string
        email: string
        phone: string | null
        avatar_path?: string | null
        avatar_url?: string | null
    } | null
    roles: Array<{
        id: number
        code: string
        label: string
    }>
}

export type CompanyMembersListResponse = {
    success: boolean
    message: string
    data: {
        members: CompanyMemberListItem[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type CreateSuperadminUserRequest = {
    name: string
    email: string
    phone: string
    password: string
    password_confirmation: string
    locale?: string | null
    is_active?: boolean
    is_superadmin?: boolean
    two_factor_enabled?: boolean
    avatar?: File | null
}

export type CreateMemberRequest = {
    name: string
    email: string
    phone: string
    employee_code: string
    job_title?: string | null
    roles: string[]
    department_id?: number | null
    avatar?: File | null
}

export type UpdateSuperadminUserRequest = {
    name?: string
    email?: string
    phone?: string
    password?: string
    password_confirmation?: string
    locale?: string | null
    is_active?: boolean
    is_superadmin?: boolean
    two_factor_enabled?: boolean
    avatar?: File | null
    remove_avatar?: boolean
}

export type SuperadminUserResponse = {
    success: boolean
    message: string
    data: {
        user: SuperadminUserListItem
    }
}

export type UpdateMemberRequest = {
    name?: string
    email?: string
    phone?: string
    department_id?: number | null
    roles?: string[]
    job_title?: string | null
    employee_code?: string
    status?: string
    avatar?: File | null
    remove_avatar?: boolean
}

export type CompanyMemberResponse = {
    success: boolean
    message: string
    data: {
        member: CompanyMemberListItem
    }
}

export async function apiGetSuperadminUsersList<
    T = SuperadminUsersListResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/superadmin/users',
        method: 'get',
        params,
    })
}

export async function apiGetCompanyMembersList<
    T = CompanyMembersListResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/members',
        method: 'get',
        params,
    })
}

export async function apiCreateSuperadminUser<
    T = unknown,
    U extends CreateSuperadminUserRequest = CreateSuperadminUserRequest,
>(data: U) {
    if (data.avatar instanceof File) {
        const formData = new FormData()
        formData.append('name', data.name)
        formData.append('email', data.email)
        formData.append('phone', data.phone)
        formData.append('password', data.password)
        formData.append('password_confirmation', data.password_confirmation)
        formData.append('avatar', data.avatar)

        if (data.locale !== undefined) {
            formData.append('locale', data.locale ?? '')
        }
        if (typeof data.is_active === 'boolean') {
            formData.append('is_active', data.is_active ? '1' : '0')
        }
        if (typeof data.is_superadmin === 'boolean') {
            formData.append('is_superadmin', data.is_superadmin ? '1' : '0')
        }
        if (typeof data.two_factor_enabled === 'boolean') {
            formData.append(
                'two_factor_enabled',
                data.two_factor_enabled ? '1' : '0',
            )
        }

        return ApiService.fetchDataWithAxios<T>({
            url: '/superadmin/users',
            method: 'post',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    }

    return ApiService.fetchDataWithAxios<T>({
        url: '/superadmin/users',
        method: 'post',
        data,
    })
}

export async function apiCreateMember<
    T = unknown,
    U extends CreateMemberRequest = CreateMemberRequest,
>(data: U) {
    if (data.avatar instanceof File) {
        const formData = new FormData()
        formData.append('name', data.name)
        formData.append('email', data.email)
        formData.append('phone', data.phone)
        formData.append('employee_code', data.employee_code)
        formData.append('avatar', data.avatar)

        if (data.job_title !== undefined) {
            formData.append('job_title', data.job_title ?? '')
        }
        if (data.department_id !== undefined) {
            formData.append(
                'department_id',
                data.department_id === null ? '' : String(data.department_id),
            )
        }
        data.roles.forEach((role) => {
            formData.append('roles[]', role)
        })

        return ApiService.fetchDataWithAxios<T>({
            url: '/members',
            method: 'post',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    }

    return ApiService.fetchDataWithAxios<T>({
        url: '/members',
        method: 'post',
        data,
    })
}

export async function apiGetSuperadminUserById<
    T = SuperadminUserResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(userId: string | number, params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/superadmin/users/${userId}`,
        method: 'get',
        params,
    })
}

export async function apiUpdateSuperadminUserById<
    T = SuperadminUserResponse,
    U extends UpdateSuperadminUserRequest = UpdateSuperadminUserRequest,
>(userId: string | number, data: U) {
    if (data.avatar instanceof File || typeof data.remove_avatar === 'boolean') {
        const formData = new FormData()
        formData.append('_method', 'PATCH')

        if (data.name !== undefined) formData.append('name', data.name)
        if (data.email !== undefined) formData.append('email', data.email)
        if (data.phone !== undefined) formData.append('phone', data.phone)
        if (data.password !== undefined) formData.append('password', data.password)
        if (data.password_confirmation !== undefined) {
            formData.append(
                'password_confirmation',
                data.password_confirmation,
            )
        }
        if (data.locale !== undefined) formData.append('locale', data.locale ?? '')
        if (typeof data.is_active === 'boolean') {
            formData.append('is_active', data.is_active ? '1' : '0')
        }
        if (typeof data.is_superadmin === 'boolean') {
            formData.append('is_superadmin', data.is_superadmin ? '1' : '0')
        }
        if (typeof data.two_factor_enabled === 'boolean') {
            formData.append(
                'two_factor_enabled',
                data.two_factor_enabled ? '1' : '0',
            )
        }
        if (data.avatar instanceof File) {
            formData.append('avatar', data.avatar)
        }
        if (typeof data.remove_avatar === 'boolean') {
            formData.append('remove_avatar', data.remove_avatar ? '1' : '0')
        }

        return ApiService.fetchDataWithAxios<T>({
            url: `/superadmin/users/${userId}`,
            method: 'post',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    }

    return ApiService.fetchDataWithAxios<T>({
        url: `/superadmin/users/${userId}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteSuperadminUserById<
    T = { success: boolean; message: string },
>(userId: string | number) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/superadmin/users/${userId}`,
        method: 'delete',
    })
}

export async function apiGetCompanyMemberById<
    T = CompanyMemberResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(memberId: string | number, params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/members/${memberId}`,
        method: 'get',
        params,
    })
}

export async function apiUpdateCompanyMemberById<
    T = CompanyMemberResponse,
    U extends UpdateMemberRequest = UpdateMemberRequest,
>(memberId: string | number, data: U) {
    if (data.avatar instanceof File || typeof data.remove_avatar === 'boolean') {
        const formData = new FormData()
        formData.append('_method', 'PATCH')

        if (data.name !== undefined) formData.append('name', data.name)
        if (data.email !== undefined) formData.append('email', data.email)
        if (data.phone !== undefined) formData.append('phone', data.phone)
        if (data.department_id !== undefined) {
            formData.append(
                'department_id',
                data.department_id === null ? '' : String(data.department_id),
            )
        }
        if (data.job_title !== undefined) {
            formData.append('job_title', data.job_title ?? '')
        }
        if (data.employee_code !== undefined) {
            formData.append('employee_code', data.employee_code)
        }
        if (data.status !== undefined) {
            formData.append('status', data.status)
        }
        if (Array.isArray(data.roles)) {
            data.roles.forEach((role) => {
                formData.append('roles[]', role)
            })
        }
        if (data.avatar instanceof File) {
            formData.append('avatar', data.avatar)
        }
        if (typeof data.remove_avatar === 'boolean') {
            formData.append('remove_avatar', data.remove_avatar ? '1' : '0')
        }

        return ApiService.fetchDataWithAxios<T>({
            url: `/members/${memberId}`,
            method: 'post',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    }

    return ApiService.fetchDataWithAxios<T>({
        url: `/members/${memberId}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteCompanyMemberById<
    T = { success: boolean; message: string },
>(memberId: string | number) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/members/${memberId}`,
        method: 'delete',
    })
}

export async function apiGetCustomersList<T, U extends Record<string, unknown>>(
    params: U,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/customers',
        method: 'get',
        params,
    })
}

export async function apiGetCustomer<T, U extends Record<string, unknown>>({
    id,
    ...params
}: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/customers/${id}`,
        method: 'get',
        params,
    })
}

export async function apiGetCustomerLog<T, U extends Record<string, unknown>>({
    ...params
}: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/customer/log`,
        method: 'get',
        params,
    })
}
