import ApiService from './ApiService'

export type PmTrigger = {
    id: number
    type: string
    interval_value: number
    interval_unit: 'days' | 'weeks' | 'months'
    next_run_at: string | null
    last_run_at: string | null
}

export type PmAsset = {
    id: number
    code: string
    name: string
}

export type PmMember = {
    id: number
    name: string | null
}

export type PmPlan = {
    id: number
    code: string
    name: string
    description: string | null
    status: 'active' | 'inactive' | 'draft'
    priority: 'low' | 'medium' | 'high' | 'critical'
    estimated_minutes: number | null
    created_at: string | null
    asset: PmAsset | null
    assigned_to: PmMember | null
    created_by: PmMember | null
    trigger: PmTrigger | null
}

export type PmPlansListResponse = {
    success: boolean
    message: string
    data: {
        pm_plans: PmPlan[]
        pagination: {
            current_page: number
            per_page: number
            total: number
            last_page: number
        }
    }
}

export type PmPlanResponse = {
    success: boolean
    message: string
    data: { pm_plan: PmPlan }
}

export type CreatePmPlanRequest = {
    name: string
    description?: string | null
    status: string
    priority: string
    estimated_minutes?: number | null
    asset_id?: number | null
    assigned_member_id?: number | null
    trigger: {
        type: 'time_based'
        interval_value: number
        interval_unit: 'days' | 'weeks' | 'months'
        next_run_at?: string | null
    }
}

export async function apiGetPmPlansList<
    T = PmPlansListResponse,
    U extends Record<string, unknown> = Record<string, unknown>,
>(params?: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/pm/plans',
        method: 'get',
        params,
    })
}

export async function apiGetPmPlanById<T = PmPlanResponse>(id: string | number) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/pm/plans/${id}`,
        method: 'get',
    })
}

export async function apiCreatePmPlan<T = PmPlanResponse>(data: CreatePmPlanRequest) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/pm/plans',
        method: 'post',
        data,
    })
}

export async function apiUpdatePmPlan<T = PmPlanResponse>(
    id: string | number,
    data: Partial<CreatePmPlanRequest>,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/pm/plans/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeletePmPlan<T = { success: boolean; message: string }>(
    id: string | number,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/pm/plans/${id}`,
        method: 'delete',
    })
}
