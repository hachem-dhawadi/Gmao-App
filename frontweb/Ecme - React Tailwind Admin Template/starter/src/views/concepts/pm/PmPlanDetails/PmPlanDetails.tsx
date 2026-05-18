import type { ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import Loading from '@/components/shared/Loading'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Timeline from '@/components/ui/Timeline'
import Badge from '@/components/ui/Badge'
import { TbEdit, TbCalendarEvent, TbUser, TbTool, TbClock, TbRepeat, TbCalendarCheck, TbChartBar, TbArrowLeft } from 'react-icons/tb'
import { apiGetPmPlanById } from '@/services/PmService'
import type { PmPlan, PmPlanResponse } from '@/services/PmService'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import dayjs from 'dayjs'

// ── Configs ───────────────────────────────────────────────────────────────────

const statusConfig: Record<PmPlan['status'], { label: string; bgClass: string; textClass: string }> = {
    active:   { label: 'Active',   bgClass: 'bg-emerald-100 dark:bg-emerald-500/20', textClass: 'text-emerald-600 dark:text-emerald-400' },
    inactive: { label: 'Inactive', bgClass: 'bg-gray-100 dark:bg-gray-700',          textClass: 'text-gray-500'                          },
    draft:    { label: 'Draft',    bgClass: 'bg-amber-100 dark:bg-amber-500/20',      textClass: 'text-amber-600 dark:text-amber-400'     },
}

const priorityConfig: Record<PmPlan['priority'], { label: string; bgClass: string; textClass: string; dot: string }> = {
    low:      { label: 'Low',      bgClass: 'bg-gray-100 dark:bg-gray-700',          textClass: 'text-gray-500',                          dot: 'bg-gray-400'    },
    medium:   { label: 'Medium',   bgClass: 'bg-blue-100 dark:bg-blue-500/20',       textClass: 'text-blue-600 dark:text-blue-400',       dot: 'bg-blue-500'    },
    high:     { label: 'High',     bgClass: 'bg-amber-100 dark:bg-amber-500/20',     textClass: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500'   },
    critical: { label: 'Critical', bgClass: 'bg-red-100 dark:bg-red-500/20',         textClass: 'text-red-500',                           dot: 'bg-red-500'     },
}

// ── Helper ────────────────────────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="flex items-center justify-between py-1">
        <span className="text-sm text-gray-500 font-semibold">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
    </div>
)

const formatFrequency = (plan: PmPlan) => {
    if (!plan.trigger) return '—'
    return `Every ${plan.trigger.interval_value} ${plan.trigger.interval_unit}`
}

// ── Main ──────────────────────────────────────────────────────────────────────

const PmPlanDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const userAuthority = useSessionUser((s) => s.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER])

    const { data, isLoading } = useSWR<PmPlan>(
        id ? ['/pm/plans', id] : null,
        async () => {
            const res = await apiGetPmPlanById(id!) as PmPlanResponse
            return res.data.pm_plan
        },
        { revalidateOnFocus: false },
    )

    const statusCfg  = data ? statusConfig[data.status]   : null
    const priorityCfg = data ? priorityConfig[data.priority] : null

    return (
        <Loading loading={isLoading}>
            {data && statusCfg && priorityCfg && (
                <div className="flex flex-col gap-4">

                    {/* Header row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button
                                size="sm"
                                variant="plain"
                                icon={<TbArrowLeft />}
                                onClick={() => navigate('/concepts/pm/pm-list')}
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="heading-text">{data.name}</h4>
                                    <Tag className={`border-0 ${statusCfg.bgClass}`}>
                                        <span className={`font-semibold text-xs ${statusCfg.textClass}`}>{statusCfg.label}</span>
                                    </Tag>
                                    <Tag className={`border-0 ${priorityCfg.bgClass}`}>
                                        <span className={`font-semibold text-xs ${priorityCfg.textClass}`}>{priorityCfg.label}</span>
                                    </Tag>
                                </div>
                                <span className="text-sm font-mono text-purple-500">{data.code}</span>
                            </div>
                        </div>
                        {canEdit && (
                            <Button
                                variant="solid"
                                icon={<TbEdit />}
                                onClick={() => navigate(`/concepts/pm/pm-edit/${id}`)}
                            >
                                Edit
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4">

                        {/* ── Left column ── */}
                        <div className="flex flex-col gap-4 flex-auto">

                            {/* Description */}
                            {data.description && (
                                <Card>
                                    <h5 className="mb-3 font-semibold">Description</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                        {data.description}
                                    </p>
                                </Card>
                            )}

                            {/* Schedule */}
                            <Card>
                                <h5 className="mb-4 font-semibold flex items-center gap-2">
                                    <TbRepeat className="text-xl text-primary" />
                                    Schedule
                                </h5>
                                <div className="flex flex-col gap-3">
                                    <InfoRow label="Frequency" value={formatFrequency(data)} />
                                    <InfoRow
                                        label="Next run"
                                        value={
                                            data.trigger?.next_run_at
                                                ? <span className={`font-semibold ${dayjs(data.trigger.next_run_at).isBefore(dayjs()) ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {dayjs(data.trigger.next_run_at).format('DD MMM YYYY')}
                                                  </span>
                                                : <span className="text-gray-400">Not scheduled</span>
                                        }
                                    />
                                    <InfoRow
                                        label="Last run"
                                        value={
                                            data.trigger?.last_run_at
                                                ? dayjs(data.trigger.last_run_at).format('DD MMM YYYY HH:mm')
                                                : <span className="text-gray-400">Never run</span>
                                        }
                                    />
                                    {data.estimated_minutes && (
                                        <InfoRow
                                            label="Estimated duration"
                                            value={
                                                <span className="flex items-center gap-1">
                                                    <TbClock className="text-base" />
                                                    {data.estimated_minutes >= 60
                                                        ? `${Math.floor(data.estimated_minutes / 60)}h ${data.estimated_minutes % 60 > 0 ? `${data.estimated_minutes % 60}m` : ''}`
                                                        : `${data.estimated_minutes}m`}
                                                </span>
                                            }
                                        />
                                    )}
                                </div>
                            </Card>

                            {/* Work order history */}
                            <Card>
                                <h5 className="mb-4 font-semibold flex items-center gap-2">
                                    <TbChartBar className="text-xl text-primary" />
                                    Generated Work Orders
                                    <Badge content={(data as PmPlan & { pm_work_orders?: unknown[] }).pm_work_orders?.length ?? 0} />
                                </h5>
                                {!(data as PmPlan & { pm_work_orders?: unknown[] }).pm_work_orders?.length ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                                        <TbCalendarCheck className="text-4xl opacity-40" />
                                        <p className="text-sm font-semibold">No work orders generated yet</p>
                                        <p className="text-xs text-center max-w-xs">
                                            Work orders will appear here automatically when the schedule triggers.
                                        </p>
                                    </div>
                                ) : (
                                    <Timeline>
                                        {((data as PmPlan & { pm_work_orders?: { id: number; work_order?: { id: number; code: string; title: string; status: string; created_at: string | null } }[] }).pm_work_orders ?? []).map((pwo) => (
                                            <Timeline.Item
                                                key={pwo.id}
                                                media={<div className="flex mt-1"><Badge innerClass="bg-primary" /></div>}
                                            >
                                                <div
                                                    className="font-semibold cursor-pointer hover:text-primary"
                                                    onClick={() => pwo.work_order && navigate(`/concepts/work-orders/work-order-details/${pwo.work_order.id}`)}
                                                >
                                                    {pwo.work_order?.title ?? '—'}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {pwo.work_order?.code} &middot;{' '}
                                                    {pwo.work_order?.created_at
                                                        ? dayjs(pwo.work_order.created_at).format('DD MMM YYYY')
                                                        : '—'}
                                                </div>
                                            </Timeline.Item>
                                        ))}
                                    </Timeline>
                                )}
                            </Card>
                        </div>

                        {/* ── Right column ── */}
                        <div className="lg:w-[300px] xl:w-[360px] flex flex-col gap-4">

                            {/* Asset */}
                            <Card>
                                <h5 className="mb-4 font-semibold flex items-center gap-2">
                                    <TbTool className="text-xl text-primary" />
                                    Asset
                                </h5>
                                {data.asset ? (
                                    <div
                                        className="flex items-center gap-3 cursor-pointer hover:text-primary"
                                        onClick={() => navigate(`/concepts/assets/asset-details/${data.asset!.id}`)}
                                    >
                                        <Avatar shape="round" size={44} className="bg-primary/10 text-primary font-bold text-sm">
                                            {data.asset.code.slice(0, 3).toUpperCase()}
                                        </Avatar>
                                        <div>
                                            <div className="font-semibold heading-text">{data.asset.name}</div>
                                            <div className="text-xs font-mono text-gray-500">{data.asset.code}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">No asset linked</p>
                                )}
                            </Card>

                            {/* People */}
                            <Card>
                                <h5 className="mb-4 font-semibold flex items-center gap-2">
                                    <TbUser className="text-xl text-primary" />
                                    People
                                </h5>
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Assigned to</p>
                                        {data.assigned_to?.name ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar size={32} shape="circle" className="bg-primary text-white font-bold text-xs">
                                                    {data.assigned_to.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                                                </Avatar>
                                                <span className="font-semibold text-sm">{data.assigned_to.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">Unassigned</span>
                                        )}
                                    </div>
                                    <hr />
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Created by</p>
                                        <span className="font-semibold text-sm">{data.created_by?.name ?? '—'}</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Plan info */}
                            <Card>
                                <h5 className="mb-4 font-semibold flex items-center gap-2">
                                    <TbCalendarEvent className="text-xl text-primary" />
                                    Plan Info
                                </h5>
                                <div className="flex flex-col gap-3">
                                    <InfoRow label="Created" value={data.created_at ? dayjs(data.created_at).format('DD/MM/YYYY') : '—'} />
                                    <InfoRow label="Status" value={
                                        <Tag className={`border-0 ${statusCfg.bgClass}`}>
                                            <span className={`font-semibold text-xs ${statusCfg.textClass}`}>{statusCfg.label}</span>
                                        </Tag>
                                    } />
                                    <InfoRow label="Priority" value={
                                        <Tag className={`border-0 ${priorityCfg.bgClass}`}>
                                            <span className={`font-semibold text-xs ${priorityCfg.textClass}`}>{priorityCfg.label}</span>
                                        </Tag>
                                    } />
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </Loading>
    )
}

export default PmPlanDetails
