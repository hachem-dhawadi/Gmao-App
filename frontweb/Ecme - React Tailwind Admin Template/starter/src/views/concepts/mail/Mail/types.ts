export type AppNotification = {
    id: number
    type: string
    title: string
    body: string
    data: Record<string, unknown>
    read: boolean
    created_at: string
}

export type NotificationCategory = {
    value: string
    label: string
}

export type GetNotificationsResponse = {
    success: boolean
    data: AppNotification[]
}

export type GetUnreadCountResponse = {
    success: boolean
    data: { count: number }
}
