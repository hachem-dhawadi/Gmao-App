import ApiService from './ApiService'

export type CreateCalendarEventPayload = {
    title: string
    start_at: string
    end_at?: string | null
    color?: string
}

export type UpdateCalendarEventPayload = Partial<CreateCalendarEventPayload>

export async function apiGetCalendar<T>(params?: Record<string, string>) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/calendar',
        method: 'get',
        params,
    })
}

export async function apiCreateCalendarEvent<T>(data: CreateCalendarEventPayload) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/calendar',
        method: 'post',
        data,
    })
}

export async function apiUpdateCalendarEvent<T>(
    id: number,
    data: UpdateCalendarEventPayload,
) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/calendar/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteCalendarEvent<T>(id: number) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/calendar/${id}`,
        method: 'delete',
    })
}
