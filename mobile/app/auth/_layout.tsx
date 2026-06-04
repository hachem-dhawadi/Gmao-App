import { Stack } from 'expo-router'

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="sign-in"   options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="sign-up"   options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="otp-verification" />
        </Stack>
    )
}
