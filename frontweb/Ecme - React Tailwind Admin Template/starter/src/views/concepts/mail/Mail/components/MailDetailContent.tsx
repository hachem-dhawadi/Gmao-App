import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import ScrollBar from '@/components/ui/ScrollBar'
import classNames from '@/utils/classNames'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useMailStore } from '../store/mailStore'
import { typeIconMap, typeLabelMap, typeCategoryMap, categoryColorMap } from '../constants'
import { TbBell, TbClock, TbArrowRight } from 'react-icons/tb'

const resolveRoute = (type: string, data: Record<string, unknown>): string | null => {
    if (data.wo_id)   return `/concepts/work-orders/work-order-details/${data.wo_id}`
    if (data.pm_id)   return `/concepts/pm/pm-details/${data.pm_id}`
    if (data.po_id)   return `/concepts/purchasing/purchase-orders/${data.po_id}`
    if (data.item_id) return `/concepts/inventory/items/item-details/${data.item_id}`
    if (type === 'new_member') return `/concepts/customers/customer-list`
    return null
}

const MailDetailContent = () => {
    const { activeNotification } = useMailStore()
    const navigate = useNavigate()

    if (!activeNotification) return null

    const n = activeNotification
    const category = typeCategoryMap[n.type] ?? 'system'
    const route = resolveRoute(n.type, n.data)

    const dataEntries = Object.entries(n.data || {}).filter(
        ([, v]) => v !== null && v !== undefined && v !== '',
    )

    return (
        <div className="absolute top-0 left-0 h-full w-full">
            <ScrollBar autoHide className="overflow-y-auto h-full">
                <div className="px-6 py-8 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <Tag
                            className={classNames(
                                'text-xs border-0 px-2 py-1 flex items-center gap-1',
                                categoryColorMap[category] ?? categoryColorMap.system,
                            )}
                        >
                            <span className="text-sm">
                                {typeIconMap[n.type] ?? <TbBell />}
                            </span>
                            {typeLabelMap[n.type] ?? n.type}
                        </Tag>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                            <TbClock className="text-sm" />
                            {dayjs(n.created_at).format('DD MMM YYYY, HH:mm')}
                        </span>
                        {!n.read && (
                            <span className="text-xs font-semibold text-primary">
                                Unread
                            </span>
                        )}
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">
                        {n.body}
                    </p>

                    {route && (
                        <div className="mt-6">
                            <Button
                                size="sm"
                                variant="solid"
                                icon={<TbArrowRight />}
                                onClick={() => navigate(route)}
                            >
                                View in App
                            </Button>
                        </div>
                    )}

                    {dataEntries.length > 0 && (
                        <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
                            <h6 className="text-xs uppercase text-gray-400 mb-3">
                                Details
                            </h6>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {dataEntries.map(([key, value]) => (
                                    <div key={key}>
                                        <p className="text-xs text-gray-400 capitalize">
                                            {key.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 break-words">
                                            {String(value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollBar>
        </div>
    )
}

export default MailDetailContent
