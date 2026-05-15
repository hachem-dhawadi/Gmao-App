import Timeline from '@/components/ui/Timeline'
import dayjs from 'dayjs'
import {
    TbCircleCheck,
    TbCircleX,
    TbRefresh,
    TbPlayerPlay,
    TbPlayerPause,
    TbCircleDot,
} from 'react-icons/tb'
import type { WorkOrderStatusHistory } from '@/services/WorkOrdersService'

const statusIcon: Record<string, JSX.Element> = {
    open: <TbCircleDot className="text-blue-500" />,
    in_progress: <TbPlayerPlay className="text-amber-500" />,
    on_hold: <TbPlayerPause className="text-gray-500" />,
    completed: <TbCircleCheck className="text-emerald-500" />,
    cancelled: <TbCircleX className="text-red-500" />,
}

const statusLabel: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    cancelled: 'Cancelled',
}

type Props = {
    history: WorkOrderStatusHistory[]
    openedAt: string | null
    createdBy: string | null
}

const WoActivity = ({ history, openedAt, createdBy }: Props) => {
    return (
        <div className="px-2">
            <h5 className="mb-4">Activity</h5>
            <Timeline>
                {/* Created entry */}
                <Timeline.Item
                    media={
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-500 text-base">
                            <TbCircleDot />
                        </div>
                    }
                >
                    <div className="mt-1">
                        <p className="text-sm">
                            <span className="font-semibold">
                                {createdBy || 'Someone'}
                            </span>{' '}
                            created this work order
                        </p>
                        {openedAt && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {dayjs(openedAt).format('MMM D, YYYY HH:mm')}
                            </p>
                        )}
                    </div>
                </Timeline.Item>

                {/* Status changes */}
                {history.map((entry) => (
                    <Timeline.Item
                        key={entry.id}
                        media={
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-base">
                                {statusIcon[entry.new_status] || (
                                    <TbRefresh className="text-gray-400" />
                                )}
                            </div>
                        }
                    >
                        <div className="mt-1">
                            <p className="text-sm">
                                <span className="font-semibold">
                                    {entry.changed_by || 'Someone'}
                                </span>{' '}
                                changed status from{' '}
                                <span className="font-medium text-gray-600 dark:text-gray-300">
                                    {statusLabel[entry.old_status] ||
                                        entry.old_status}
                                </span>{' '}
                                to{' '}
                                <span className="font-semibold text-primary">
                                    {statusLabel[entry.new_status] ||
                                        entry.new_status}
                                </span>
                            </p>
                            {entry.note && (
                                <p className="text-xs text-gray-400 mt-0.5 italic">
                                    {entry.note}
                                </p>
                            )}
                            {entry.changed_at && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {dayjs(entry.changed_at).format(
                                        'MMM D, YYYY HH:mm',
                                    )}
                                </p>
                            )}
                        </div>
                    </Timeline.Item>
                ))}

                {history.length === 0 && (
                    <Timeline.Item>
                        <p className="text-sm text-gray-400 mt-1">
                            No status changes yet.
                        </p>
                    </Timeline.Item>
                )}
            </Timeline>
        </div>
    )
}

export default WoActivity
