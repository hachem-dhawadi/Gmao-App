import api from './ApiService'

export type InventoryItem = {
    id: number
    code: string
    name: string
    description: string | null
    barcode: string | null
    unit: string | null
    unit_cost: number | null
    min_stock: number | null
    is_stocked: boolean
    images: string[]
    total_stock: number
    created_at: string | null
}

export type ItemsListResponse = {
    success: boolean
    data: {
        items: InventoryItem[]
        pagination: { current_page: number; per_page: number; total: number; last_page: number }
    }
}

export type ItemResponse = {
    success: boolean
    data: {
        item: InventoryItem
        stock_by_warehouse: {
            warehouse_id: number
            warehouse_code: string | null
            warehouse_name: string | null
            stock_qty: number
        }[]
    }
}

export async function apiGetItems(params?: Record<string, unknown>) {
    return api.get<ItemsListResponse>('/inventory/items', { params })
}

export async function apiGetItem(id: number) {
    return api.get<ItemResponse>(`/inventory/items/${id}`)
}
