export type Department = {
    id: number
    company_id: number
    parent_department_id: number | null
    name: string
    code: string
    description: string | null
    created_at: string | null
    updated_at: string | null
    archived_at: string | null
    parent: { id: number; name: string; code: string } | null
    children_count: number
    members_count: number
}
