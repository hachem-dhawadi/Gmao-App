import { create } from 'zustand'
import type { TableQueries } from '@/@types/common'
import type { WorkOrder } from '../types'

export const initialTableData: TableQueries = {
    pageIndex: 1,
    pageSize: 10,
    query: '',
    sort: { order: '', key: '' },
}

export type WorkOrderFilter = {
    status: 'all' | 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'pending_approval' | 'rejected'
    priority: 'all' | 'low' | 'medium' | 'high' | 'critical'
    myOnly: boolean
    showArchived: boolean
    site_id: number | null
}

export const initialFilterData: WorkOrderFilter = {
    status: 'all',
    priority: 'all',
    myOnly: false,
    showArchived: false,
    site_id: null,
}

type WorkOrderListState = {
    tableData: TableQueries
    filterData: WorkOrderFilter
    selectedWorkOrder: WorkOrder[]
}

type WorkOrderListAction = {
    setTableData: (payload: TableQueries) => void
    setFilterData: (payload: WorkOrderFilter) => void
    setSelectedWorkOrder: (checked: boolean, row: WorkOrder) => void
    setSelectAllWorkOrder: (rows: WorkOrder[]) => void
}

export const useWorkOrderListStore = create<WorkOrderListState & WorkOrderListAction>(
    (set) => ({
        tableData: initialTableData,
        filterData: initialFilterData,
        selectedWorkOrder: [],
        setTableData: (payload) => set(() => ({ tableData: payload })),
        setFilterData: (payload) => set(() => ({ filterData: payload })),
        setSelectedWorkOrder: (checked, row) =>
            set((state) => {
                if (checked) {
                    return { selectedWorkOrder: [...state.selectedWorkOrder, row] }
                }
                return {
                    selectedWorkOrder: state.selectedWorkOrder.filter(
                        (w) => w.id !== row.id,
                    ),
                }
            }),
        setSelectAllWorkOrder: (rows) => set(() => ({ selectedWorkOrder: rows })),
    }),
)
