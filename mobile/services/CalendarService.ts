import api from './ApiService'

export type CalendarEvent = {
    id: string
    type: 'custom' | 'work_order'
    title: string
    start_at: string | null
    end_at: string | null
    color: string | null
    priority: string | null
    status: string | null
    db_id: number
    member_id?: number | null
}

export type CalendarResponse = {
    success: boolean
    data: {
        custom_events: CalendarEvent[]
        wo_events: CalendarEvent[]
    }
}

export async function apiGetCalendar(params?: Record<string, unknown>) {
    return api.get<CalendarResponse>('/calendar', { params })
}

export async function apiCreateCalendarEvent(data: {
    title: string
    start_at: string
    end_at?: string | null
    color?: string | null
}) {
    return api.post<{ success: boolean; data: { event: CalendarEvent } }>('/calendar', data)
}

export async function apiUpdateCalendarEvent(id: number, data: {
    title?: string
    start_at?: string
    end_at?: string | null
    color?: string | null
}) {
    return api.patch<{ success: boolean; data: { event: CalendarEvent } }>(`/calendar/${id}`, data)
}

export async function apiDeleteCalendarEvent(id: number) {
    return api.delete(`/calendar/${id}`)
}
