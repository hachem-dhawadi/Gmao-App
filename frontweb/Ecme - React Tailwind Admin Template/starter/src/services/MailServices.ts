import ApiService from './ApiService'

export async function apiGetNotifications<T = unknown>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/notifications',
        method: 'get',
    })
}

export async function apiMarkNotificationRead<T = unknown>(id: number) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/notifications/${id}/read`,
        method: 'post',
    })
}

export async function apiMarkAllNotificationsRead<T = unknown>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/notifications/read-all',
        method: 'post',
    })
}
