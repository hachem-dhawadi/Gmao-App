import api from './ApiService'

export type WorkOrderMember = {
    id: number
    name: string | null
    assigned_at: string
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
    status: 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
    priority: 'low' | 'medium' | 'high' | 'critical'
    due_at: string | null
    created_at: string | null
    asset: { id: number; code: string; name: string; location?: string | null } | null
    created_by: { id: number; name: string | null } | null
    assigned_members: WorkOrderMember[]
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
