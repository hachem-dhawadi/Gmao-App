import { create } from 'zustand'
import type { TableQueries } from '@/@types/common'
import type { Department } from '../types'

export const initialTableData: TableQueries = {
    pageIndex: 1,
    pageSize: 10,
    query: '',
    sort: { order: '', key: '' },
}

export type DepartmentFilter = {
    level: 'all' | 'top' | 'sub'
}

export const initialFilterData: DepartmentFilter = {
    level: 'all',
}

type DepartmentListState = {
    tableData: TableQueries
    filterData: DepartmentFilter
    selectedDepartment: Department[]
}

type DepartmentListAction = {
    setTableData: (payload: TableQueries) => void
    setFilterData: (payload: DepartmentFilter) => void
    setSelectedDepartment: (checked: boolean, row: Department) => void
    setSelectAllDepartment: (rows: Department[]) => void
}

export const useDepartmentListStore = create<
    DepartmentListState & DepartmentListAction
>((set) => ({
    tableData: initialTableData,
    filterData: initialFilterData,
    selectedDepartment: [],
    setTableData: (payload) => set(() => ({ tableData: payload })),
    setFilterData: (payload) => set(() => ({ filterData: payload })),
    setSelectedDepartment: (checked, row) =>
        set((state) => {
            if (checked) {
                return { selectedDepartment: [...state.selectedDepartment, row] }
            }
            return {
                selectedDepartment: state.selectedDepartment.filter(
                    (d) => d.id !== row.id,
                ),
            }
        }),
    setSelectAllDepartment: (rows) =>
        set(() => ({ selectedDepartment: rows })),
}))
