import { useTranslation } from 'react-i18next'
import Checkbox from '@/components/ui/Checkbox'
import Radio from '@/components/ui/Radio'
import Switcher from '@/components/ui/Switcher'
import { apiGetSettingsNotification } from '@/services/AccontsService'
import useSWR from 'swr'
import cloneDeep from 'lodash/cloneDeep'
import { TbMessageCircleCheck } from 'react-icons/tb'
import type { GetSettingsNotificationResponse } from '../types'

type EmailNotificationFields =
    | 'newsAndUpdate'
    | 'tipsAndTutorial'
    | 'offerAndPromotion'
    | 'followUpReminder'

const SettingsNotification = () => {
    const { t } = useTranslation()

    const emailNotificationOption: {
        label: string
        value: EmailNotificationFields
        desc: string
    }[] = [
        {
            label: t('notificationSettings.options.newsAndUpdate.label'),
            value: 'newsAndUpdate',
            desc: t('notificationSettings.options.newsAndUpdate.desc'),
        },
        {
            label: t('notificationSettings.options.tipsAndTutorial.label'),
            value: 'tipsAndTutorial',
            desc: t('notificationSettings.options.tipsAndTutorial.desc'),
        },
        {
            label: t('notificationSettings.options.offerAndPromotion.label'),
            value: 'offerAndPromotion',
            desc: t('notificationSettings.options.offerAndPromotion.desc'),
        },
        {
            label: t('notificationSettings.options.followUpReminder.label'),
            value: 'followUpReminder',
            desc: t('notificationSettings.options.followUpReminder.desc'),
        },
    ]

    const notifyMeOption: {
        label: string
        value: string
        desc: string
    }[] = [
        {
            label: t('notificationSettings.notifyMe.allNewMessage.label'),
            value: 'allNewMessage',
            desc: t('notificationSettings.notifyMe.allNewMessage.desc'),
        },
        {
            label: t('notificationSettings.notifyMe.mentionsOnly.label'),
            value: 'mentionsOnly',
            desc: t('notificationSettings.notifyMe.mentionsOnly.desc'),
        },
        {
            label: t('notificationSettings.notifyMe.nothing.label'),
            value: 'nothing',
            desc: t('notificationSettings.notifyMe.nothing.desc'),
        },
    ]

    const {
        data = {
            email: [],
            desktop: false,
            unreadMessageBadge: false,
            notifymeAbout: '',
        },
        mutate,
    } = useSWR(
        '/api/settings/notification/',
        () => apiGetSettingsNotification<GetSettingsNotificationResponse>(),
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
        },
    )

    const handleEmailNotificationOptionChange = (values: string[]) => {
        const newData = cloneDeep(data)
        newData.email = values
        mutate(newData, false)
    }

    const handleEmailNotificationOptionCheckAll = (value: boolean) => {
        const newData = cloneDeep(data)
        if (value) {
            newData.email = [
                'newsAndUpdate',
                'tipsAndTutorial',
                'offerAndPromotion',
                'followUpReminder',
            ]
        } else {
            newData.email = []
        }

        mutate(newData, false)
    }

    const handleDesktopNotificationCheck = (value: boolean) => {
        const newData = cloneDeep(data)
        newData.desktop = value
        mutate(newData, false)
    }

    const handleUnreadMessagebadgeCheck = (value: boolean) => {
        const newData = cloneDeep(data)
        newData.unreadMessageBadge = value
        mutate(newData, false)
    }

    const handleNotifyMeChange = (value: string) => {
        const newData = cloneDeep(data)
        newData.notifymeAbout = value
        mutate(newData, false)
    }

    return (
        <div>
            <h4>{t('notificationSettings.title')}</h4>
            <div className="mt-2">
                <div className="flex items-center justify-between py-6 border-b border-gray-200 dark:border-gray-600">
                    <div>
                        <h5>{t('notificationSettings.desktop.title')}</h5>
                        <p>{t('notificationSettings.desktop.desc')}</p>
                    </div>
                    <div>
                        <Switcher
                            checked={data.desktop}
                            onChange={handleDesktopNotificationCheck}
                        />
                    </div>
                </div>
                <div className="flex items-center justify-between py-6 border-b border-gray-200 dark:border-gray-600">
                    <div>
                        <h5>{t('notificationSettings.badge.title')}</h5>
                        <p>{t('notificationSettings.badge.desc')}</p>
                    </div>
                    <div>
                        <Switcher
                            checked={data.unreadMessageBadge}
                            onChange={handleUnreadMessagebadgeCheck}
                        />
                    </div>
                </div>
                <div className="py-6 border-b border-gray-200 dark:border-gray-600">
                    <h5>{t('notificationSettings.badge.title')}</h5>
                    <div className="mt-4">
                        <Radio.Group
                            vertical
                            className="flex flex-col gap-6"
                            value={data.notifymeAbout}
                            onChange={handleNotifyMeChange}
                        >
                            {notifyMeOption.map((option) => (
                                <div key={option.value} className="flex gap-4">
                                    <div className="mt-1.5">
                                        <Radio value={option.value} />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="mt-1">
                                            <TbMessageCircleCheck className="text-lg" />
                                        </div>
                                        <div>
                                            <h6>{option.label}</h6>
                                            <p>{option.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </Radio.Group>
                    </div>
                </div>
                <div className="flex items-center justify-between py-6">
                    <div>
                        <h5>{t('notificationSettings.email.title')}</h5>
                        <p>{t('notificationSettings.email.desc')}</p>
                    </div>
                    <div>
                        <Switcher
                            checked={data.email.length > 0}
                            onChange={handleEmailNotificationOptionCheckAll}
                        />
                    </div>
                </div>
                <Checkbox.Group
                    vertical
                    className="flex flex-col gap-6"
                    value={data.email}
                    onChange={handleEmailNotificationOptionChange}
                >
                    {emailNotificationOption.map((option) => (
                        <div key={option.value} className="flex gap-4">
                            <div className="mt-1.5">
                                <Checkbox value={option.value} />
                            </div>
                            <div>
                                <h6>{option.label}</h6>
                                <p>{option.desc}</p>
                            </div>
                        </div>
                    ))}
                </Checkbox.Group>
            </div>
        </div>
    )
}

export default SettingsNotification
