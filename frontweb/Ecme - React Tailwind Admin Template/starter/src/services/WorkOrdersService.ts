import ApiService from './ApiService'

export type WorkOrderMember = {
    id: number
    name: string | null
    assigned_at: string
}

export type WorkOrderStatusHistory = {
    id: number
    old_status: string
    new_status: string
    note: string | null
    changed_at: string | null
    changed_by: string | null
}

export type WorkOrderAsset = {
    id: number
    code: string
    name: string
}

export type WorkOrderCreatedBy = {
    id: number
    name: string | null
}

export type WorkLog = {
    id: number
    member_id: number
    author: string
    labor_minutes: number
    labor_cost: number | null
    notes: string | null
    created_at: string | null
}

export type WorkLogSummary = {
    total_minutes: number
    total_cost: number
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

export type WorkOrder = {
    id: number
    company_id: number
    code: string
    title: string
    description: string | null
    status: 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
    priority: 'low' | 'medium' | 'high' | 'critical'
    asset_id: number
    created_by_member_id: number
    closed_by_member_id: number | null
    opened_at: string | null
    due_at: string | null
    closed_at: string | null
    estimated_minutes: number | null
    created_at: string | null
    updated_at: string | null
    asset: WorkOrderAsset | null
    created_by: WorkOrderCreatedBy | null
    assigned_members: WorkOrderMember[]
    status_history: WorkOrderStatusHistory[] | null
    comments: WorkOrderComment[] | null
    attachments: WorkOrderAttachment[] | null
    work_logs: WorkLog[] | null
    work_logs_summary: WorkLogSummary | null
}

export type WorkOrdersListResponse = {
    success: boolean
    message: string
    data: {
        work_orders: WorkOrder[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type WorkOrderResponse = {
    success: boolean
    message: string
    data: { work_order: WorkOrder }
}

export type CreateWorkOrderRequest = {
    title: string
    asset_id: number
    code?: string | null
    status: string
    priority: string
    description?: string | null
    due_at?: string | null
    estimated_minutes?: number | null
    assigned_member_ids?: number[]
}

export type UpdateWorkOrderRequest = {
    title?: string
    asset_id?: number
    code?: string | null
    status?: string
    priority?: string
    description?: string | null
    due_at?: string | null
    estimated_minutes?: number | null
    assigned_member_ids?: number[]
}

export async function apiGetWorkOrdersList<
    T = WorkOrdersListResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/work-orders',
        method: 'get',
        params,
    })
}

export async function apiGetWorkOrderById<T = WorkOrderResponse>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/work-orders/${id}`,
        method: 'get',
    })
}

export async function apiCreateWorkOrder<T = WorkOrderResponse>(
    data: CreateWorkOrderRequest,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/work-orders',
        method: 'post',
        data,
    })
}

export async function apiUpdateWorkOrder<T = WorkOrderResponse>(
    id: string | number,
    data: UpdateWorkOrderRequest,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/work-orders/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteWorkOrder<T = { success: boolean; message: string }>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/work-orders/${id}`,
        method: 'delete',
    })
}

export async function apiAddWorkOrderComment<T = { success: boolean; data: WorkOrderComment }>(
    workOrderId: string | number,
    body: string,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/work-orders/${workOrderId}/comments`,
        method: 'post',
        data: { body },
    })
}

export async function apiDeleteWorkOrderComment<T = { success: boolean }>(
    workOrderId: string | number,
    commentId: number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/work-orders/${workOrderId}/comments/${commentId}`,
        method: 'delete',
    })
}

export async function apiAddWorkOrderAttachment<T = { success: boolean; data: WorkOrderAttachment }>(
    workOrderId: string | number,
    file: File,
) {
    const formData = new FormData()
    formData.append('file', file)
    return ApiService.fetchDataWithAxios<T>({
        url: `/work-orders/${workOrderId}/attachments`,
        method: 'post',
        data: formData as unknown as Record<string, unknown>,
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}

export async function apiDeleteWorkOrderAttachment<T = { success: boolean }>(
    workOrderId: string | number,
    attachmentId: number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/work-orders/${workOrderId}/attachments/${attachmentId}`,
        method: 'delete',
    })
}

export function getAttachmentDownloadUrl(workOrderId: string | number, attachmentId: number) {
    return `/api/v1/work-orders/${workOrderId}/attachments/${attachmentId}/download`
}

export async function apiGetWorkLogs(workOrderId: string | number) {
    return ApiService.fetchDataWithAxios<{
        success: boolean
        data: { logs: WorkLog[]; summary: WorkLogSummary }
    }>({
        url: `/work-orders/${workOrderId}/work-logs`,
        method: 'get',
    })
}

export async function apiAddWorkLog(
    workOrderId: string | number,
    data: {
        labor_minutes: number
        labor_cost?: number | null
        notes?: string | null
    },
) {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: WorkLog }>({
        url: `/work-orders/${workOrderId}/work-logs`,
        method: 'post',
        data,
    })
}

export async function apiUpdateWorkLog(
    workOrderId: string | number,
    workLogId: number,
    data: {
        labor_minutes?: number
        labor_cost?: number | null
        notes?: string | null
    },
) {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: WorkLog }>({
        url: `/work-orders/${workOrderId}/work-logs/${workLogId}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteWorkLog(workOrderId: string | number, workLogId: number) {
    return ApiService.fetchDataWithAxios<{ success: boolean }>({
        url: `/work-orders/${workOrderId}/work-logs/${workLogId}`,
        method: 'delete',
    })
}
