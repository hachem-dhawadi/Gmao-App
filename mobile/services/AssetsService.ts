import api from './ApiService'

export type Asset = {
    id: number
    code: string
    name: string
    status: 'active' | 'inactive' | 'under_maintenance' | 'decommissioned'
    serial_number: string | null
    manufacturer: string | null
    model: string | null
    location: string | null
    notes: string | null
    purchase_date: string | null
    warranty_end_at: string | null
    installed_at: string | null
    created_at: string | null
    asset_type: { id: number; name: string; code: string } | null
}

export type AssetsListResponse = {
    success: boolean
    data: {
        assets: Asset[]
        pagination: { current_page: number; per_page: number; total: number; last_page: number }
    }
}

export type AssetResponse = {
    success: boolean
    data: { asset: Asset }
}

export async function apiGetAssets(params?: Record<string, unknown>) {
    return api.get<AssetsListResponse>('/assets', { params })
}

export async function apiGetAsset(id: string | number) {
    return api.get<AssetResponse>(`/assets/${id}`)
}
