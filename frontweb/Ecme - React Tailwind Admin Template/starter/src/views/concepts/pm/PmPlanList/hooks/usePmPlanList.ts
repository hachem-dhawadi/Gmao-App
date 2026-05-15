import useSWR from 'swr'
import { usePmPlanListStore } from '../store/pmPlanListStore'
import { apiGetPmPlansList } from '@/services/PmService'
import type { PmPlansListResponse } from '@/services/PmService'

export default function usePmPlanList() {
    const {
        tableData,
        setTableData,
        filterData,
        setFilterData,
        selectedPmPlans,
        setSelectedPmPlan,
        setSelectAllPmPlan,
    } = usePmPlanListStore((state) => state)

    const search = String(tableData.query || '').trim()

    const queryParams: Record<string, unknown> = {
        page: Number(tableData.pageIndex || 1),
        per_page: Number(tableData.pageSize || 10),
    }

    if (search) queryParams.search = search
    if (filterData.status !== 'all') queryParams.status = filterData.status
    if (filterData.priority !== 'all') queryParams.priority = filterData.priority

    const { data, error, isLoading, mutate } = useSWR(
        [
            '/pm/plans',
            tableData.pageIndex,
            tableData.pageSize,
            search,
            filterData.status,
            filterData.priority,
        ],
        () => apiGetPmPlansList<PmPlansListResponse>(queryParams),
        { revalidateOnFocus: false },
    )

    const pmPlanList = data?.data?.pm_plans || []
    const pmPlanListTotal = data?.data?.pagination?.total || 0

    return {
        pmPlanList,
        pmPlanListTotal,
        error,
        isLoading,
        tableData,
        filterData,
        mutate,
        setTableData,
        setFilterData,
        selectedPmPlans,
        setSelectedPmPlan,
        setSelectAllPmPlan,
    }
}
