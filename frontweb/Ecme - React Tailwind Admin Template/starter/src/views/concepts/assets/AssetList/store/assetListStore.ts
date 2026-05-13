import { create } from 'zustand'
import type { TableQueries } from '@/@types/common'
import type { Asset } from '../types'

export const initialTableData: TableQueries = {
    pageIndex: 1,
    pageSize: 10,
    query: '',
    sort: { order: '', key: '' },
}

export type AssetFilter = {
    status: 'all' | 'active' | 'inactive' | 'under_maintenance' | 'decommissioned'
}

export const initialFilterData: AssetFilter = {
    status: 'all',
}

type AssetListState = {
    tableData: TableQueries
    filterData: AssetFilter
    selectedAsset: Asset[]
}

type AssetListAction = {
    setTableData: (payload: TableQueries) => void
    setFilterData: (payload: AssetFilter) => void
    setSelectedAsset: (checked: boolean, row: Asset) => void
    setSelectAllAsset: (rows: Asset[]) => void
}

export const useAssetListStore = create<AssetListState & AssetListAction>(
    (set) => ({
        tableData: initialTableData,
        filterData: initialFilterData,
        selectedAsset: [],
        setTableData: (payload) => set(() => ({ tableData: payload })),
        setFilterData: (payload) => set(() => ({ filterData: payload })),
        setSelectedAsset: (checked, row) =>
            set((state) => {
                if (checked) {
                    return { selectedAsset: [...state.selectedAsset, row] }
                }
                return {
                    selectedAsset: state.selectedAsset.filter(
                        (a) => a.id !== row.id,
                    ),
                }
            }),
        setSelectAllAsset: (rows) => set(() => ({ selectedAsset: rows })),
    }),
)
