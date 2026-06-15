import React from 'react'
import Timeline from '@/components/ui/Timeline'
import dayjs from 'dayjs'
import {
    TbCircleCheck,
    TbCircleX,
    TbRefresh,
    TbPlayerPlay,
    TbPlayerPause,
    TbCircleDot,
    TbUserCheck,
    TbUserOff,
    TbMessageCircle,
    TbPaperclip,
    TbClock,
    TbTool,
} from 'react-icons/tb'
import type { WoActivityEvent } from '@/services/WorkOrdersService'

const statusLabel: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    cancelled: 'Cancelled',
    pending_approval: 'Pending Approval',
}

function formatMinutes(mins: number): string {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h && m) return `${h}h ${m}m`
    if (h) return `${h}h`
    return `${m}m`
}

type EventConfig = {
    icon: React.ReactElement
    iconBg: string
    label: (event: WoActivityEvent) => React.ReactNode
}

const eventConfig: Record<string, EventConfig> = {
    created: {
        icon: <TbCircleDot />,
        iconBg: 'bg-blue-100 dark:bg-blue-500/20 text-blue-500',
        label: (e) => (
            <span>
                <span className="font-semibold">{e.actor || 'Someone'}</span> created this work order
            </span>
        ),
    },
    status_change: {
        icon: <TbRefresh />,
        iconBg: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
        label: (e) => {
            const old = statusLabel[e.meta.old_status as string] || (e.meta.old_status as string)
            const next = statusLabel[e.meta.new_status as string] || (e.meta.new_status as string)
            const icons: Record<string, React.ReactElement> = {
                completed: <TbCircleCheck className="inline text-emerald-500" />,
                cancelled:  <TbCircleX    className="inline text-red-500"     />,
                in_progress:<TbPlayerPlay  className="inline text-amber-500"   />,
                on_hold:    <TbPlayerPause className="inline text-gray-400"    />,
                open:       <TbCircleDot  className="inline text-blue-500"    />,
            }
            return (
                <span>
                    <span className="font-semibold">{e.actor || 'Someone'}</span> changed status from{' '}
                    <span className="text-gray-500 dark:text-gray-400">{old}</span> to{' '}
                    <span className="font-semibold text-primary">
                        {icons[e.meta.new_status as string]} {next}
                    </span>
                    {e.meta.note && (
                        <span className="italic text-gray-400"> — {e.meta.note as string}</span>
                    )}
                </span>
            )
        },
    },
    assigned: {
        icon: <TbUserCheck />,
        iconBg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-500',
        label: (e) => (
            <span>
                <span className="font-semibold">{e.actor || 'Someone'}</span> assigned this work order to{' '}
                <span className="font-semibold">{(e.meta.member_name as string) || 'a member'}</span>
            </span>
        ),
    },
    unassigned: {
        icon: <TbUserOff />,
        iconBg: 'bg-gray-100 dark:bg-gray-700 text-gray-400',
        label: (e) => (
            <span>
                <span className="font-semibold">{e.actor || 'Someone'}</span> removed the assignee
            </span>
        ),
    },
    comment_added: {
        icon: <TbMessageCircle />,
        iconBg: 'bg-sky-100 dark:bg-sky-500/20 text-sky-500',
        label: (e) => (
            <span>
                <span className="font-semibold">{e.actor || 'Someone'}</span> left a comment
                {e.meta.snippet && (
                    <span className="text-gray-400 italic"> — "{e.meta.snippet as string}{(e.meta.snippet as string).length >= 120 ? '…' : ''}"</span>
                )}
            </span>
        ),
    },
    attachment_added: {
        icon: <TbPaperclip />,
        iconBg: 'bg-orange-100 dark:bg-orange-500/20 text-orange-500',
        label: (e) => (
            <span>
                <span className="font-semibold">{e.actor || 'Someone'}</span> attached{' '}
                <span className="font-medium">{(e.meta.file_name as string) || 'a file'}</span>
            </span>
        ),
    },
    work_log_added: {
        icon: <TbClock />,
        iconBg: 'bg-teal-100 dark:bg-teal-500/20 text-teal-500',
        label: (e) => (
            <span>
                <span className="font-semibold">{e.actor || 'Someone'}</span> logged{' '}
                <span className="font-semibold">{formatMinutes(e.meta.minutes as number)}</span> of work
                {e.meta.notes && (
                    <span className="text-gray-400 italic"> — {e.meta.notes as string}</span>
                )}
            </span>
        ),
    },
    part_used: {
        icon: <TbTool />,
        iconBg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-500',
        label: (e) => (
            <span>
                <span className="font-semibold">{e.actor || 'Someone'}</span>{' '}
                {e.meta.usage_type === 'scrapped' ? 'scrapped' : 'used'}{' '}
                <span className="font-semibold">
                    {e.meta.quantity as number} {e.meta.unit as string || ''} of {e.meta.item_name as string}
                </span>
                {e.meta.warehouse && (
                    <span className="text-gray-400"> from {e.meta.warehouse as string}</span>
                )}
            </span>
        ),
    },
}

type Props = {
    events: WoActivityEvent[]
}

const WoActivity = ({ events }: Props) => {
    if (!events || events.length === 0) {
        return (
            <div className="px-2">
                <h5 className="mb-4">Activity</h5>
                <p className="text-sm text-gray-400">No activity yet.</p>
            </div>
        )
    }

    return (
        <div className="px-2">
            <h5 className="mb-4">Activity</h5>
            <Timeline>
                {events.map((event, idx) => {
                    const cfg = eventConfig[event.type]
                    if (!cfg) return null
                    return (
                        <Timeline.Item
                            key={idx}
                            media={
                                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-base ${cfg.iconBg}`}>
                                    {cfg.icon}
                                </div>
                            }
                        >
                            <div className="mt-1">
                                <p className="text-sm">{cfg.label(event)}</p>
                                {event.created_at && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {dayjs(event.created_at).format('MMM D, YYYY HH:mm')}
                                    </p>
                                )}
                            </div>
                        </Timeline.Item>
                    )
                })}
            </Timeline>
        </div>
    )
}

export default WoActivity
