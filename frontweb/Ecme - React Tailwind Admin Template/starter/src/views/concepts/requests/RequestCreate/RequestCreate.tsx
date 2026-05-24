import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { apiCreateRequest } from '@/services/RequestsService'
import { apiGetAssetsList } from '@/services/AssetsService'
import { useNavigate } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import useSWR from 'swr'
import { TbArrowNarrowLeft, TbSend, TbEngine, TbMapPin, TbFlag, TbFileDescription } from 'react-icons/tb'
import type { AssetsListResponse } from '@/services/AssetsService'

const PRIORITIES = [
    { value: 'low',      label: 'Low — not urgent' },
    { value: 'medium',   label: 'Medium — needs attention' },
    { value: 'high',     label: 'High — fix soon' },
    { value: 'critical', label: 'Critical — stop everything' },
]

const RequestCreate = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [submitting, setSubmitting] = useState(false)

    const [title, setTitle]       = useState('')
    const [description, setDesc]  = useState('')
    const [priority, setPriority] = useState<{ value: string; label: string } | null>(PRIORITIES[1])
    const [assetId, setAssetId]   = useState<number | null>(null)
    const [location, setLocation] = useState('')

    const { data: assetsData } = useSWR(
        '/assets-for-request',
        () => apiGetAssetsList<AssetsListResponse>({ per_page: 200 }),
        { revalidateOnFocus: false },
    )

    const assetOptions = (assetsData?.data?.assets ?? []).map((a) => ({
        value: a.id,
        label: `${a.code} — ${a.name}`,
    }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            toast.push(<Notification type="warning">{t('requests.create.titleRequired')}</Notification>, { placement: 'top-center' })
            return
        }
        try {
            setSubmitting(true)
            await apiCreateRequest({
                title: title.trim(),
                description: description.trim() || null,
                priority: priority?.value ?? 'medium',
                asset_id: assetId,
                location: !assetId ? location.trim() || null : null,
            })
            await globalMutate((key) => Array.isArray(key) && key[0] === '/requests')
            toast.push(
                <Notification type="success">{t('requests.create.submitted')}</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/requests/request-list')
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit request.'
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Page header */}
            <div className="flex items-center gap-3">
                <Button
                    variant="plain"
                    size="sm"
                    icon={<TbArrowNarrowLeft />}
                    onClick={() => navigate('/concepts/requests/request-list')}
                >
                    Back to Requests
                </Button>
            </div>

            <div className="flex flex-col gap-1">
                <h3>Submit a Maintenance Request</h3>
                <p className="text-gray-500 text-sm">
                    Describe the issue and a manager will review it and assign a work order.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* ── Section 1: Basics ── */}
                <Card>
                    <div className="flex items-center gap-2 mb-5">
                        <TbFileDescription className="text-xl text-primary" />
                        <h5 className="font-semibold">Request Details</h5>
                    </div>

                    <div className="flex flex-col gap-5">
                        {/* Title — full row */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Issue Title <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g. Machine A is making a strange noise"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Priority + Asset — two columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                    <span className="flex items-center gap-1.5">
                                        <TbFlag className="text-sm" /> Priority
                                    </span>
                                </label>
                                <Select
                                    options={PRIORITIES}
                                    value={priority}
                                    onChange={(opt) => setPriority(opt as { value: string; label: string })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                    <span className="flex items-center gap-1.5">
                                        <TbEngine className="text-sm" /> Asset (optional)
                                    </span>
                                </label>
                                <Select
                                    placeholder="Select the asset that needs attention…"
                                    options={assetOptions}
                                    value={assetOptions.find((o) => o.value === assetId) ?? null}
                                    onChange={(opt) => setAssetId((opt as { value: number } | null)?.value ?? null)}
                                    isClearable
                                />
                            </div>
                        </div>

                        {/* Location — only if no asset */}
                        {!assetId && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                    <span className="flex items-center gap-1.5">
                                        <TbMapPin className="text-sm" /> Location
                                        <span className="text-gray-400 font-normal normal-case tracking-normal ml-1">
                                            (if no asset selected)
                                        </span>
                                    </span>
                                </label>
                                <Input
                                    placeholder="e.g. Building B, Floor 2, Room 12"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </Card>

                {/* ── Section 2: Description ── */}
                <Card>
                    <div className="flex items-center gap-2 mb-5">
                        <TbFileDescription className="text-xl text-primary" />
                        <h5 className="font-semibold">Description</h5>
                    </div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Problem Description
                        <span className="text-gray-400 font-normal normal-case tracking-normal ml-2">(optional)</span>
                    </label>
                    <textarea
                        className="w-full min-h-[180px] p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        placeholder="Describe the problem in detail — when did it start, what symptoms are visible, any safety concerns…"
                        value={description}
                        onChange={(e) => setDesc(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-2">
                        The more detail you provide, the faster a technician can diagnose and fix the issue.
                    </p>
                </Card>

                {/* ── Actions ── */}
                <div className="flex justify-end gap-3 pb-4">
                    <Button
                        type="button"
                        onClick={() => navigate('/concepts/requests/request-list')}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="solid"
                        icon={<TbSend />}
                        loading={submitting}
                    >
                        Submit Request
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default RequestCreate
