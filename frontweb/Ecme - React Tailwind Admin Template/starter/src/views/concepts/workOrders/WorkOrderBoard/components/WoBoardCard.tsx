import { useTranslation } from 'react-i18next'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import UsersAvatarGroup from '@/components/shared/UsersAvatarGroup'
import { TbCalendar } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { WorkOrder } from '@/services/WorkOrdersService'
import type { CardProps } from '@/components/ui/Card'
import type { Ref } from 'react'

interface WoBoardCardProps extends CardProps {
    data: WorkOrder
    ref?: Ref<HTMLDivElement>
}

const priorityClassName: Record<WorkOrder['priority'], string> = {
    low: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    medium: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0',
    high: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    critical: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
}

const WoBoardCard = (props: WoBoardCardProps) => {
    const { data, ref, ...rest } = props
    const navigate = useNavigate()
    const { t } = useTranslation()

    const isOverdue =
        data.due_at &&
        new Date(data.due_at) < new Date() &&
        data.status !== 'completed' &&
        data.status !== 'cancelled'

    const members = data.assigned_member
        ? [{ id: String(data.assigned_member.id), name: data.assigned_member.name, email: '', img: '' }]
        : []

    return (
        <Card
            ref={ref}
            clickable
            className="hover:shadow-lg rounded-lg mb-4 border-0"
            bodyClass="p-4"
            onClick={() =>
                navigate(
                    `/concepts/work-orders/work-order-details/${data.id}`,
                )
            }
            {...rest}
        >
            <div className="flex items-center justify-between mb-2">
                <Tag className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-mono text-xs border-0">
                    {data.code}
                </Tag>
                <Tag className={`text-xs ${priorityClassName[data.priority]}`}>
                    {t(`wo.priority.${data.priority}`)}
                </Tag>
            </div>

            <div className="mb-2 font-bold heading-text text-base">
                {data.title}
            </div>

            {data.asset && (
                <Tag className="border-0 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs mb-2">
                    {data.asset.name}
                </Tag>
            )}

            <div className="flex items-center justify-between mt-3">
                <UsersAvatarGroup
                    avatarProps={{ size: 25 }}
                    users={members}
                />
                {data.due_at && (
                    <div
                        className={`flex items-center gap-1 text-xs ${
                            isOverdue
                                ? 'text-red-500 font-semibold'
                                : 'text-gray-400'
                        }`}
                    >
                        <TbCalendar className="text-sm" />
                        {dayjs(data.due_at).format('MMM D')}
                    </div>
                )}
            </div>
        </Card>
    )
}

export default WoBoardCard
