import { useTranslation } from 'react-i18next'
import ScrollBar from '@/components/ui/ScrollBar'
import Loading from '@/components/shared/Loading'
import Tag from '@/components/ui/Tag'
import classNames from '@/utils/classNames'
import isLastChild from '@/utils/isLastChild'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMailStore } from '../store/mailStore'
import useNotifications from '../hooks/useMail'
import { typeIconMap, typeLabelMap, typeCategoryMap, categoryColorMap } from '../constants'
import { TbBell } from 'react-icons/tb'
import type { AppNotification } from '../types'

dayjs.extend(relativeTime)

const MailList = () => {
    const { t } = useTranslation()
    const { notifications, selectedCategory, setActiveNotification } = useMailStore()
    const { isLoading, handleMarkRead } = useNotifications()

    const filtered = notifications.filter((n) => {
        if (selectedCategory === 'all')    return true
        if (selectedCategory === 'unread') return !n.read
        return typeCategoryMap[n.type] === selectedCategory
    })

    const handleClick = (n: AppNotification) => {
        setActiveNotification(n)
        if (!n.read) {
            handleMarkRead(n.id)
        }
    }

    return (
        <div className="lg:absolute top-0 left-0 h-full w-full">
            <ScrollBar autoHide className="overflow-y-auto lg:h-full">
                <Loading
                    type={filtered.length > 0 ? 'cover' : 'default'}
                    spinnerClass={filtered.length > 0 ? 'hidden' : ''}
                    loading={isLoading}
                >
                    {filtered.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <TbBell className="text-5xl mb-3" />
                            <p>{t('mail.noNotifications')}</p>
                        </div>
                    )}
                    {filtered.map((n, index) => {
                        const category = typeCategoryMap[n.type] ?? 'system'
                        return (
                            <div
                                key={n.id}
                                className={classNames(
                                    'flex items-start gap-3 px-3 py-4 cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                                    !isLastChild(filtered, index) &&
                                        'border-b border-gray-100 dark:border-gray-700',
                                    !n.read && 'bg-primary/5',
                                )}
                                onClick={() => handleClick(n)}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {!n.read && (
                                        <span className="block w-2 h-2 rounded-full bg-primary mt-1.5 mr-1" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-base text-gray-500 dark:text-gray-400">
                                            {typeIconMap[n.type] ?? <TbBell />}
                                        </span>
                                        <Tag
                                            className={classNames(
                                                'text-xs border-0 px-1.5 py-0.5',
                                                categoryColorMap[category],
                                            )}
                                        >
                                            {t(`mail.typeLabel.${n.type}`, { defaultValue: n.type })}
                                        </Tag>
                                        <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                                            {dayjs(n.created_at).fromNow()}
                                        </span>
                                    </div>
                                    <p
                                        className={classNames(
                                            'text-sm truncate',
                                            !n.read
                                                ? 'font-semibold text-gray-900 dark:text-gray-100'
                                                : 'text-gray-700 dark:text-gray-300',
                                        )}
                                    >
                                        {n.title}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                        {n.body}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </Loading>
            </ScrollBar>
        </div>
    )
}

export default MailList
