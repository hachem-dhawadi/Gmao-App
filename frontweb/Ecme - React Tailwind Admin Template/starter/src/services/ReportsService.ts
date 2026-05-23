import ApiService from './ApiService'

export type WoReportData = {
    monthly: { month: string; created: number; completed: number }[]
    by_status: { open: number; in_progress: number; on_hold: number; completed: number; cancelled: number }
    by_priority: { critical: number; high: number; medium: number; low: number }
    avg_resolution_h: number | null
    top_technicians: { name: string; completed: number }[]
}

export type AssetReportData = {
    assets: {
        id: number; code: string; name: string; location: string | null
        wo_count: number; total_downtime_h: number; last_maintenance_at: string | null
    }[]
}

export type PmReportData = {
    monthly: { month: string; ran: number; overdue: number; compliance: number | null }[]
    plans: {
        id: number; code: string; name: string; status: string
        assigned_to: string | null; last_run_at: string | null
        next_run_at: string | null; compliance_status: 'on_time' | 'overdue' | 'never_run'
    }[]
}

export type InventoryReportData = {
    cost_month: number
    cost_year: number
    stock_value: number
    top_items: { id: number; code: string; name: string; unit: string | null; total_used: number; total_cost: number }[]
}

export const apiGetWoReport     = () => ApiService.fetchDataWithAxios<{ success: boolean; data: WoReportData }>({ url: '/reports/work-orders', method: 'get' })
export const apiGetAssetReport  = () => ApiService.fetchDataWithAxios<{ success: boolean; data: AssetReportData }>({ url: '/reports/assets', method: 'get' })
export const apiGetPmReport     = () => ApiService.fetchDataWithAxios<{ success: boolean; data: PmReportData }>({ url: '/reports/pm', method: 'get' })
export const apiGetInvReport    = () => ApiService.fetchDataWithAxios<{ success: boolean; data: InventoryReportData }>({ url: '/reports/inventory', method: 'get' })
