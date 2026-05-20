import { useMemo, useState } from 'react'
import CalendarView from '@/components/shared/CalendarView'
import Container from '@/components/shared/Container'
import EventDialog from './components/EventDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Button from '@/components/ui/Button'
import {
    apiGetCalendar,
    apiCreateCalendarEvent,
    apiUpdateCalendarEvent,
    apiDeleteCalendarEvent,
} from '@/services/CalendarService'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import useSWR from 'swr'
import dayjs from 'dayjs'
import type {
    GetCalendarResponse,
    SelectedCell,
    CalendarEventParam,
} from './types'
import type { EventDropArg, EventClickArg, DateSelectArg } from '@fullcalendar/core'

type EventColors = Record<string, { bg: string; text: string }>

const woColorMap = (base: EventColors): EventColors => ({
    ...base,
    wo: {
        bg: 'bg-amber-400',
        text: 'text-amber-900',
        dot: 'bg-amber-200',
    },
})

const Calendar = () => {
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const currentMemberId = useSessionUser((state) => state.user.memberId)
    const isPrivileged = useAuthority(userAuthority, ['work_orders.assign', 'admin', 'manager'])

    const [filterMine, setFilterMine] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedCell, setSelectedCell] = useState<SelectedCell>({ type: '' })

    const params = useMemo<Record<string, string>>(() => {
        if (isPrivileged && filterMine && currentMemberId) {
            return { member_id: String(currentMemberId) }
        }
        return {}
    }, [isPrivileged, filterMine, currentMemberId])

    const swrKey = useMemo(
        () => ['/calendar', isPrivileged ? filterMine : 'myonly'],
        [isPrivileged, filterMine],
    )

    const { data, mutate } = useSWR(
        swrKey,
        () => apiGetCalendar<GetCalendarResponse>(params),
        { revalidateOnFocus: false },
    )

    const fcEvents = useMemo(() => {
        const customEvents = (data?.data?.custom_events ?? []).map((e) => ({
            id: e.id,
            title: e.title,
            start: e.start_at,
            end: e.end_at ?? undefined,
            allDay: true,
            extendedProps: {
                eventColor: e.color,
                type: 'custom',
                db_id: e.db_id,
            },
        }))

        const woEvents = (data?.data?.wo_events ?? []).map((e) => ({
            id: e.id,
            title: e.title,
            start: e.start_at,
            allDay: true,
            editable: false,
            extendedProps: {
                eventColor: 'wo',
                type: 'work_order',
                db_id: e.db_id,
                priority: e.priority,
                status: e.status,
            },
        }))

        return [...customEvents, ...woEvents]
    }, [data])

    const handleCellSelect = (event: DateSelectArg) => {
        const { start, end } = event
        setSelectedCell({
            type: 'NEW',
            start: dayjs(start).format(),
            end: dayjs(end).format(),
        })
        setDialogOpen(true)
    }

    const handleEventClick = (arg: EventClickArg) => {
        const { extendedProps, start, end, id, title } = arg.event

        if (extendedProps.type === 'work_order') {
            navigate(
                `/concepts/work-orders/work-order-details/${extendedProps.db_id}`,
            )
            return
        }

        setSelectedCell({
            type: 'EDIT',
            eventColor: extendedProps.eventColor,
            title,
            start: start ? dayjs(start).toISOString() : undefined,
            end: end ? dayjs(end).toISOString() : undefined,
            id,
            db_id: extendedProps.db_id,
        })
        setDialogOpen(true)
    }

    const handleEventChange = async (arg: EventDropArg) => {
        const { extendedProps, start, end } = arg.event
        if (extendedProps.type !== 'custom') return

        try {
            await apiUpdateCalendarEvent(extendedProps.db_id, {
                start_at: dayjs(start).toISOString(),
                end_at: end ? dayjs(end).toISOString() : null,
            })
            mutate()
        } catch {
            arg.revert()
            toast.push(
                <Notification type="danger">
                    Failed to move event. Please try again.
                </Notification>,
                { placement: 'top-center' },
            )
        }
    }

    const handleSubmit = async (eventData: CalendarEventParam, type: string) => {
        try {
            if (type === 'NEW') {
                await apiCreateCalendarEvent({
                    title: eventData.title,
                    start_at: eventData.start,
                    end_at: eventData.end ?? null,
                    color: eventData.eventColor,
                })
            } else if (type === 'EDIT' && selectedCell.db_id) {
                await apiUpdateCalendarEvent(selectedCell.db_id, {
                    title: eventData.title,
                    start_at: eventData.start,
                    end_at: eventData.end ?? null,
                    color: eventData.eventColor,
                })
            }
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">
                    Failed to save event. Please try again.
                </Notification>,
                { placement: 'top-center' },
            )
        }
    }

    const handleDelete = async (db_id: number) => {
        try {
            await apiDeleteCalendarEvent(db_id)
            mutate()
            toast.push(
                <Notification type="success">Event deleted.</Notification>,
                { placement: 'top-center' },
            )
        } catch {
            toast.push(
                <Notification type="danger">
                    Failed to delete event.
                </Notification>,
                { placement: 'top-center' },
            )
        }
    }

    return (
        <Container className="h-full">
            {isPrivileged && (
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-gray-500 font-semibold mr-1">
                        Show:
                    </span>
                    <Button
                        size="sm"
                        variant={!filterMine ? 'solid' : 'default'}
                        onClick={() => setFilterMine(false)}
                    >
                        All
                    </Button>
                    <Button
                        size="sm"
                        variant={filterMine ? 'solid' : 'default'}
                        onClick={() => setFilterMine(true)}
                    >
                        Mine
                    </Button>
                </div>
            )}
            <CalendarView
                editable
                selectable
                events={fcEvents}
                eventClick={handleEventClick}
                select={handleCellSelect}
                eventDrop={handleEventChange}
                eventColors={woColorMap}
            />
            <EventDialog
                open={dialogOpen}
                selected={selectedCell}
                submit={handleSubmit}
                onDelete={handleDelete}
                onDialogOpen={setDialogOpen}
            />
        </Container>
    )
}

export default Calendar
