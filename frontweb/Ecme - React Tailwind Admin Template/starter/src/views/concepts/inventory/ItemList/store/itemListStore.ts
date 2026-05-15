import { create } from 'zustand'
import type { TableQueries } from '@/@types/common'
import type { Item } from '@/services/InventoryService'

export const initialTableData: TableQueries = {
    pageIndex: 1,
    pageSize: 15,
    query: '',
    sort: { order: '', key: '' },
}

export type ItemFilter = {
    minCost: number | string
    maxCost: number | string
    stockedOnly: boolean
    lowStockOnly: boolean
}

export const initialFilterData: ItemFilter = {
    minCost: '',
    maxCost: '',
    stockedOnly: false,
    lowStockOnly: false,
}

type ItemListState = {
    tableData: TableQueries
    filterData: ItemFilter
    selectedItems: Item[]
}

type ItemListAction = {
    setTableData: (payload: TableQueries) => void
    setFilterData: (payload: ItemFilter) => void
    setSelectedItems: (checked: boolean, row: Item) => void
    setSelectAllItems: (rows: Item[]) => void
}

export const useItemListStore = create<ItemListState & ItemListAction>((set) => ({
    tableData: initialTableData,
    filterData: initialFilterData,
    selectedItems: [],
    setTableData: (payload) => set(() => ({ tableData: payload })),
    setFilterData: (payload) => set(() => ({ filterData: payload })),
    setSelectedItems: (checked, row) =>
        set((state) => ({
            selectedItems: checked
                ? [...state.selectedItems, row]
                : state.selectedItems.filter((i) => i.id !== row.id),
        })),
    setSelectAllItems: (rows) => set(() => ({ selectedItems: rows })),
}))
