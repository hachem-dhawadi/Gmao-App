import ApiService from './ApiService'

export type SuperadminCompany = {
    id: number
    name: string
    legal_name: string | null
    phone: string | null
    email: string | null
    address_line1: string | null
    address_line2: string | null
    city: string | null
    postal_code: string | null
    country: string | null
    logo_path: string | null
    logo_url: string | null
    timezone: string
    is_active: boolean
    approval_status: 'pending' | 'approved' | 'rejected' | string
    members_count: number
    created_at: string
    updated_at: string
}

export type SuperadminCompaniesResponse = {
    success: boolean
    message: string
    data: {
        companies: SuperadminCompany[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type SuperadminCompanyResponse = {
    success: boolean
    message: string
    data: {
        company: SuperadminCompany
    }
}

export type SuperadminUpdateCompanyRequest = {
    name?: string
    legal_name?: string | null
    phone?: string | null
    email?: string | null
    address_line1?: string | null
    address_line2?: string | null
    city?: string | null
    postal_code?: string | null
    country?: string | null
    timezone?: string
    settings_json?: string | null
    is_active?: boolean
    approval_status?: 'pending' | 'approved' | 'rejected'
    logo?: File | null
}

const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(
    /\/$/,
    '',
)

export function resolveCompanyLogoUrl(
    company: Pick<SuperadminCompany, 'logo_path' | 'logo_url'>,
): string {
    if (company.logo_path && backendBaseUrl) {
        return `${backendBaseUrl}/storage/${company.logo_path.replace(/^\/+/, '')}`
    }

    if (company.logo_url) {
        if (
            company.logo_url.startsWith('http://') ||
            company.logo_url.startsWith('https://')
        ) {
            return company.logo_url
        }

        if (backendBaseUrl) {
            return `${backendBaseUrl}${company.logo_url.startsWith('/') ? '' : '/'}${company.logo_url}`
        }

        return company.logo_url
    }

    return ''
}

function buildCompanyFormData(data: SuperadminUpdateCompanyRequest): FormData {
    const formData = new FormData()

    const appendString = (
        key: keyof Omit<
            SuperadminUpdateCompanyRequest,
            'is_active' | 'logo'
        >,
        value: string | null | undefined,
    ) => {
        if (value !== undefined) {
            formData.append(key, value ?? '')
        }
    }

    appendString('name', data.name)
    appendString('legal_name', data.legal_name)
    appendString('phone', data.phone)
    appendString('email', data.email)
    appendString('address_line1', data.address_line1)
    appendString('address_line2', data.address_line2)
    appendString('city', data.city)
    appendString('postal_code', data.postal_code)
    appendString('country', data.country)
    appendString('timezone', data.timezone)
    appendString('settings_json', data.settings_json)

    if (typeof data.is_active === 'boolean') {
        formData.append('is_active', data.is_active ? '1' : '0')
    }

    if (data.approval_status) {
        formData.append('approval_status', data.approval_status)
    }

    if (data.logo instanceof File) {
        formData.append('logo', data.logo)
    }

    formData.append('_method', 'PATCH')

    return formData
}

export async function apiGetCompaniesList<
    T = SuperadminCompaniesResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params: U) {
    const normalizedParams: Record<string, unknown> = {
        ...params,
    }

    if (typeof normalizedParams.pageIndex === 'number') {
        normalizedParams.page = normalizedParams.pageIndex
        delete normalizedParams.pageIndex
    }

    if (typeof normalizedParams.pageSize === 'number') {
        normalizedParams.per_page = normalizedParams.pageSize
        delete normalizedParams.pageSize
    }

    return ApiService.fetchDataWithAxios<T>({
        url: '/superadmin/companies',
        method: 'get',
        params: normalizedParams,
    })
}

export async function apiGetCompany<
    T = SuperadminCompanyResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>({ id, ...params }: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/superadmin/companies/${id}`,
        method: 'get',
        params,
    })
}

export async function apiUpdateCompany<
    T = SuperadminCompanyResponse,
    U extends SuperadminUpdateCompanyRequest = SuperadminUpdateCompanyRequest,
>(id: string | number, data: U) {
    if (data.logo instanceof File) {
        return ApiService.fetchDataWithAxios<T>({
            url: `/superadmin/companies/${id}`,
            method: 'post',
            data: buildCompanyFormData(data),
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    }

    return ApiService.fetchDataWithAxios<T>({
        url: `/superadmin/companies/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteCompany<T = { success: boolean; message: string }>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/superadmin/companies/${id}`,
        method: 'delete',
    })
}

