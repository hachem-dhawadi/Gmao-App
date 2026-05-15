import ApiService from './ApiService'

export type ImageItem = {
    id: string
    name: string
    img: string   // blob URL (new upload) or server URL (existing)
    file?: File   // present only for newly selected files
}

export type Item = {
    id: number
    company_id: number
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
    updated_at: string | null
}

export type Warehouse = {
    id: number
    company_id: number
    code: string
    name: string
    location: string | null
    created_at: string | null
    updated_at: string | null
}

export type StockMoveItem = {
    id: number
    code: string
    name: string
    unit: string | null
}

export type StockMoveWarehouse = {
    id: number
    code: string
    name: string
}

export type StockMove = {
    id: number
    company_id: number
    item_id: number
    warehouse_id: number
    work_order_id: number | null
    move_type: 'in' | 'out' | 'adjustment'
    quantity: number
    moved_at: string | null
    reference: string | null
    notes: string | null
    item: StockMoveItem | null
    warehouse: StockMoveWarehouse | null
    created_by: { id: number; name: string | null } | null
}

export type StockByWarehouse = {
    warehouse_id: number
    warehouse_code: string | null
    warehouse_name: string | null
    stock_qty: number
}

export type ItemsListResponse = {
    success: boolean
    message: string
    data: {
        items: Item[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type ItemResponse = {
    success: boolean
    message: string
    data: { item: Item; stock_by_warehouse?: StockByWarehouse[] }
}

export type WarehousesListResponse = {
    success: boolean
    message: string
    data: {
        warehouses: Warehouse[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type StockByItem = {
    item_id: number
    item_code: string | null
    item_name: string | null
    unit: string | null
    min_stock: number | null
    stock_qty: number
}

export type WarehouseResponse = {
    success: boolean
    message: string
    data: { warehouse: Warehouse; stock_by_item?: StockByItem[] }
}

export type StockMovesListResponse = {
    success: boolean
    message: string
    data: {
        stock_moves: StockMove[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type StockMoveResponse = {
    success: boolean
    message: string
    data: { stock_move: StockMove }
}

// Items use FormData for create/update to support image uploads

export type CreateWarehouseRequest = {
    code: string
    name: string
    location?: string | null
}

export type UpdateWarehouseRequest = Partial<CreateWarehouseRequest>

export type CreateStockMoveRequest = {
    item_id: number
    warehouse_id: number
    work_order_id?: number | null
    move_type: 'in' | 'out' | 'adjustment'
    quantity: number
    moved_at?: string | null
    reference?: string | null
    notes?: string | null
}

// Items
export async function apiGetItemsList<
    T = ItemsListResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/inventory/items',
        method: 'get',
        params,
    })
}

export async function apiGetItemById<T = ItemResponse>(id: string | number) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/inventory/items/${id}`,
        method: 'get',
    })
}

export async function apiCreateItem<T = ItemResponse>(data: FormData) {
    return ApiService.fetchDataWithAxios<T, unknown>({
        url: '/inventory/items',
        method: 'post',
        data,
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}

export async function apiUpdateItem<T = ItemResponse>(
    id: string | number,
    data: FormData,
) {
    // POST with _method=PATCH in FormData — PHP parses multipart only for POST
    return ApiService.fetchDataWithAxios<T, unknown>({
        url: `/inventory/items/${id}`,
        method: 'post',
        data,
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}

export async function apiDeleteItem<T = { success: boolean; message: string }>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/inventory/items/${id}`,
        method: 'delete',
    })
}

// Warehouses
export async function apiGetWarehousesList<
    T = WarehousesListResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/inventory/warehouses',
        method: 'get',
        params,
    })
}

export async function apiGetWarehouseById<T = WarehouseResponse>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/inventory/warehouses/${id}`,
        method: 'get',
    })
}

export async function apiCreateWarehouse<T = WarehouseResponse>(
    data: CreateWarehouseRequest,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/inventory/warehouses',
        method: 'post',
        data,
    })
}

export async function apiUpdateWarehouse<T = WarehouseResponse>(
    id: string | number,
    data: UpdateWarehouseRequest,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/inventory/warehouses/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteWarehouse<T = { success: boolean; message: string }>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/inventory/warehouses/${id}`,
        method: 'delete',
    })
}

// Stock Moves
export async function apiGetStockMovesList<
    T = StockMovesListResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/inventory/stock-moves',
        method: 'get',
        params,
    })
}

export async function apiCreateStockMove<T = StockMoveResponse>(
    data: CreateStockMoveRequest,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/inventory/stock-moves',
        method: 'post',
        data,
    })
}

export async function apiDeleteStockMove<T = { success: boolean; message: string }>(
    id: number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/inventory/stock-moves/${id}`,
        method: 'delete',
    })
}
