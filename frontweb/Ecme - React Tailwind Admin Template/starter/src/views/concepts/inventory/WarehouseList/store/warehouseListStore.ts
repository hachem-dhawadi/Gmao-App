import { create } from 'zustand'
import type { TableQueries } from '@/@types/common'

export const initialTableData: TableQueries = {
    pageIndex: 1,
    pageSize: 15,
    query: '',
    sort: { order: '', key: '' },
}

export type WarehouseFilter = {
    site_id: number | null
}

export const initialFilterData: WarehouseFilter = {
    site_id: null,
}

type WarehouseListState = {
    tableData: TableQueries
    filterData: WarehouseFilter
}

type WarehouseListAction = {
    setTableData: (payload: TableQueries) => void
    setFilterData: (payload: WarehouseFilter) => void
}

export const useWarehouseListStore = create<
    WarehouseListState & WarehouseListAction
>((set) => ({
    tableData: initialTableData,
    filterData: initialFilterData,
    setTableData: (payload) => set(() => ({ tableData: payload })),
    setFilterData: (payload) => set(() => ({ filterData: payload })),
}))
