import { Tabs, Redirect } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import CustomTabBar from '@/components/ui/CustomTabBar'

export default function AppLayout() {
    const { token } = useAuthStore()
    if (!token) return <Redirect href="/auth/login" />

    return (
        <Tabs
            screenOptions={{ headerShown: false }}
            tabBar={props => <CustomTabBar {...props} />}
        >
            <Tabs.Screen name="index"   options={{ title: 'Home'    }} />
            <Tabs.Screen name="more"    options={{ title: 'Modules' }} />
            <Tabs.Screen name="scan"    options={{ title: 'Scan'    }} />
            <Tabs.Screen name="chat"    options={{ title: 'Chat'    }} />
            <Tabs.Screen name="profile" options={{ title: 'Me'      }} />
            {/* Hidden from tab bar — navigated to via router.push */}
            <Tabs.Screen name="work-orders"          options={{ href: null }} />
            <Tabs.Screen name="notifications"        options={{ href: null }} />
            <Tabs.Screen name="pm-plans"             options={{ href: null }} />
            <Tabs.Screen name="assets"               options={{ href: null }} />
            <Tabs.Screen name="members"              options={{ href: null }} />
            <Tabs.Screen name="calendar"             options={{ href: null }} />
            <Tabs.Screen name="maintenance-requests" options={{ href: null }} />
        </Tabs>
    )
}
