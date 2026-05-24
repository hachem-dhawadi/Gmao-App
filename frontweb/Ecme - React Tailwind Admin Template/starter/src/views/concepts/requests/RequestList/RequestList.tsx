import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import { apiGetRequestsList } from '@/services/RequestsService'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import {
    TbPlus,
    TbSearch,
    TbClipboardText,
    TbChevronRight,
    TbClock,
    TbCircleCheck,
    TbCircleX,
} from 'react-icons/tb'
import type { MaintenanceRequest } from '@/services/RequestsService'
import type { RequestsListResponse } from '@/services/RequestsService'

const statusColor = {
    pending:   { bg: 'bg-amber-100 dark:bg-amber-500/20',     text: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500' },
    converted: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    rejected:  { bg: 'bg-red-100 dark:bg-red-500/20',         text: 'text-red-600 dark:text-red-400',         dot: 'bg-red-400' },
}

const priorityColor = {
    low:      'text-gray-400',
    medium:   'text-blue-500',
    high:     'text-amber-500',
    critical: 'text-red-500 font-bold',
}

const RequestList = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const isManager = useAuthority(userAuthority, ['admin', 'manager'])

    const [activeTab, setActiveTab] = useState('all')
    const [search, setSearch]       = useState('')

    const tabs = [
        { key: 'all',       label: t('requests.tabs.all'),       icon: TbClipboardText },
        { key: 'pending',   label: t('requests.tabs.pending'),   icon: TbClock },
        { key: 'converted', label: t('requests.tabs.converted'), icon: TbCircleCheck },
        { key: 'rejected',  label: t('requests.tabs.rejected'),  icon: TbCircleX },
    ]

    const { data, isLoading } = useSWR<MaintenanceRequest[]>(
        ['/requests', activeTab, search],
        async () => {
            const params: Record<string, unknown> = { per_page: 100 }
            if (activeTab !== 'all') params.status = activeTab
            if (search) params.search = search
            const resp = await apiGetRequestsList<RequestsListResponse>(params)
            return resp.data.requests
        },
        { revalidateOnFocus: false },
    )

    const counts = {
        pending:   data?.filter((r) => r.status === 'pending').length   ?? 0,
        converted: data?.filter((r) => r.status === 'converted').length ?? 0,
        rejected:  data?.filter((r) => r.status === 'rejected').length  ?? 0,
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="mb-1">{t('requests.pageTitle')}</h3>
                    <p className="text-sm text-gray-500">
                        {isManager
                            ? t('requests.managerSubtitle')
                            : t('requests.userSubtitle')}
                    </p>
                </div>
                <Button
                    variant="solid"
                    icon={<TbPlus />}
                    onClick={() => navigate('/concepts/requests/request-create')}
                >
                    {t('requests.new')}
                </Button>
            </div>

            {/* KPI strip — manager only */}
            {isManager && (
                <div className="grid grid-cols-3 gap-4">
                    <Card className="!p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                            <TbClock className="text-amber-500 text-xl" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold leading-none">{counts.pending}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{t('requests.pendingReview')}</p>
                        </div>
                    </Card>
                    <Card className="!p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <TbCircleCheck className="text-emerald-500 text-xl" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold leading-none">{counts.converted}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{t('requests.convertedToWO')}</p>
                        </div>
                    </Card>
                    <Card className="!p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                            <TbCircleX className="text-red-400 text-xl" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold leading-none">{counts.rejected}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{t('requests.status.rejected')}</p>
                        </div>
                    </Card>
                </div>
            )}

            <Card>
                {/* Tabs + Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div className="flex gap-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const count = tab.key !== 'all' ? counts[tab.key as keyof typeof counts] : null
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors relative ${
                                        activeTab === tab.key
                                            ? 'bg-primary text-white'
                                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <Icon className="text-base" />
                                    {tab.label}
                                    {tab.key === 'pending' && count !== null && count > 0 && activeTab !== 'pending' && (
                                        <Badge
                                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[10px]"
                                            content={count}
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    <div className="relative w-full sm:w-64">
                        <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            size="sm"
                            className="pl-9"
                            placeholder={t('requests.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400 gap-2 text-sm">
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        {t('common.loading')}
                    </div>
                ) : !data || data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                        <TbClipboardText className="text-5xl" />
                        <p className="text-sm font-medium">{t('requests.noRequests')}</p>
                        <p className="text-xs text-gray-400">{t('requests.noRequestsHint')}</p>
                        <Button
                            size="sm"
                            variant="solid"
                            icon={<TbPlus />}
                            onClick={() => navigate('/concepts/requests/request-create')}
                        >
                            {t('requests.submit')}
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                    <th className="pb-3 pr-4">{t('requests.columns.code')}</th>
                                    <th className="pb-3 pr-4">{t('requests.columns.title')}</th>
                                    <th className="pb-3 pr-4">{t('requests.columns.assetLocation')}</th>
                                    <th className="pb-3 pr-4">{t('requests.columns.priority')}</th>
                                    <th className="pb-3 pr-4">{t('requests.columns.status')}</th>
                                    {isManager && <th className="pb-3 pr-4">{t('requests.columns.requestedBy')}</th>}
                                    <th className="pb-3">{t('requests.columns.date')}</th>
                                    <th className="pb-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {data.map((req) => {
                                    const sc = statusColor[req.status]
                                    const priorityCls = priorityColor[req.priority]
                                    return (
                                        <tr
                                            key={req.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors"
                                            onClick={() => navigate(`/concepts/requests/request-details/${req.id}`)}
                                        >
                                            <td className="py-3.5 pr-4">
                                                <span className="font-mono text-xs text-gray-400">{req.code}</span>
                                            </td>
                                            <td className="py-3.5 pr-4 font-medium max-w-[220px] truncate">
                                                {req.title}
                                            </td>
                                            <td className="py-3.5 pr-4 text-gray-500 text-xs">
                                                {req.asset?.name ?? req.location ?? '—'}
                                            </td>
                                            <td className="py-3.5 pr-4">
                                                <span className={`text-xs font-semibold ${priorityCls}`}>
                                                    {t(`requests.priority.${req.priority}`)}
                                                </span>
                                            </td>
                                            <td className="py-3.5 pr-4">
                                                <Tag className={`border-0 text-xs ${sc.bg}`}>
                                                    <span className="flex items-center gap-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                        <span className={`font-semibold ${sc.text}`}>
                                                            {t(`requests.status.${req.status}`)}
                                                        </span>
                                                    </span>
                                                </Tag>
                                            </td>
                                            {isManager && (
                                                <td className="py-3.5 pr-4 text-gray-500 text-xs">
                                                    {req.requested_by?.name ?? '—'}
                                                </td>
                                            )}
                                            <td className="py-3.5 text-gray-400 text-xs whitespace-nowrap">
                                                {req.created_at ? dayjs(req.created_at).format('DD MMM YYYY') : '—'}
                                            </td>
                                            <td className="py-3.5">
                                                <TbChevronRight className="text-gray-300" />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}

export default RequestList
