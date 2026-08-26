import { create } from 'zustand'

type NotifState = {
    unreadNotifCount: number
    unreadChatCount: number
    setUnreadNotifCount: (n: number) => void
    setUnreadChatCount: (n: number) => void
    incrementUnreadChatCount: () => void
}

export const useNotifStore = create<NotifState>((set, get) => ({
    unreadNotifCount: 0,
    unreadChatCount: 0,
    setUnreadNotifCount: (n) => set({ unreadNotifCount: n }),
    setUnreadChatCount: (n) => set({ unreadChatCount: n }),
    incrementUnreadChatCount: () => set({ unreadChatCount: get().unreadChatCount + 1 }),
}))
