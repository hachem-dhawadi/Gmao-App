import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAuthStore } from '@/store/authStore'
import { apiMe } from '@/services/AuthService'

export default function RootLayout() {
    const { loadToken, setAuth, clearAuth } = useAuthStore()
    const [appReady, setAppReady] = useState(false)

    useEffect(() => {
        const init = async () => {
            try {
                const token = await loadToken()
                if (!token) return
                const resp = await apiMe()
                const { user, memberships, default_company_id } = resp.data.data
                const membership = memberships.find((m: { company_id: number }) => m.company_id === default_company_id) ?? memberships[0]
                setAuth(token, {
                    id:          user.id,
                    name:        user.name,
                    email:       user.email,
                    avatar:      user.avatar_url,
                    memberId:    membership?.member_id ?? null,
                    companyId:   default_company_id,
                    roles:       membership?.roles.map((r: { code: string }) => r.code) ?? [],
                    permissions: membership?.roles.flatMap((r: { permissions: string[] }) => r.permissions ?? []) ?? [],
                })
            } catch {
                await clearAuth()
            } finally {
                setAppReady(true)
            }
        }
        init()
    }, [])

    if (!appReady) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <StatusBar style="dark" />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
                    <ActivityIndicator size="large" color="#111" />
                </View>
            </GestureHandlerRootView>
        )
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="auth" />
                <Stack.Screen name="app" />
            </Stack>
        </GestureHandlerRootView>
    )
}
