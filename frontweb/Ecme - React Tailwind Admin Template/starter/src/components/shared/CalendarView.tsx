import classNames from '@/utils/classNames'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { CalendarOptions } from '@fullcalendar/core'

type EventColors = Record<
    string,
    {
        bg: string
        text: string
        dot?: string
    }
>

interface CalendarViewProps extends CalendarOptions {
    wrapperClass?: string
    eventColors?: (colors: EventColors) => EventColors
}

const defaultColorList: EventColors = {
    red: {
        bg: 'bg-red-500',
        text: 'text-white',
        dot: 'bg-red-300',
    },
    orange: {
        bg: 'bg-orange-500',
        text: 'text-white',
        dot: 'bg-orange-300',
    },
    yellow: {
        bg: 'bg-yellow-400',
        text: 'text-yellow-900',
        dot: 'bg-yellow-200',
    },
    green: {
        bg: 'bg-emerald-500',
        text: 'text-white',
        dot: 'bg-emerald-300',
    },
    blue: {
        bg: 'bg-blue-500',
        text: 'text-white',
        dot: 'bg-blue-300',
    },
    purple: {
        bg: 'bg-violet-500',
        text: 'text-white',
        dot: 'bg-violet-300',
    },
}

const CalendarView = (props: CalendarViewProps) => {
    const {
        wrapperClass,
        eventColors = () => defaultColorList,
        ...rest
    } = props

    const colorList = eventColors(defaultColorList)

    return (
        <div className={classNames('calendar', wrapperClass)}>
            <FullCalendar
                initialView="dayGridMonth"
                headerToolbar={{
                    left: 'title',
                    center: '',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay prev,next',
                }}
                eventContent={(arg) => {
                    const { extendedProps } = arg.event
                    const { isEnd, isStart } = arg
                    const palette = extendedProps.eventColor
                        ? (colorList[extendedProps.eventColor] ?? null)
                        : null
                    const isWo = extendedProps.type === 'work_order'

                    return (
                        <div
                            className={classNames(
                                'flex items-center gap-1.5 w-full px-2 py-0.5 rounded-md text-xs font-semibold truncate cursor-pointer select-none',
                                palette ? palette.bg : 'bg-gray-400',
                                palette ? palette.text : 'text-white',
                                isEnd &&
                                    !isStart &&
                                    'rounded-tl-none rounded-bl-none',
                                !isEnd &&
                                    isStart &&
                                    'rounded-tr-none rounded-br-none',
                            )}
                        >
                            {isWo ? (
                                <span className="text-[10px] opacity-80 flex-shrink-0">
                                    ⚙
                                </span>
                            ) : (
                                <span
                                    className={classNames(
                                        'w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-70',
                                        palette?.dot ?? 'bg-white',
                                    )}
                                />
                            )}
                            <span className="truncate">{arg.event.title}</span>
                        </div>
                    )
                }}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                {...rest}
            />
        </div>
    )
}

export default CalendarView
