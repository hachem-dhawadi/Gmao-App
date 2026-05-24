import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Dialog from '@/components/ui/Dialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import {
    apiGetRequestById,
    apiConvertRequest,
    apiRejectRequest,
} from '@/services/RequestsService'
import { useNavigate, useParams } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { mutate as globalMutate } from 'swr'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import {
    TbArrowNarrowLeft,
    TbArrowRight,
    TbCheck,
    TbX,
    TbMapPin,
    TbEngine,
    TbClipboardText,
} from 'react-icons/tb'
import type { MaintenanceRequest, RequestResponse } from '@/services/RequestsService'

const STATUS_CONFIG = {
    pending:   { bg: 'bg-amber-100 dark:bg-amber-500/20',    text: 'text-amber-600 dark:text-amber-400',    dot: 'bg-amber-500' },
    converted: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    rejected:  { bg: 'bg-red-100 dark:bg-red-500/20',        text: 'text-red-600 dark:text-red-400',        dot: 'bg-red-400' },
}

const PRIORITY_CONFIG = {
    low:      { text: 'text-gray-400' },
    medium:   { text: 'text-blue-500' },
    high:     { text: 'text-amber-500' },
    critical: { text: 'text-red-500 font-bold' },
}

const RequestDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const isManager = useAuthority(userAuthority, ['admin', 'manager'])

    const [converting, setConverting] = useState(false)
    const [rejecting, setRejecting]   = useState(false)
    const [rejectOpen, setRejectOpen] = useState(false)
    const [rejectNote, setRejectNote] = useState('')

    const { data: req, mutate } = useSWR<MaintenanceRequest>(
        id ? ['/requests/detail', id] : null,
        async () => {
            const resp = await apiGetRequestById<RequestResponse>(id!)
            return resp.data.request
        },
        { revalidateOnFocus: false },
    )

    const handleConvert = async () => {
        if (!id || !req) return
        try {
            setConverting(true)
            const resp = await apiConvertRequest(id)
            await mutate(resp.data.request, false)
            await globalMutate((key) => Array.isArray(key) && key[0] === '/requests')
            toast.push(
                <Notification type="success">
                    {t('requests.details.woCreated', { code: resp.data.work_order.code })}
                </Notification>,
                { placement: 'top-center' },
            )
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('requests.details.woCreated')
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setConverting(false)
        }
    }

    const handleReject = async () => {
        if (!id) return
        try {
            setRejecting(true)
            const resp = await apiRejectRequest(id, rejectNote || null)
            await mutate(resp.data.request, false)
            await globalMutate((key) => Array.isArray(key) && key[0] === '/requests')
            setRejectOpen(false)
            setRejectNote('')
            toast.push(<Notification type="success">{t('requests.details.rejected')}</Notification>, { placement: 'top-center' })
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reject.'
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setRejecting(false)
        }
    }

    if (!req) {
        return (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                {t('common.loading')}
            </div>
        )
    }

    const sc = STATUS_CONFIG[req.status]
    const pc = PRIORITY_CONFIG[req.priority]

    return (
        <>
            <div className="flex flex-col gap-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between">
                    <Button variant="plain" icon={<TbArrowNarrowLeft />} onClick={() => navigate('/concepts/requests/request-list')}>
                        {t('requests.details.back')}
                    </Button>

                    {isManager && req.status === 'pending' && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="default"
                                icon={<TbX />}
                                customColorClass={() => 'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error bg-transparent'}
                                onClick={() => setRejectOpen(true)}
                            >
                                {t('requests.details.reject')}
                            </Button>
                            <Button
                                variant="solid"
                                icon={<TbCheck />}
                                loading={converting}
                                onClick={handleConvert}
                            >
                                {t('requests.details.convertToWO')}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Main card */}
                <Card>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                <span className="font-mono text-xs text-gray-400">{req.code}</span>
                                <Tag className={`border-0 text-xs ${sc.bg}`}>
                                    <span className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                        <span className={`font-semibold ${sc.text}`}>{t(`requests.status.${req.status}`)}</span>
                                    </span>
                                </Tag>
                                <span className={`text-xs font-semibold ${pc.text}`}>{t(`requests.priority.${req.priority}`)} {t('requests.details.prioritySuffix')}</span>
                            </div>
                            <h4 className="leading-snug">{req.title}</h4>
                        </div>
                        <TbClipboardText className="text-3xl text-gray-200 dark:text-gray-700 shrink-0" />
                    </div>

                    {/* Info rows */}
                    <div className="flex flex-col gap-3 text-sm mb-6">
                        {req.asset && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                <TbEngine className="text-base text-gray-400 shrink-0" />
                                <span className="font-semibold text-gray-400 w-24 shrink-0">{t('requests.details.asset')}</span>
                                <span>{req.asset.name} <span className="font-mono text-xs text-gray-400">({req.asset.code})</span></span>
                            </div>
                        )}
                        {!req.asset && req.location && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                <TbMapPin className="text-base text-gray-400 shrink-0" />
                                <span className="font-semibold text-gray-400 w-24 shrink-0">{t('requests.details.location')}</span>
                                <span>{req.location}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <span className="font-semibold text-gray-400 w-24 shrink-0 ml-5">{t('requests.details.submittedBy')}</span>
                            <span>{req.requested_by?.name ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <span className="font-semibold text-gray-400 w-24 shrink-0 ml-5">{t('requests.details.date')}</span>
                            <span>{req.created_at ? dayjs(req.created_at).format('DD MMM YYYY, HH:mm') : '—'}</span>
                        </div>
                    </div>

                    {/* Description */}
                    {req.description && (
                        <div className="rounded-xl p-4 bg-gray-50 dark:bg-gray-700 text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-4">
                            {req.description}
                        </div>
                    )}

                    {/* Converted → show WO link */}
                    {req.status === 'converted' && req.work_order && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                            <div>
                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{t('requests.details.workOrderCreated')}</p>
                                <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-300">{req.work_order.code}</p>
                            </div>
                            <Button
                                size="sm"
                                variant="solid"
                                icon={<TbArrowRight />}
                                onClick={() => navigate(`/concepts/work-orders/work-order-details/${req.work_order!.id}`)}
                            >
                                {t('requests.details.viewWorkOrder')}
                            </Button>
                        </div>
                    )}

                    {/* Rejected → show review note */}
                    {req.status === 'rejected' && (
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                            <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                                {t('requests.details.rejectedBy')} {req.reviewed_by?.name ?? 'Manager'}
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-300">
                                {req.review_note ?? t('requests.details.noReason')}
                            </p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Reject dialog */}
            <Dialog
                isOpen={rejectOpen}
                onClose={() => setRejectOpen(false)}
                onRequestClose={() => setRejectOpen(false)}
                width={480}
            >
                <h5 className="mb-4">{t('requests.details.rejectTitle')}</h5>
                <p className="text-sm text-gray-500 mb-4">
                    {t('requests.details.rejectDescription')}
                </p>
                <textarea
                    className="w-full min-h-[100px] p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-4"
                    placeholder={t('requests.details.rejectPlaceholder')}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                    <Button onClick={() => setRejectOpen(false)}>{t('common.cancel')}</Button>
                    <Button
                        variant="solid"
                        customColorClass={() => 'bg-red-500 hover:bg-red-600 text-white border-red-500'}
                        loading={rejecting}
                        onClick={handleReject}
                    >
                        {t('requests.details.confirmReject')}
                    </Button>
                </div>
            </Dialog>
        </>
    )
}

export default RequestDetails
