import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import api from './ApiService'

export async function registerPushToken(): Promise<void> {
    try {
        console.log('[Push] starting registration, OS:', Platform.OS)

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name:              'GMAO Notifications',
                importance:        Notifications.AndroidImportance.MAX,
                vibrationPattern:  [0, 250, 250, 250],
                lightColor:        '#111111',
                showBadge:         true,
            })
        }

        const { status: existing } = await Notifications.getPermissionsAsync()
        console.log('[Push] existing permission:', existing)
        let finalStatus = existing

        if (existing !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync()
            finalStatus = status
            console.log('[Push] requested permission, result:', status)
        }

        if (finalStatus !== 'granted') {
            console.warn('[Push] permission not granted, aborting')
            return
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
        console.log('[Push] projectId:', projectId)
        if (!projectId) return

        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
        console.log('[Push] token obtained:', token)

        await api.post('/push-token', { token })
        console.log('[Push] token saved to backend')
    } catch (e) {
        console.warn('[Push] registration failed:', e)
    }
}

export async function unregisterPushToken(): Promise<void> {
    try {
        await api.delete('/push-token')
    } catch {}
}
