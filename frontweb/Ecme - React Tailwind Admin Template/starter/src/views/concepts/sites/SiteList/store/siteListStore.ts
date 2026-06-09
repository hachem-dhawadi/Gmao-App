import { create } from 'zustand'
import type { TableQueries } from '@/@types/common'
import type { Site } from '../types'

export const initialTableData: TableQueries = {
    pageIndex: 1,
    pageSize: 10,
    query: '',
    sort: { order: '', key: '' },
}

type SiteListState = {
    tableData: TableQueries
    selectedSite: Site[]
}

type SiteListAction = {
    setTableData: (payload: TableQueries) => void
    setSelectedSite: (checked: boolean, row: Site) => void
    setSelectAllSite: (rows: Site[]) => void
}

export const useSiteListStore = create<SiteListState & SiteListAction>(
    (set) => ({
        tableData: initialTableData,
        selectedSite: [],
        setTableData: (payload) => set(() => ({ tableData: payload })),
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
