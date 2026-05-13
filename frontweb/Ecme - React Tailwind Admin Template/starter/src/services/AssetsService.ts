import ApiService from './ApiService'

export type AssetType = {
    id: number
    name: string
    code: string
}

export type Asset = {
    id: number
    company_id: number
    asset_type_id: number
    code: string
    name: string
    status: 'active' | 'inactive' | 'under_maintenance' | 'decommissioned'
    serial_number: string | null
    manufacturer: string | null
    model: string | null
    location: string | null
    address_label: string | null
    notes: string | null
    purchase_date: string | null
    warranty_end_at: string | null
    installed_at: string | null
    created_at: string | null
    updated_at: string | null
    asset_type: AssetType | null
}

export type AssetsListResponse = {
    success: boolean
    message: string
    data: {
        assets: Asset[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type AssetResponse = {
    success: boolean
    message: string
    data: { asset: Asset }
}

export type AssetTypesResponse = {
    success: boolean
    message: string
    data: { asset_types: AssetType[] }
}

export type CreateAssetRequest = {
    name: string
    code: string
    asset_type_id: number
    status: string
    serial_number?: string | null
    manufacturer?: string | null
    model?: string | null
    location?: string | null
    address_label?: string | null
    notes?: string | null
    purchase_date?: string | null
    warranty_end_at?: string | null
    installed_at?: string | null
}

export type UpdateAssetRequest = {
    name?: string
    code?: string
    asset_type_id?: number
    status?: string
    serial_number?: string | null
    manufacturer?: string | null
    model?: string | null
    location?: string | null
    address_label?: string | null
    notes?: string | null
    purchase_date?: string | null
    warranty_end_at?: string | null
    installed_at?: string | null
}

export async function apiGetAssetTypes<T = AssetTypesResponse>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/asset-types',
        method: 'get',
    })
}

export async function apiGetAssetsList<
    T = AssetsListResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/assets',
        method: 'get',
        params,
    })
}

export async function apiGetAssetById<T = AssetResponse>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/assets/${id}`,
        method: 'get',
    })
}

export async function apiCreateAsset<T = AssetResponse>(
    data: CreateAssetRequest,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/assets',
        method: 'post',
        data,
    })
}

export async function apiUpdateAsset<T = AssetResponse>(
    id: string | number,
    data: UpdateAssetRequest,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/assets/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteAsset<T = { success: boolean; message: string }>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/assets/${id}`,
        method: 'delete',
    })
}
