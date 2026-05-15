import useSWR from 'swr'
import { useWarehouseListStore } from '../store/warehouseListStore'
import { apiGetWarehousesList } from '@/services/InventoryService'
import type { WarehousesListResponse } from '@/services/InventoryService'

export default function useWarehouseList() {
    const { tableData, setTableData } = useWarehouseListStore((state) => state)

    const queryParams: Record<string, unknown> = {
        page: Number(tableData.pageIndex || 1),
        per_page: Number(tableData.pageSize || 15),
    }

    if (tableData.query) {
        queryParams.search = tableData.query
    }

    const { data, error, isLoading, mutate } = useSWR(
        [
            '/inventory/warehouses',
            tableData.pageIndex,
            tableData.pageSize,
            tableData.query,
        ],
        () => apiGetWarehousesList<WarehousesListResponse>(queryParams),
        { revalidateOnFocus: false },
    )

    const warehouseList = data?.data?.warehouses || []
    const warehouseListTotal = data?.data?.pagination?.total || 0

    return {
        warehouseList,
        warehouseListTotal,
        error,
        isLoading,
        tableData,
        mutate,
        setTableData,
    }
}
