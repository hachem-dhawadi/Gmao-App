import useSWR from 'swr'
import { useStockMoveListStore } from '../store/stockMoveListStore'
import { apiGetStockMovesList } from '@/services/InventoryService'
import type { StockMovesListResponse } from '@/services/InventoryService'

export default function useStockMoveList() {
    const { tableData, setTableData, filterData, setFilterData } =
        useStockMoveListStore((state) => state)

    const queryParams: Record<string, unknown> = {
        page: Number(tableData.pageIndex || 1),
        per_page: Number(tableData.pageSize || 20),
    }

    if (filterData.item_id) queryParams.item_id = filterData.item_id
    if (filterData.warehouse_id) queryParams.warehouse_id = filterData.warehouse_id
    if (filterData.move_type) queryParams.move_type = filterData.move_type

    const { data, error, isLoading, mutate } = useSWR(
        [
            '/inventory/stock-moves',
            tableData.pageIndex,
            tableData.pageSize,
            filterData.item_id,
            filterData.warehouse_id,
            filterData.move_type,
        ],
        () => apiGetStockMovesList<StockMovesListResponse>(queryParams),
        { revalidateOnFocus: false },
    )

    const moveList = data?.data?.stock_moves || []
    const moveListTotal = data?.data?.pagination?.total || 0

    return {
        moveList,
        moveListTotal,
        error,
        isLoading,
        tableData,
        filterData,
        mutate,
        setTableData,
        setFilterData,
    }
}
