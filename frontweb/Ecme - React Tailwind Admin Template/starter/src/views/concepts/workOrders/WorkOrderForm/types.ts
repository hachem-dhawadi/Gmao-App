export type WorkOrderFormSchema = {
    title: string
    asset_id: number | null
    code: string
    status: 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
    priority: 'low' | 'medium' | 'high' | 'critical'
    description: string
    due_at: string
    estimated_minutes: string
    assigned_member_ids: number[]
}
