export type DepartmentFormSchema = {
    name: string
    code: string
    description: string
    parent_department_id: number | null
}
