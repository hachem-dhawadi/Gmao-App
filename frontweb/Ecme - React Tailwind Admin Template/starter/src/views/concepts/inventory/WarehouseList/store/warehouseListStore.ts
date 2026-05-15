import { create } from 'zustand'
import type { TableQueries } from '@/@types/common'
import type { Warehouse } from '@/services/InventoryService'

export const initialTableData: TableQueries = {
    pageIndex: 1,
    pageSize: 15,
    query: '',
    sort: { order: '', key: '' },
}

type WarehouseListState = {
    tableData: TableQueries
}

type WarehouseListAction = {
    setTableData: (payload: TableQueries) => void
}

export const useWarehouseListStore = create<
    WarehouseListState & WarehouseListAction
>((set) => ({
    tableData: initialTableData,
    setTableData: (payload) => set(() => ({ tableData: payload })),
}))
