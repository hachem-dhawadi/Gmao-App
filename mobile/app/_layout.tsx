import { useEffect, useRef, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '@/store/authStore'
import { apiMe } from '@/services/AuthService'
import { registerPushToken } from '@/services/PushNotificationService'

// Show push notifications even when app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge:  false,
    }),
})

function navigateFromData(data: Record<string, unknown>) {
    if (data.wo_id)       router.push(`/app/work-orders/${data.wo_id}` as never)
    else if (data.pm_id)  router.push(`/app/pm-plans/${data.pm_id}` as never)
    else if (data.request_id) router.push('/app/maintenance-requests' as never)
    else if (data.item_id)    router.push('/app/inventory' as never)
    else if (data.po_id)      router.push('/app/purchasing' as never)
}

export default function RootLayout() {
    const { loadToken, setAuth, clearAuth } = useAuthStore()
    const [appReady, setAppReady]           = useState(false)
    const responseSub = useRef<Notifications.EventSubscription | null>(null)

    // Listen for notification taps (foreground + background)
    useEffect(() => {
        responseSub.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data as Record<string, unknown>
            navigateFromData(data)
        })
        return () => { responseSub.current?.remove() }
    }, [])

    // Handle cold-start: app was killed and opened via push banner
    useEffect(() => {
        if (!appReady) return
        Notifications.getLastNotificationResponseAsync().then(response => {
            if (!response) return
            const data = response.notification.request.content.data as Record<string, unknown>
            navigateFromData(data)
        })
    }, [appReady])

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
                    phone:       user.phone ?? null,
                    avatar:      user.avatar_url,
                    memberId:    membership?.member_id ?? null,
                    companyId:   default_company_id,
                    roles:       membership?.roles.map((r: { code: string }) => r.code) ?? [],
                    permissions: membership?.roles.flatMap((r: { permissions: string[] }) => r.permissions ?? []) ?? [],
                })
                // Register push token after successful auth (non-blocking)
                registerPushToken()
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
