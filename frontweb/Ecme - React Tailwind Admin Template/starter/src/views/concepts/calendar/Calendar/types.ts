export type CalendarEventParam = {
    id: string
    title: string
    start: string
    eventColor: string
    end?: string
}

export type CalendarEvent = {
    id: string
    title: string
    start: string
    end?: string
    eventColor: string
    groupId?: undefined
}

export type SelectedCell = {
    type: string
    db_id?: number
} & Partial<CalendarEvent>

export type CalendarEvents = CalendarEvent[]

// API response shapes
export type ApiCalendarCustomEvent = {
    id: string
    type: 'custom'
    title: string
    start_at: string
    end_at: string | null
    color: string
    member_id: number
    db_id: number
}

export type ApiCalendarWoEvent = {
    id: string
    type: 'work_order'
    title: string
    start_at: string
    end_at: null
    priority: string
    status: string
    db_id: number
}

export type GetCalendarResponse = {
    success: boolean
    data: {
        custom_events: ApiCalendarCustomEvent[]
        wo_events: ApiCalendarWoEvent[]
    }
}
