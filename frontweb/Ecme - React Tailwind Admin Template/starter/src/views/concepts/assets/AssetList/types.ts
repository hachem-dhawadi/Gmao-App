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
    images?: string[]
    asset_type: { id: number; name: string; code: string } | null
}
