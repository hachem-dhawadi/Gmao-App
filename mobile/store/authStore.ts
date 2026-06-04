import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

type AuthUser = {
    id: number
    name: string
    email: string
    avatar?: string | null
    memberId?: number | null
    companyId?: number | null
    roles: string[]
    permissions: string[]
}

type AuthState = {
    user: AuthUser | null
    token: string | null
    isLoading: boolean
    setAuth: (token: string, user: AuthUser) => Promise<void>
    clearAuth: () => Promise<void>
    setUser: (user: Partial<AuthUser>) => void
    loadToken: () => Promise<string | null>
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoading: true,

    setAuth: async (token, user) => {
        await SecureStore.setItemAsync('auth_token', token)
        set({ token, user })
    },

    clearAuth: async () => {
        await SecureStore.deleteItemAsync('auth_token')
        set({ token: null, user: null })
    },

    setUser: (partial) => {
        const current = get().user
        if (!current) return
        set({ user: { ...current, ...partial } })
    },

    loadToken: async () => {
        const token = await SecureStore.getItemAsync('auth_token')
        set({ token, isLoading: false })
        return token
    },
}))
