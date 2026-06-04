import { Redirect } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import { View, ActivityIndicator } from 'react-native'
import { Colors } from '@/constants/colors'

export default function Index() {
    const { token, isLoading } = useAuthStore()

    if (isLoading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        )
    }

    return <Redirect href={token ? '/app' : '/auth/login'} />
}
