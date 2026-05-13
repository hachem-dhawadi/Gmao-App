export type AssetFormSchema = {
    name: string
    code: string
    asset_type_id: number | null
    status: 'active' | 'inactive' | 'under_maintenance' | 'decommissioned'
    serial_number: string
    manufacturer: string
    model: string
    location: string
    address_label: string
    notes: string
    purchase_date: string
    warranty_end_at: string
    installed_at: string
}
