import useSWR from 'swr'
import { useWorkOrderListStore } from '../store/workOrderListStore'
import { apiGetWorkOrdersList } from '@/services/WorkOrdersService'
import type { WorkOrder } from '../types'
import type { WorkOrdersListResponse } from '@/services/WorkOrdersService'

export default function useWorkOrderList() {
    const {
        tableData,
        setTableData,
        filterData,
        setFilterData,
        selectedWorkOrder,
        setSelectedWorkOrder,
        setSelectAllWorkOrder,
    } = useWorkOrderListStore((state) => state)

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
            '/work-orders',
            tableData.pageIndex,
            tableData.pageSize,
            search,
            filterData.status,
            filterData.priority,
        ],
        () => apiGetWorkOrdersList<WorkOrdersListResponse>(queryParams),
        { revalidateOnFocus: false },
    )

    const workOrderList: WorkOrder[] = data?.data?.work_orders || []
    const workOrderListTotal = data?.data?.pagination?.total || 0

    return {
        workOrderList,
        workOrderListTotal,
        error,
        isLoading,
        tableData,
        filterData,
        mutate,
        setTableData,
        setFilterData,
        selectedWorkOrder,
        setSelectedWorkOrder,
        setSelectAllWorkOrder,
    }
}
