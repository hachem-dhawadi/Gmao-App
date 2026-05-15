import { create } from 'zustand'
import type { WorkOrder } from '@/services/WorkOrdersService'

export type BoardColumns = Record<string, WorkOrder[]>

export const BOARD_STATUSES = [
    'open',
    'in_progress',
    'on_hold',
    'completed',
    'cancelled',
] as const

export const STATUS_LABELS: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    cancelled: 'Cancelled',
}

type WorkOrderBoardState = {
    columns: BoardColumns
}

type WorkOrderBoardAction = {
    setColumns: (columns: BoardColumns) => void
    moveCard: (woId: number, fromStatus: string, toStatus: string, toIndex: number) => void
    addCard: (wo: WorkOrder) => void
    updateCard: (wo: WorkOrder) => void
    removeCard: (woId: number) => void
}

const emptyColumns = (): BoardColumns =>
    Object.fromEntries(BOARD_STATUSES.map((s) => [s, []]))

export const useWorkOrderBoardStore = create<
    WorkOrderBoardState & WorkOrderBoardAction
>((set) => ({
    columns: emptyColumns(),

    setColumns: (columns) => set(() => ({ columns })),

    moveCard: (woId, fromStatus, toStatus, toIndex) =>
        set((state) => {
            const cols = { ...state.columns }
            const from = [...(cols[fromStatus] || [])]
            const idx = from.findIndex((w) => w.id === woId)
            if (idx === -1) return state
            const [card] = from.splice(idx, 1)
            const updatedCard = { ...card, status: toStatus as WorkOrder['status'] }
            const to = [...(cols[toStatus] || [])]
            to.splice(toIndex, 0, updatedCard)
            return {
                columns: { ...cols, [fromStatus]: from, [toStatus]: to },
            }
        }),

    addCard: (wo) =>
        set((state) => {
            const cols = { ...state.columns }
            const col = [...(cols[wo.status] || []), wo]
            return { columns: { ...cols, [wo.status]: col } }
        }),

    updateCard: (wo) =>
        set((state) => {
            const cols = { ...state.columns }
            for (const status of Object.keys(cols)) {
                const idx = cols[status].findIndex((w) => w.id === wo.id)
                if (idx !== -1) {
                    const updated = [...cols[status]]
                    updated[idx] = wo
                    return { columns: { ...cols, [status]: updated } }
                }
            }
            return state
        }),

    removeCard: (woId) =>
        set((state) => {
            const cols = { ...state.columns }
            for (const status of Object.keys(cols)) {
                cols[status] = cols[status].filter((w) => w.id !== woId)
            }
            return { columns: { ...cols } }
        }),
}))
