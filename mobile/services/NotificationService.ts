import api from './ApiService'

export type AppNotification = {
    id: number
    type: string
    title: string
    body: string
    data: Record<string, unknown>
    read: boolean
    created_at: string | null
}

export async function apiGetNotifications() {
    return api.get<{ success: boolean; data: AppNotification[] }>('/notifications')
}

export async function apiMarkNotificationRead(id: number) {
    return api.post(`/notifications/${id}/read`)
}

export async function apiMarkAllNotificationsRead() {
    return api.post('/notifications/read-all')
}

export async function apiGetUnreadCount() {
    return api.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count')
}
