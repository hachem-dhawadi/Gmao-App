import ApiService from './ApiService'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function apiGetSuppliers(params?: Record<string, unknown>) {
    return ApiService.fetchDataWithAxios<SuppliersResponse>({ url: '/purchasing/suppliers', method: 'get', params })
}

export async function apiCreateSupplier(data: Omit<Supplier, 'id' | 'created_at'>) {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: { supplier: Supplier } }>({
        url: '/purchasing/suppliers', method: 'post', data,
    })
}

export async function apiUpdateSupplier(id: number, data: Partial<Omit<Supplier, 'id' | 'created_at'>>) {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: { supplier: Supplier } }>({
        url: `/purchasing/suppliers/${id}`, method: 'patch', data,
    })
}

export async function apiDeleteSupplier(id: number) {
    return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
        url: `/purchasing/suppliers/${id}`, method: 'delete',
    })
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export async function apiGetPurchaseOrders(params?: Record<string, unknown>) {
    return ApiService.fetchDataWithAxios<PurchaseOrdersResponse>({ url: '/purchasing/orders', method: 'get', params })
}

export async function apiGetPurchaseOrderById(id: number | string) {
    return ApiService.fetchDataWithAxios<PurchaseOrderResponse>({ url: `/purchasing/orders/${id}`, method: 'get' })
}

export type CreatePoPayload = {
    supplier_id: number
    status: 'draft' | 'ordered'
    supplier_reference?: string | null
    expected_delivery_at?: string | null
    supplier_note?: string | null
    lines: { item_id: number; qty_ordered: number; unit_price: number }[]
}

export async function apiCreatePurchaseOrder(data: CreatePoPayload) {
    return ApiService.fetchDataWithAxios<PurchaseOrderResponse>({ url: '/purchasing/orders', method: 'post', data })
}

export type UpdatePoPayload = {
    status?: 'draft' | 'ordered' | 'cancelled'
    supplier_id?: number | null
    supplier_reference?: string | null
    expected_delivery_at?: string | null
    supplier_note?: string | null
    lines?: { item_id: number; qty_ordered: number; unit_price: number }[]
}

export async function apiUpdatePurchaseOrder(id: number | string, data: UpdatePoPayload) {
    return ApiService.fetchDataWithAxios<PurchaseOrderResponse>({ url: `/purchasing/orders/${id}`, method: 'patch', data })
}

export async function apiDeletePurchaseOrder(id: number | string) {
    return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
        url: `/purchasing/orders/${id}`, method: 'delete',
    })
}

export async function apiRecordInvoice(
    id: number | string,
    data: { invoice_number: string; invoice_date: string; invoice_amount: number },
) {
    return ApiService.fetchDataWithAxios<PurchaseOrderResponse>({
        url: `/purchasing/orders/${id}/invoice`, method: 'post', data,
    })
}

export type MarkAsPaidPayload = {
    payment_method: string
    payment_reference?: string | null
    payment_note?: string | null
    proof_file?: File | null
}

export async function apiMarkAsPaid(id: number | string, payload: MarkAsPaidPayload) {
    const formData = new FormData()
    formData.append('payment_method', payload.payment_method)
    if (payload.payment_reference) formData.append('payment_reference', payload.payment_reference)
    if (payload.payment_note) formData.append('payment_note', payload.payment_note)
    if (payload.proof_file) formData.append('proof_file', payload.proof_file)
    return ApiService.fetchDataWithAxios<PurchaseOrderResponse>({
        url: `/purchasing/orders/${id}/pay`, method: 'post', data: formData,
    })
}

export async function apiDownloadPaymentProof(id: number | string) {
    return ApiService.fetchDataWithAxios<Blob>({
        url: `/purchasing/orders/${id}/payment-proof`, method: 'get', responseType: 'blob',
    })
}

export async function apiReopenPurchaseOrder(id: number | string) {
    return ApiService.fetchDataWithAxios<PurchaseOrderResponse>({
        url: `/purchasing/orders/${id}/reopen`, method: 'post',
    })
}

export async function apiDisputeInvoice(
    id: number | string,
    data: { payment_note: string },
) {
    return ApiService.fetchDataWithAxios<PurchaseOrderResponse>({
        url: `/purchasing/orders/${id}/dispute`, method: 'post', data,
    })
}

export async function apiReceivePurchaseOrder(
    id: number | string,
    data: { warehouse_id: number; lines: { purchase_order_line_id: number; qty_received: number }[] },
) {
    return ApiService.fetchDataWithAxios<PurchaseOrderResponse>({
        url: `/purchasing/orders/${id}/receive`, method: 'post', data,
    })
}

export async function apiSendPoToSupplier(id: number | string) {
    return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>({
        url: `/purchasing/orders/${id}/send-to-supplier`, method: 'post',
    })
}

// ── Receipts ──────────────────────────────────────────────────────────────────

export async function apiGetReceipts(params?: Record<string, unknown>) {
    return ApiService.fetchDataWithAxios<ReceiptsResponse>({ url: '/purchasing/receipts', method: 'get', params })
}
