export type PmPlanFormSchema = {
    name: string
    description: string
    status: 'active' | 'inactive' | 'draft'
    priority: 'low' | 'medium' | 'high' | 'critical'
    estimated_minutes: string
    asset_id: number | null
    assigned_member_id: number | null
    trigger_interval_value: string
    trigger_interval_unit: 'days' | 'weeks' | 'months'
    trigger_next_run_at: string
}
