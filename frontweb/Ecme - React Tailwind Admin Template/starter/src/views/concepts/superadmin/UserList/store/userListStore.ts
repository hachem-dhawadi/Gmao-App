import { create } from 'zustand'
import type { TableQueries } from '@/@types/common'
import type { Customer, Filter } from '../types'

export const initialTableData: TableQueries = {
    pageIndex: 1,
    pageSize: 10,
    query: '',
    sort: { order: '', key: '' },
}

export const initialFilterData: Filter = {
    userName: '',
    userRole: [],
    userStatus: [],
}

type UsersListState = {
    tableData: TableQueries
    filterData: Filter
    selectedCustomer: Partial<Customer>[]
}

type UsersListAction = {
    setFilterData: (payload: Filter) => void
    setTableData: (payload: TableQueries) => void
    setSelectedCustomer: (checked: boolean, user: Customer) => void
    setSelectAllCustomer: (users: Customer[]) => void
}

const initialState: UsersListState = {
    tableData: initialTableData,
    filterData: initialFilterData,
    selectedCustomer: [],
}

export const useUserListStore = create<UsersListState & UsersListAction>((set) => ({
    ...initialState,
    setFilterData: (payload) => set(() => ({ filterData: payload })),
    setTableData: (payload) => set(() => ({ tableData: payload })),
    setSelectedCustomer: (checked, row) =>
        set((state) => {
            const prev = state.selectedCustomer
            if (checked) {
                if (prev.some((u) => u.id === row.id)) return { selectedCustomer: prev }
                return { selectedCustomer: [...prev, row] }
            }
            return { selectedCustomer: prev.filter((u) => u.id !== row.id) }
        }),
    setSelectAllCustomer: (rows) => set(() => ({ selectedCustomer: rows })),
}))
