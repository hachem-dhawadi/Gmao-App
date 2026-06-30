import api from './ApiService'

export type Supplier = {
    id: number
    name: string
    email: string | null
    phone: string | null
    address: string | null
    contact_name: string | null
    tax_number: string | null
    created_at: string | null
}

export type PoLine = {
    id: number
    item: { id: number; code: string; name: string; unit: string | null } | null
    qty_ordered: number
    qty_received: number
    qty_pending: number
    unit_price: number
    line_total: number
}

export type PurchaseOrder = {
    id: number
    code: string
    status: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled'
    supplier_reference: string | null
    supplier_note: string | null
    total_amount: number
    ordered_at: string | null
    expected_delivery_at: string | null
    created_at: string | null
    supplier: {
        id: number
        name: string
        email: string | null
        phone: string | null
        contact_name: string | null
        address: string | null
    } | null
    created_by: { id: number; name: string | null } | null
    approved_by: { id: number; name: string | null } | null
    lines: PoLine[]
    receipts_count: number
    invoice_number: string | null
    invoice_date: string | null
    invoice_amount: number | null
    payment_status: 'pending' | 'paid' | 'disputed' | null
    paid_at: string | null
    payment_method: 'bank_transfer' | 'paypal' | 'check' | 'cash' | 'credit_card' | null
    payment_reference: string | null
    payment_note: string | null
    has_payment_proof: boolean
}

export type Receipt = {
    id: number
    received_at: string | null
    po_code: string | null
    po_id: number | null
    supplier: string | null
    lines: {
        item: { id: number; name: string; code: string } | null
        qty_received: number
        unit_price: number
    }[]
}

export type SuppliersResponse = {
    success: boolean
    data: {
        suppliers: Supplier[]
        pagination: { current_page: number; per_page: number; total: number; last_page: number }
    }
}

export type PurchaseOrdersResponse = {
    success: boolean
    data: {
        purchase_orders: PurchaseOrder[]
        pagination: { current_page: number; per_page: number; total: number; last_page: number }
    }
}

export type PurchaseOrderResponse = {
    success: boolean
    data: { purchase_order: PurchaseOrder }
}

export type ReceiptsResponse = {
    success: boolean
    data: {
        receipts: Receipt[]
        pagination: { current_page: number; per_page: number; total: number; last_page: number }
    }
}

export async function apiGetPurchaseOrders(params?: Record<string, unknown>) {
    return api.get<PurchaseOrdersResponse>('/purchasing/orders', { params })
}

export async function apiGetPurchaseOrderById(id: number) {
    return api.get<PurchaseOrderResponse>(`/purchasing/orders/${id}`)
}

export async function apiGetSuppliers(params?: Record<string, unknown>) {
    return api.get<SuppliersResponse>('/purchasing/suppliers', { params })
}

export async function apiGetReceipts(params?: Record<string, unknown>) {
    return api.get<ReceiptsResponse>('/purchasing/receipts', { params })
}
