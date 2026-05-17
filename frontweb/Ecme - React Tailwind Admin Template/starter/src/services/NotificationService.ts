import ApiService from './ApiService'

export type AppNotification = {
    id: number
    type: string
    title: string
    body: string
    data: {
        wo_id?: number
        wo_code?: string
        wo_title?: string
        new_status?: string
    }
    read: boolean
    created_at: string | null
}

export async function apiGetNotifications() {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: AppNotification[] }>({
        url: '/notifications',
        method: 'get',
    })
}

export async function apiGetUnreadCount() {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: { count: number } }>({
        url: '/notifications/unread-count',
        method: 'get',
    })
}

export async function apiMarkNotificationRead(id: number) {
    return ApiService.fetchDataWithAxios<{ success: boolean }>({
        url: `/notifications/${id}/read`,
        method: 'post',
    })
}

export async function apiMarkAllNotificationsRead() {
    return ApiService.fetchDataWithAxios<{ success: boolean }>({
        url: '/notifications/read-all',
        method: 'post',
    })
}
