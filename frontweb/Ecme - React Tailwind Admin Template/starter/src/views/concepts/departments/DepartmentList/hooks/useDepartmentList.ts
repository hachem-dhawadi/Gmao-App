import useSWR from 'swr'
import { useDepartmentListStore } from '../store/departmentListStore'
import { apiGetDepartmentsList } from '@/services/DepartmentsService'
import type { Department } from '../types'
import type { DepartmentsListResponse } from '@/services/DepartmentsService'

export default function useDepartmentList() {
    const {
        tableData,
        setTableData,
        filterData,
        setFilterData,
        selectedDepartment,
        setSelectedDepartment,
        setSelectAllDepartment,
    } = useDepartmentListStore((state) => state)

    const queryParams = {
        page: Number(tableData.pageIndex || 1),
        per_page: Number(tableData.pageSize || 10),
    }

    const { data, error, isLoading, mutate } = useSWR(
        ['/departments', tableData.pageIndex, tableData.pageSize],
        () => apiGetDepartmentsList<DepartmentsListResponse>(queryParams),
        { revalidateOnFocus: false },
    )

    const rawList: Department[] = data?.data?.departments || []

    const queryText = String(tableData.query || '').trim().toLowerCase()

    const departmentList = rawList.filter((dept) => {
        const searchMatch =
            !queryText ||
            dept.name.toLowerCase().includes(queryText) ||
            dept.code.toLowerCase().includes(queryText) ||
            (dept.description || '').toLowerCase().includes(queryText) ||
            (dept.parent?.name || '').toLowerCase().includes(queryText)

        const levelMatch =
            filterData.level === 'all' ||
            (filterData.level === 'top' && dept.parent_department_id === null) ||
            (filterData.level === 'sub' && dept.parent_department_id !== null)

        return searchMatch && levelMatch
    })

    const usingClientFilter =
        queryText.length > 0 || filterData.level !== 'all'

    const apiTotal = data?.data?.pagination?.total || 0
    const departmentListTotal = usingClientFilter
        ? departmentList.length
        : apiTotal

    return {
        departmentList,
        departmentListTotal,
        rawList,
        error,
        isLoading,
        tableData,
        filterData,
        mutate,
        setTableData,
        setFilterData,
        selectedDepartment,
        setSelectedDepartment,
        setSelectAllDepartment,
    }
}
