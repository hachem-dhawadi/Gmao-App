import {
    TbBell,
    TbBellRinging,
    TbTool,
    TbCalendarRepeat,
    TbPackage,
    TbSettings,
    TbClipboardList,
    TbAt,
    TbRefresh,
    TbAlertTriangle,
    TbReceipt,
    TbUserPlus,
    TbClockExclamation,
} from 'react-icons/tb'
import type { NotificationCategory } from './types'

export type CategoryWithIcon = NotificationCategory & { icon: JSX.Element }

export const categoryList: CategoryWithIcon[] = [
    { value: 'all',        label: 'All',         icon: <TbBell /> },
    { value: 'unread',     label: 'Unread',       icon: <TbBellRinging /> },
    { value: 'work_order', label: 'Work Orders',  icon: <TbTool /> },
    { value: 'pm_plan',    label: 'PM Plans',     icon: <TbCalendarRepeat /> },
    { value: 'inventory',  label: 'Inventory',    icon: <TbPackage /> },
    { value: 'system',     label: 'System',       icon: <TbSettings /> },
]

// Maps backend notification type → display icon
export const typeIconMap: Record<string, JSX.Element> = {
    wo_assigned:       <TbClipboardList />,
    wo_status_changed: <TbRefresh />,
    wo_overdue:        <TbClockExclamation />,
    comment_mention:   <TbAt />,
    low_stock:         <TbAlertTriangle />,
    pm_assigned:       <TbCalendarRepeat />,
    po_ordered:        <TbReceipt />,
    new_member:        <TbUserPlus />,
}

// Maps backend notification type → human-readable label
export const typeLabelMap: Record<string, string> = {
    wo_assigned:       'Work Order',
    wo_status_changed: 'Work Order',
    wo_overdue:        'Work Order',
    comment_mention:   'Work Order',
    low_stock:         'Inventory',
    pm_assigned:       'PM Plan',
    po_ordered:        'System',
    new_member:        'System',
}

// Maps backend notification type → sidebar category value (for filtering)
export const typeCategoryMap: Record<string, string> = {
    wo_assigned:       'work_order',
    wo_status_changed: 'work_order',
    wo_overdue:        'work_order',
    comment_mention:   'work_order',
    low_stock:         'inventory',
    pm_assigned:       'pm_plan',
    po_ordered:        'system',
    new_member:        'system',
}

// Maps category value → tag color classes
export const categoryColorMap: Record<string, string> = {
    work_order: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    pm_plan:    'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
    inventory:  'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    system:     'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
}
