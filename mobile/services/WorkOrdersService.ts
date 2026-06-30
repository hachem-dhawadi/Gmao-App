import api from './ApiService'

export type WorkOrderMember = {
    id: number
    name: string | null
}

export type WorkOrderComment = {
    id: number
    body: string
    author: string
    member_id: number
    created_at: string | null
}

export type WorkOrderAttachment = {
    id: number
    original_name: string
    mime_type: string | null
    size_bytes: number | null
    url: string | null
    author: string
    created_at: string | null
}

export type WoChecklistItem = {
    id: number
    title: string
    is_completed: boolean
    completed_at: string | null
    completed_by: string | null
    order_index: number
}

export type WorkLog = {
    id: number
    author: string
    member_id: number
    labor_minutes: number
    labor_cost: number | null
    notes: string | null
    created_at: string | null
}

export type WorkOrder = {
    id: number
    code: string
    title: string
    description: string | null
    status: 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'pending_approval' | 'rejected'
    priority: 'low' | 'medium' | 'high' | 'critical'
    due_at: string | null
    created_at: string | null
    failure_code: string | null
    root_cause: string | null
    resolution_notes: string | null
    asset: { id: number; code: string; name: string; location?: string | null } | null
    created_by: { id: number; name: string | null } | null
    assigned_member: WorkOrderMember | null
    comments: WorkOrderComment[] | null
    attachments: WorkOrderAttachment[] | null
    checklist_items: WoChecklistItem[] | null
    work_logs: WorkLog[] | null
}

export type WorkOrdersListResponse = {
    success: boolean
    data: {
        work_orders: WorkOrder[]
        pagination: { current_page: number; per_page: number; total: number; last_page: number }
    }
}

export type WorkOrderResponse = {
    success: boolean
    data: { work_order: WorkOrder }
}

export async function apiGetWorkOrders(params?: Record<string, unknown>) {
    return api.get<WorkOrdersListResponse>('/work-orders', { params })
}

export async function apiGetWorkOrder(id: string | number) {
    return api.get<WorkOrderResponse>(`/work-orders/${id}`)
}

export async function apiUpdateWorkOrder(id: string | number, data: Record<string, unknown>) {
    return api.patch<WorkOrderResponse>(`/work-orders/${id}`, data)
}

export async function apiAddWorkOrderComment(workOrderId: string | number, body: string) {
    return api.post<{ success: boolean; data: WorkOrderComment }>(`/work-orders/${workOrderId}/comments`, { body })
}

export async function apiDeleteWorkOrderComment(workOrderId: string | number, commentId: number) {
    return api.delete(`/work-orders/${workOrderId}/comments/${commentId}`)
}

export async function apiToggleChecklistItem(workOrderId: string | number, itemId: number) {
    return api.post(`/work-orders/${workOrderId}/checklist/${itemId}/toggle`)
}

export async function apiAddWorkLog(
    woId: string | number,
    data: { labor_minutes: number; labor_cost?: number | null; notes?: string | null },
) {
    return api.post<{ success: boolean; data: WorkLog }>(`/work-orders/${woId}/work-logs`, data)
}

export async function apiUpdateWorkLog(
    woId: string | number,
    logId: number,
    data: { labor_minutes: number; labor_cost?: number | null; notes?: string | null },
) {
    return api.patch<{ success: boolean; data: WorkLog }>(`/work-orders/${woId}/work-logs/${logId}`, data)
}

export async function apiDeleteWorkLog(woId: string | number, logId: number) {
    return api.delete(`/work-orders/${woId}/work-logs/${logId}`)
}

export async function apiAddWoAttachment(
    woId: string | number,
    file: { uri: string; name: string; type: string },
) {
    const form = new FormData()
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)
    return api.post<{ success: boolean; data: WorkOrderAttachment }>(
        `/work-orders/${woId}/attachments`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    )
}

export async function apiDeleteWoAttachment(woId: string | number, attachmentId: number) {
    return api.delete(`/work-orders/${woId}/attachments/${attachmentId}`)
}

export type WoPart = {
    id: number
    move_type: 'out' | 'adjustment'
    quantity: number    // negative (backend stores as -qty)
    notes: string | null
    item:       { id: number; code: string; name: string; unit: string | null } | null
    warehouse:  { id: number; code: string | null; name: string | null } | null
    created_by: { id: number; name: string | null } | null
}

export async function apiGetWoParts(woId: string | number) {
    return api.get<{ success: boolean; data: { parts: WoPart[] } }>(`/work-orders/${woId}/parts`)
}

export async function apiRecordWoPart(woId: string | number, data: {
    item_id: number
    warehouse_id: number
    usage_type: 'used' | 'scrapped'
    quantity: number
}) {
    return api.post<{ success: boolean; data: { part: WoPart } }>(`/work-orders/${woId}/parts`, data)
}

export async function apiApproveWorkOrder(id: string | number) {
    return api.post<WorkOrderResponse>(`/work-orders/${id}/approve`)
}

export async function apiRejectWorkOrder(id: string | number, reason?: string) {
    return api.post<WorkOrderResponse>(`/work-orders/${id}/reject`, { reason: reason || undefined })
}

export async function apiCreateWorkOrder(data: {
    title: string
    asset_id?: number | null
    priority?: string
    description?: string | null
    due_at?: string | null
    estimated_minutes?: number | null
    assigned_member_id?: number | null
}) {
    return api.post<WorkOrderResponse>('/work-orders', data)
}
