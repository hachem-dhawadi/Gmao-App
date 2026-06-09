import ApiService from './ApiService'

export type Site = {
    id: number
    company_id: number
    name: string
    code: string
    description: string | null
    address: string | null
    phone: string | null
    timezone: string
    is_active: boolean
    geo_lat: number | null
    geo_lng: number | null
    created_at: string | null
    updated_at: string | null
    archived_at: string | null
    assets_count?: number | null
    members_count?: number | null
    warehouses_count?: number | null
}

export type SitesListResponse = {
    success: boolean
    message: string
    data: {
        sites: Site[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type SiteResponse = {
    success: boolean
    message: string
    data: { site: Site }
}

export type CreateSiteRequest = {
    name: string
    code: string
    description?: string | null
    address?: string | null
    phone: string
    timezone?: string
    is_active?: boolean
    geo_lat?: number | null
    geo_lng?: number | null
}

export type UpdateSiteRequest = {
    name?: string
    code?: string
    description?: string | null
    address?: string | null
    phone?: string
    timezone?: string
    is_active?: boolean
    geo_lat?: number | null
    geo_lng?: number | null
}

export async function apiGetSitesList<
    T = SitesListResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/sites',
        method: 'get',
        params,
    })
}

export async function apiGetAllSites<T = { success: boolean; data: { sites: Pick<Site, 'id' | 'name' | 'code'>[] } }>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/sites/all',
        method: 'get',
    })
}

export async function apiGetSiteById<T = SiteResponse>(id: string | number) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/sites/${id}`,
        method: 'get',
    })
}

export async function apiCreateSite<T = SiteResponse>(data: CreateSiteRequest) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/sites',
        method: 'post',
        data,
    })
}

export async function apiUpdateSite<T = SiteResponse>(
    id: string | number,
    data: UpdateSiteRequest,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/sites/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteSite<T = { success: boolean; message: string }>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/sites/${id}`,
        method: 'delete',
    })
}
