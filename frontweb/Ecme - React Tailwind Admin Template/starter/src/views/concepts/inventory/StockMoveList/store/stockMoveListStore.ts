import { create } from 'zustand'
import type { TableQueries } from '@/@types/common'

export const initialTableData: TableQueries = {
    pageIndex: 1,
    pageSize: 20,
    query: '',
    sort: { order: '', key: '' },
}

type StockMoveFilter = {
    item_id: string
    warehouse_id: string
    move_type: string
}

type StockMoveListState = {
    tableData: TableQueries
    filterData: StockMoveFilter
}

type StockMoveListAction = {
    setTableData: (payload: TableQueries) => void
    setFilterData: (payload: Partial<StockMoveFilter>) => void
}

export const useStockMoveListStore = create<
    StockMoveListState & StockMoveListAction
>((set) => ({
    tableData: initialTableData,
    filterData: { item_id: '', warehouse_id: '', move_type: '' },
    setTableData: (payload) => set(() => ({ tableData: payload })),
    setFilterData: (payload) =>
        set((state) => ({
            filterData: { ...state.filterData, ...payload },
        })),
}))
