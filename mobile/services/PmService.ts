import api from './ApiService'

export type PmTrigger = {
    id: number
    type: string
    interval_value: number
    interval_unit: 'days' | 'weeks' | 'months'
    next_run_at: string | null
    last_run_at: string | null
}

export type PmTask = {
    id: number
    title: string
    order_index: number
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
    asset: { id: number; code: string; name: string } | null
    assigned_to: { id: number; name: string | null } | null
    created_by: { id: number; name: string | null } | null
    trigger: PmTrigger | null
    tasks: PmTask[]
}

export type PmPlansListResponse = {
    success: boolean
    data: {
        pm_plans: PmPlan[]
        pagination: { current_page: number; per_page: number; total: number; last_page: number }
    }
}

export type PmPlanResponse = {
    success: boolean
    data: { pm_plan: PmPlan }
}

export function pmFrequencyLabel(trigger: PmTrigger | null): string {
    if (!trigger) return '—'
    const { interval_value: v, interval_unit: u } = trigger
    if (u === 'days' && v === 7)   return 'Weekly'
    if (u === 'months' && v === 1) return 'Monthly'
    if (u === 'months' && v === 3) return 'Quarterly'
    if (u === 'months' && v === 6) return 'Bi-Annual'
    if (u === 'months' && v === 12 || u === 'days' && v === 365) return 'Annual'
    return `${v} ${u}`
}

export function pmIsOverdue(plan: PmPlan): boolean {
    if (!plan.trigger?.next_run_at) return false
    return new Date(plan.trigger.next_run_at) < new Date()
}

export async function apiGetPmPlans(params?: Record<string, unknown>) {
    return api.get<PmPlansListResponse>('/pm/plans', { params })
}

export async function apiGetPmPlan(id: string | number) {
    return api.get<PmPlanResponse>(`/pm/plans/${id}`)
}
