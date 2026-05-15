import { create } from 'zustand'
import type { TableQueries } from '@/@types/common'
import type { PmPlan } from '@/services/PmService'

export const initialTableData: TableQueries = {
    pageIndex: 1,
    pageSize: 10,
    query: '',
    sort: { order: '', key: '' },
}

export type PmPlanFilter = {
    status: 'all' | 'active' | 'inactive' | 'draft'
    priority: 'all' | 'low' | 'medium' | 'high' | 'critical'
}

export const initialFilterData: PmPlanFilter = {
    status: 'all',
    priority: 'all',
}

type PmPlanListState = {
    tableData: TableQueries
    filterData: PmPlanFilter
    selectedPmPlans: PmPlan[]
}

type PmPlanListAction = {
    setTableData: (payload: TableQueries) => void
    setFilterData: (payload: PmPlanFilter) => void
    setSelectedPmPlan: (checked: boolean, row: PmPlan) => void
    setSelectAllPmPlan: (rows: PmPlan[]) => void
}

export const usePmPlanListStore = create<PmPlanListState & PmPlanListAction>(
    (set) => ({
        tableData: initialTableData,
        filterData: initialFilterData,
        selectedPmPlans: [],
        setTableData: (payload) => set(() => ({ tableData: payload })),
        setFilterData: (payload) => set(() => ({ filterData: payload })),
        setSelectedPmPlan: (checked, row) =>
            set((state) => {
                if (checked) {
                    return { selectedPmPlans: [...state.selectedPmPlans, row] }
                }
                return {
                    selectedPmPlans: state.selectedPmPlans.filter(
                        (p) => p.id !== row.id,
                    ),
                }
            }),
        setSelectAllPmPlan: (rows) => set(() => ({ selectedPmPlans: rows })),
    }),
)
