import { create } from 'zustand'
import type { TableQueries } from '@/@types/common'
import type { Site } from '../types'

export const initialTableData: TableQueries = {
    pageIndex: 1,
    pageSize: 10,
    query: '',
    sort: { order: '', key: '' },
}

export type SiteFilter = {
    status: 'all' | 'active' | 'inactive'
}

export const initialFilterData: SiteFilter = {
    status: 'all',
}

type SiteListState = {
    tableData: TableQueries
    filterData: SiteFilter
    selectedSite: Site[]
}

type SiteListAction = {
    setTableData: (payload: TableQueries) => void
    setFilterData: (payload: SiteFilter) => void
    setSelectedSite: (checked: boolean, row: Site) => void
    setSelectAllSite: (rows: Site[]) => void
}

export const useSiteListStore = create<SiteListState & SiteListAction>(
    (set) => ({
        tableData: initialTableData,
        filterData: initialFilterData,
        selectedSite: [],
        setTableData: (payload) => set(() => ({ tableData: payload })),
        setFilterData: (payload) => set(() => ({ filterData: payload })),
        setSelectedSite: (checked, row) =>
            set((state) => {
                if (checked) {
                    return { selectedSite: [...state.selectedSite, row] }
                }
                return {
                    selectedSite: state.selectedSite.filter(
                        (s) => s.id !== row.id,
                    ),
                }
            }),
        setSelectAllSite: (rows) => set(() => ({ selectedSite: rows })),
    }),
)
