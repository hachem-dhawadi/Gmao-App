import api from './ApiService'

export type AdminDashboard = {
    work_orders: {
        open: number; in_progress: number; on_hold: number; overdue: number
        completed_month: number; unassigned: number
    }
    pm: { active: number; due_week: number; due_month: number }
    assets: { total: number }
    members: { total_active: number; technicians: number }
    pending_requests: number
    pm_compliance_pct: number
    mttr_hours: number
    recent_work_orders: {
        id: number; code: string; title: string; status: string
        priority: string; asset: { name: string } | null
        created_at: string | null; due_at: string | null
    }[]
}

export type TechDashboard = {
    my_work_orders: {
        open: number; in_progress: number; overdue: number; completed_week: number
        open_grow_shrink: number; in_progress_grow_shrink: number
        completion_grow_shrink: number; done_week_grow_shrink: number
    }
    my_pm: { due_week: number; due_month: number }
    performance_scores: {
        completion: number; on_time: number; response: number
        workload: number; efficiency: number
    }
    monthly_stats: { month: string; active: number; completed: number }[]
    my_recent_work_orders: {
        id: number; code: string; title: string; status: string
        priority: string; asset: { name: string } | null; due_at: string | null
    }[]
    my_pm_due_soon: {
        id: number; code: string; name: string; next_run_at: string | null
    }[]
}

export async function apiGetAdminDashboard() {
    return api.get<{ success: boolean; data: AdminDashboard }>('/dashboard')
}

export async function apiGetTechDashboard() {
    return api.get<{ success: boolean; data: TechDashboard }>('/dashboard/my')
}
