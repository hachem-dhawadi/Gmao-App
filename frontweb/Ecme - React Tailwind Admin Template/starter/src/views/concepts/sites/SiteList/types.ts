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
}
