import useSWR from 'swr'
import { useMailStore } from '../store/mailStore'
import {
    apiGetNotifications,
    apiMarkNotificationRead,
    apiMarkAllNotificationsRead,
} from '@/services/MailServices'
import type { GetNotificationsResponse } from '../types'

const useNotifications = () => {
    const {
        setNotifications,
        setNotificationsFetched,
        markOneRead,
        markAllRead,
    } = useMailStore()

    const { isLoading, mutate } = useSWR<GetNotificationsResponse>(
        '/notifications',
        () => apiGetNotifications<GetNotificationsResponse>(),
        {
            revalidateOnFocus: false,
            onSuccess: (res) => {
                setNotifications(res.data || [])
                setNotificationsFetched(true)
            },
        },
    )

    const handleMarkRead = async (id: number) => {
        try {
            await apiMarkNotificationRead(id)
            markOneRead(id)
            mutate()
        } catch {
            // silently fail
        }
    }

    const handleMarkAllRead = async () => {
        try {
            await apiMarkAllNotificationsRead()
            markAllRead()
            mutate()
        } catch {
            // silently fail
        }
    }

    return {
        isLoading,
        handleMarkRead,
        handleMarkAllRead,
    }
}

export default useNotifications
