import useSWR from 'swr'
import { useItemListStore } from '../store/itemListStore'
import { apiGetItemsList } from '@/services/InventoryService'
import type { ItemsListResponse } from '@/services/InventoryService'

export default function useItemList() {
    const {
        tableData,
        filterData,
        setTableData,
        setFilterData,
        selectedItems,
        setSelectedItems,
        setSelectAllItems,
    } = useItemListStore((state) => state)

    const queryParams: Record<string, unknown> = {
        page: Number(tableData.pageIndex || 1),
        per_page: Number(tableData.pageSize || 15),
    }

    if (tableData.query) queryParams.search = tableData.query
    if (filterData.minCost !== '') queryParams.min_cost = filterData.minCost
    if (filterData.maxCost !== '') queryParams.max_cost = filterData.maxCost
    if (filterData.stockedOnly) queryParams.stocked_only = 1
    if (filterData.lowStockOnly) queryParams.low_stock_only = 1

    const { data, error, isLoading, mutate } = useSWR(
        [
            '/inventory/items',
            tableData.pageIndex,
            tableData.pageSize,
            tableData.query,
            filterData.minCost,
            filterData.maxCost,
            filterData.stockedOnly,
            filterData.lowStockOnly,
        ],
        () => apiGetItemsList<ItemsListResponse>(queryParams),
        { revalidateOnFocus: false },
    )

    const itemList = data?.data?.items || []
    const itemListTotal = data?.data?.pagination?.total || 0

    return {
        itemList,
        itemListTotal,
        error,
        isLoading,
        tableData,
        filterData,
        mutate,
        setTableData,
        setFilterData,
        selectedItems,
        setSelectedItems,
        setSelectAllItems,
    }
}
