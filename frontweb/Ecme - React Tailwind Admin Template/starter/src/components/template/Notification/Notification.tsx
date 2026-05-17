import { useEffect, useState, useRef, useCallback } from 'react'
import classNames from 'classnames'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import Dropdown from '@/components/ui/Dropdown'
import ScrollBar from '@/components/ui/ScrollBar'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import NotificationToggle from './NotificationToggle'
import {
    apiGetNotifications,
    apiGetUnreadCount,
    apiMarkNotificationRead,
    apiMarkAllNotificationsRead,
} from '@/services/NotificationService'
import type { AppNotification } from '@/services/NotificationService'
import { HiOutlineMailOpen } from 'react-icons/hi'
import { TbClipboardList, TbAt, TbRefresh } from 'react-icons/tb'
import isLastChild from '@/utils/isLastChild'
import useResponsive from '@/utils/hooks/useResponsive'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { DropdownRef } from '@/components/ui/Dropdown'

dayjs.extend(relativeTime)

const notificationHeight = 'h-[300px]'

const typeIcon: Record<string, React.ReactNode> = {
    wo_assigned:       <TbClipboardList className="text-blue-500 text-xl" />,
    wo_status_changed: <TbRefresh className="text-amber-500 text-xl" />,
    comment_mention:   <TbAt className="text-purple-500 text-xl" />,
}

const _Notification = ({ className }: { className?: string }) => {
    const [list, setList]               = useState<AppNotification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading]         = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)

    const { larger } = useResponsive()
    const navigate   = useNavigate()
    const dropdownRef = useRef<DropdownRef>(null)

    const fetchList = useCallback(async () => {
        setLoading(true)
        try {
            const res = await apiGetNotifications()
            setList(res.data)
        } catch {
            setList([])
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchCount = useCallback(async () => {
        try {
            const res = await apiGetUnreadCount()
            setUnreadCount(res.data.count)
        } catch {
            // silently ignore
        }
    }, [])

    // Poll unread count every 30 seconds
    useEffect(() => {
        void fetchCount()
        const id = setInterval(fetchCount, 15_000)
        return () => clearInterval(id)
    }, [fetchCount])

    // When a new notification arrives (count goes up) and dropdown is open, refresh the list
    useEffect(() => {
        if (dropdownOpen && unreadCount > 0) {
            void fetchList()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unreadCount])

    const onOpen = async () => {
        setDropdownOpen(true)
        await fetchList()
    }

    const onMarkRead = async (n: AppNotification) => {
        if (!n.read) {
            await apiMarkNotificationRead(n.id)
            setList((prev) => prev.map((item) => item.id === n.id ? { ...item, read: true } : item))
            setUnreadCount((c) => Math.max(0, c - 1))
        }
        if (n.data.wo_id) {
            navigate(`/concepts/work-orders/work-order-details/${n.data.wo_id}`)
            dropdownRef.current?.handleDropdownClose()
        }
    }

    const onMarkAllRead = async () => {
        await apiMarkAllNotificationsRead()
        setList((prev) => prev.map((item) => ({ ...item, read: true })))
        setUnreadCount(0)
    }

    return (
        <Dropdown
            ref={dropdownRef}
            renderTitle={
                <NotificationToggle
                    dot={unreadCount > 0}
                    className={className}
                    count={unreadCount}
                />
            }
            menuClass="min-w-[280px] md:min-w-[360px]"
            placement={larger.md ? 'bottom-end' : 'bottom'}
            onOpen={onOpen}
        >
            <Dropdown.Item variant="header">
                <div className="px-2 flex items-center justify-between mb-1">
                    <h6>
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-2 text-xs font-normal text-primary">
                                {unreadCount} unread
                            </span>
                        )}
                    </h6>
                    <Tooltip title="Mark all as read">
                        <Button
                            variant="plain"
                            shape="circle"
                            size="sm"
                            icon={<HiOutlineMailOpen className="text-xl" />}
                            onClick={onMarkAllRead}
                        />
                    </Tooltip>
                </div>
            </Dropdown.Item>

            <ScrollBar className={classNames('overflow-y-auto', notificationHeight)}>
                {loading && (
                    <div className={classNames('flex items-center justify-center', notificationHeight)}>
                        <Spinner size={40} />
                    </div>
                )}

                {!loading && list.length === 0 && (
                    <div className={classNames('flex items-center justify-center', notificationHeight)}>
                        <div className="text-center">
                            <img
                                className="mx-auto mb-2 max-w-[150px]"
                                src="/img/others/no-notification.png"
                                alt="no notifications"
                            />
                            <h6 className="font-semibold">No notifications</h6>
                            <p className="mt-1 text-sm text-gray-400">You're all caught up!</p>
                        </div>
                    </div>
                )}

                {!loading && list.map((item, index) => (
                    <div key={item.id}>
                        <div
                            className={classNames(
                                'relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors rounded-xl',
                                item.read
                                    ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30',
                            )}
                            onClick={() => onMarkRead(item)}
                        >
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white dark:bg-gray-700 shadow flex items-center justify-center">
                                {typeIcon[item.type] ?? <TbClipboardList className="text-gray-400 text-xl" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                                    {item.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                    {item.body}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {dayjs(item.created_at).fromNow()}
                                </p>
                            </div>
                            {!item.read && (
                                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                            )}
                        </div>
                        {!isLastChild(list, index) && (
                            <div className="border-b border-gray-100 dark:border-gray-700 mx-4" />
                        )}
                    </div>
                ))}
            </ScrollBar>
        </Dropdown>
    )
}

const Notification = withHeaderItem(_Notification)

export default Notification
