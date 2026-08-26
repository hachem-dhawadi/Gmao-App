import { useEffect, useRef, useState } from 'react'
import { View, ActivityIndicator, AppState } from 'react-native'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '@/store/authStore'
import { useNotifStore } from '@/store/notifStore'
import { apiMe } from '@/services/AuthService'
import { registerPushToken } from '@/services/PushNotificationService'
import { apiGetUnreadCount } from '@/services/NotificationService'
import { apiGetConversations } from '@/services/ChatService'

// Show push notifications even when app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge:  false,
    }),
})

function navigateFromData(data: Record<string, unknown>) {
    if (data.conversation_id) router.push(`/app/chat?open=${data.conversation_id}` as never)
    else if (data.wo_id)      router.push(`/app/work-orders/${data.wo_id}` as never)
    else if (data.pm_id)      router.push(`/app/pm-plans/${data.pm_id}` as never)
    else if (data.request_id) router.push('/app/maintenance-requests' as never)
    else if (data.item_id)    router.push('/app/inventory' as never)
    else if (data.po_id)      router.push('/app/purchasing' as never)
}

async function refreshBadgeCounts(setUnreadNotifCount: (n: number) => void, setUnreadChatCount: (n: number) => void) {
    try {
        const [notifRes, chatRes] = await Promise.all([
            apiGetUnreadCount(),
            apiGetConversations(),
        ])
        setUnreadNotifCount(notifRes.data.data.count ?? 0)
        const totalChat = (chatRes.data.data ?? []).reduce((sum: number, c: { unread_count?: number }) => sum + (c.unread_count ?? 0), 0)
        setUnreadChatCount(totalChat)
    } catch {}
}

export default function RootLayout() {
    const { loadToken, setAuth, clearAuth } = useAuthStore()
    const { setUnreadNotifCount, setUnreadChatCount } = useNotifStore()
    const [appReady, setAppReady]           = useState(false)
    const responseSub = useRef<Notifications.EventSubscription | null>(null)
    const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null)

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
                registerPushToken()
                // Initial badge fetch
                refreshBadgeCounts(setUnreadNotifCount, setUnreadChatCount)
                // Poll every 60 seconds
                pollRef.current = setInterval(() => {
                    refreshBadgeCounts(setUnreadNotifCount, setUnreadChatCount)
                }, 60_000)
            } catch {
                await clearAuth()
            } finally {
                setAppReady(true)
            }
        }
        init()
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [])

    // Refresh badges when app comes back to foreground
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                refreshBadgeCounts(setUnreadNotifCount, setUnreadChatCount)
            }
        })
        return () => sub.remove()
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
