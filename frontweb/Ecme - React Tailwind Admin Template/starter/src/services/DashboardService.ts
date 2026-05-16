import ApiService from './ApiService'

// ── GMAO role-based dashboard types ──────────────────────────────────

export type RecentWorkOrder = {
    id: number; code: string; title: string; status: string
    priority: string; asset: { name: string } | null
    created_at: string | null; due_at: string | null
}
export type PmDueSoon = {
    id: number; code: string; name: string; priority: string
    assigned_to: string | null; next_run_at: string | null
}
export type AdminManagerDashboard = {
    work_orders: { open: number; in_progress: number; on_hold: number; overdue: number; completed_month: number }
    pm: { active: number; due_week: number; due_month: number }
    assets: { total: number }
    members: { total_active: number; technicians: number }
    monthly_stats: { month: string; active: number; completed: number }[]
    recent_work_orders: RecentWorkOrder[]
    pm_due_soon: PmDueSoon[]
}
export type TechnicianDashboard = {
    my_work_orders: {
        open: number; in_progress: number; overdue: number; completed_week: number
        open_grow_shrink: number; in_progress_grow_shrink: number
        completion_grow_shrink: number; done_week_grow_shrink: number
    }
    my_pm: { due_week: number; due_month: number }
    performance_scores: { completion: number; on_time: number; response: number; workload: number; efficiency: number }
    monthly_stats: { month: string; active: number; completed: number }[]
    my_recent_work_orders: { id: number; code: string; title: string; status: string; priority: string; asset: { name: string } | null; due_at: string | null }[]
    my_pm_due_soon: { id: number; code: string; name: string; priority: string; next_run_at: string | null }[]
}
export type HrDashboard = {
    members: { total: number; active: number; inactive: number }
    member_grow_shrink: number
    monthly_stats: { month: string; count: number }[]
    by_role: { code: string; label: string; count: number }[]
    recent_members: { id: number; name: string | null; email: string | null; job_title: string | null; status: string; role: string | null; created_at: string | null }[]
}

export async function apiGetAdminManagerDashboard() {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: AdminManagerDashboard }>({ url: '/dashboard', method: 'get' })
}
export async function apiGetTechnicianDashboard() {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: TechnicianDashboard }>({ url: '/dashboard/my', method: 'get' })
}
export async function apiGetHrDashboard() {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: HrDashboard }>({ url: '/dashboard/hr', method: 'get' })
}

// ── Legacy template dashboard ─────────────────────────────────────────

export async function apiGetEcommerceDashboard<T>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/dashboard/ecommerce',
        method: 'get',
    })
}
