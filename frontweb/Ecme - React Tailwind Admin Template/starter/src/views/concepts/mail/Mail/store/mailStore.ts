import { create } from 'zustand'
import type { AppNotification } from '../types'

export type MailState = {
    notifications: AppNotification[]
    notificationsFetched: boolean
    activeNotification: AppNotification | null
    selectedCategory: string
    mobileSideBarExpand: boolean
}

type MailAction = {
    setNotifications: (payload: AppNotification[]) => void
    setNotificationsFetched: (payload: boolean) => void
    setActiveNotification: (payload: AppNotification | null) => void
    setSelectedCategory: (payload: string) => void
    toggleMobileSidebar: (payload: boolean) => void
    markOneRead: (id: number) => void
    markAllRead: () => void
}

const initialState: MailState = {
    notifications: [],
    notificationsFetched: false,
    activeNotification: null,
    selectedCategory: 'all',
    mobileSideBarExpand: false,
}

export const useMailStore = create<MailState & MailAction>((set) => ({
    ...initialState,
    setNotifications: (payload) => set(() => ({ notifications: payload })),
    setNotificationsFetched: (payload) =>
        set(() => ({ notificationsFetched: payload })),
    setActiveNotification: (payload) =>
        set(() => ({ activeNotification: payload })),
    setSelectedCategory: (payload) =>
        set(() => ({ selectedCategory: payload })),
    toggleMobileSidebar: (payload) =>
        set(() => ({ mobileSideBarExpand: payload })),
    markOneRead: (id) =>
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n,
            ),
            activeNotification:
                state.activeNotification?.id === id
                    ? { ...state.activeNotification, read: true }
                    : state.activeNotification,
        })),
    markAllRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({
                ...n,
                read: true,
            })),
        })),
}))
