import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import { Controller, useWatch } from 'react-hook-form'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { TbClock, TbSparkles } from 'react-icons/tb'
import { apiGetAssetsList } from '@/services/AssetsService'
import { apiGetMembersList } from '@/services/MembersService'
import { apiGetAllSites } from '@/services/SiteService'
import { apiGetAllTeams } from '@/services/TeamsService'
import { apiSuggestTechnician } from '@/services/AiService'
import type { AssetsListResponse } from '@/services/AssetsService'
import type { MembersListResponse } from '@/services/MembersService'
import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form'
import type { WorkOrderFormSchema } from './types'

type Props = {
    control: Control<WorkOrderFormSchema>
    errors: FieldErrors<WorkOrderFormSchema>
    setValue: UseFormSetValue<WorkOrderFormSchema>
    canAssign?: boolean
}

type AssetOption   = { value: number; label: string; code: string; site_id: number | null }
type MemberOption  = { value: number; label: string; sites: { id: number; name: string }[] }
type SiteOption    = { value: number; label: string }
type TeamOption    = { value: number; label: string; color: string; member_ids: number[] }
type GroupedMember = { label: string; options: MemberOption[] }

// ── Time Picker ───────────────────────────────────────────────────────────────

type TimePickerProps = { value: string; onChange: (minutes: string) => void }

const EstimatedTimePicker = ({ value, onChange }: TimePickerProps) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const totalMinutes = parseInt(value || '0') || 0
    const hours   = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    const display = value && totalMinutes > 0
        ? `${hours}h ${minutes.toString().padStart(2, '0')}m`
        : ''

    const update = (h: number, m: number) => {
        const total = Math.max(0, h) * 60 + Math.min(59, Math.max(0, m))
        onChange(total > 0 ? String(total) : '')
    }

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div className="relative" ref={ref}>
            <div
                className="input input-md flex items-center justify-between cursor-pointer select-none"
                onClick={() => setOpen((o) => !o)}
            >
                <span className={display ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                    {display || 'e.g. 2h 30m'}
                </span>
                <TbClock className="text-gray-400 text-lg flex-shrink-0" />
            </div>

            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4">
                    <p className="text-xs text-gray-500 mb-3 font-medium">{t('woForm.timePicker.label')}</p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">{t('woForm.timePicker.hours')}</label>
                            <Input type="number" min={0} max={999} value={hours || ''} placeholder="0"
                                onChange={(e) => update(parseInt(e.target.value) || 0, minutes)} />
                        </div>
                        <span className="text-gray-400 text-lg mt-4">:</span>
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">{t('woForm.timePicker.minutes')}</label>
                            <Input type="number" min={0} max={59} value={minutes || ''} placeholder="00"
                                onChange={(e) => {
                                    const m = Math.min(59, Math.max(0, parseInt(e.target.value) || 0))
                                    update(hours, m)
                                }} />
                        </div>
                    </div>
                    <Button type="button" variant="solid" size="sm" className="mt-3 w-full"
                        onClick={() => setOpen(false)}>
                        {t('woForm.timePicker.done')}
                    </Button>
                </div>
            )}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

const WorkOrderSideSection = ({ control, errors, setValue, canAssign = false }: Props) => {
    const { t } = useTranslation()
    const [isSuggesting, setIsSuggesting] = useState(false)
    const [suggestion, setSuggestion] = useState<{ name: string; reason: string } | null>(null)

    const { data: sitesData }   = useSWR('/sites-all-wo-form', () => apiGetAllSites(), { revalidateOnFocus: false })
    const { data: assetsData }  = useSWR('/assets-all', () => apiGetAssetsList<AssetsListResponse>({ per_page: 100 }), { revalidateOnFocus: false })
    const { data: membersData } = useSWR('/members-all', () => apiGetMembersList<MembersListResponse>({ per_page: 200 }), { revalidateOnFocus: false })
    const { data: teamsData }   = useSWR(canAssign ? '/teams-all-wo-form' : null, () => apiGetAllTeams(), { revalidateOnFocus: false })

    const siteOptions: SiteOption[] =
        sitesData?.data?.sites?.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })) ?? []

    const allAssetOptions: AssetOption[] =
        assetsData?.data?.assets?.map((a) => ({
            value: a.id, label: a.name, code: a.code, site_id: a.site_id ?? null,
        })) ?? []

    const allMemberOptions: MemberOption[] =
        membersData?.data?.members
            ?.filter((m) => m.roles.some((r) => r.code === 'technician'))
            .map((m) => ({
                value: m.id,
                label: m.user?.name ?? m.employee_code,
                sites: m.sites ?? [],
            })) ?? []

    const teamOptions: TeamOption[] =
        teamsData?.data?.teams?.map((t) => ({
            value: t.id, label: t.name, color: t.color, member_ids: t.member_ids,
        })) ?? []

    const watchedSiteId      = useWatch({ control, name: 'site_id' })
    const watchedAssetId     = useWatch({ control, name: 'asset_id' })
    const watchedTeamId      = useWatch({ control, name: 'team_id' })
    const watchedDueAt       = useWatch({ control, name: 'due_at' })
    const watchedEstimated   = useWatch({ control, name: 'estimated_minutes' })
    const watchedPriority    = useWatch({ control, name: 'priority' })
    const watchedDescription = useWatch({ control, name: 'description' })

    const handleSuggestTechnician = async () => {
        setIsSuggesting(true)
        setSuggestion(null)
        try {
            const result = await apiSuggestTechnician({
                due_at: watchedDueAt || undefined,
                estimated_minutes: watchedEstimated ? parseInt(watchedEstimated) : undefined,
                priority: watchedPriority || undefined,
                description: watchedDescription || undefined,
                asset_id: watchedAssetId ?? undefined,
            })
            setValue('assigned_member_id', result.member_id)
            setSuggestion({ name: result.name, reason: result.reason })
        } catch {
            setSuggestion(null)
        } finally {
            setIsSuggesting(false)
        }
    }

    // Asset options filtered by site selection
    const assetOptions = watchedSiteId != null
        ? allAssetOptions.filter((a) => a.site_id === watchedSiteId)
        : allAssetOptions

    // Derive asset's site_id from the selected asset
    const selectedAsset     = allAssetOptions.find((a) => a.value === watchedAssetId)
    const assetSiteId       = selectedAsset?.site_id ?? watchedSiteId ?? null
    const assetSiteName     = siteOptions.find((s) => s.value === assetSiteId)?.label ?? null

    // Build grouped member options: local (works at asset's site) vs other sites
    const buildGroupedMembers = (members: MemberOption[]): GroupedMember[] | MemberOption[] => {
        if (assetSiteId == null) return members

        const local = members.filter((m) => m.sites.some((s) => s.id === assetSiteId))
        const other = members.filter((m) => !m.sites.some((s) => s.id === assetSiteId))

        const groups: GroupedMember[] = []
        if (local.length > 0) {
            groups.push({ label: `Local · ${assetSiteName ?? 'This Site'}`, options: local })
        }
        if (other.length > 0) {
            groups.push({ label: 'Other Sites', options: other })
        }
        return groups.length > 0 ? groups : members
    }

    const groupedMembers = buildGroupedMembers(allMemberOptions)

    return (
        <Card>
            <h4 className="mb-6">{t('woForm.detailsTitle')}</h4>

            {/* Site */}
            <FormItem label="Site">
                <Controller
                    name="site_id"
                    control={control}
                    render={({ field }) => (
                        <Select<SiteOption>
                            isClearable
                            placeholder="Select site (optional)"
                            options={siteOptions}
                            value={siteOptions.find((o) => o.value === field.value) || null}
                            onChange={(opt) => {
                                const newSiteId = opt?.value ?? null
                                field.onChange(newSiteId)
                                if (newSiteId != null) {
                                    const current = allAssetOptions.find((a) => a.value === watchedAssetId)
                                    if (current && current.site_id !== newSiteId) setValue('asset_id', null)
                                }
                            }}
                        />
                    )}
                />
            </FormItem>

            {/* Asset */}
            <FormItem
                label={t('woForm.field.asset')}
                asterisk
                invalid={Boolean(errors.asset_id)}
                errorMessage={errors.asset_id?.message}
            >
                <Controller
                    name="asset_id"
                    control={control}
                    render={({ field }) => (
                        <Select<AssetOption>
                            placeholder={t('woForm.placeholder.selectAsset')}
                            options={assetOptions}
                            value={assetOptions.find((o) => o.value === field.value) || null}
                            onChange={(option) => {
                                field.onChange(option?.value ?? null)
                                if (option) setValue('site_id', option.site_id ?? null)
                            }}
                            formatOptionLabel={(opt) => (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{opt.label}</span>
                                    <span className="text-xs text-gray-400 font-mono">{opt.code}</span>
                                </div>
                            )}
                        />
                    )}
                />
            </FormItem>

            {/* Due date */}
            <FormItem label={t('woForm.field.dueDate')}>
                <Controller
                    name="due_at"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            placeholder={t('woForm.placeholder.dueDate')}
                            value={field.value ? dayjs(field.value).toDate() : null}
                            minDate={new Date()}
                            onChange={(date) => field.onChange(date ? dayjs(date).format('YYYY-MM-DD') : '')}
                        />
                    )}
                />
            </FormItem>

            {/* Estimated time */}
            <FormItem label={t('woForm.field.estimatedTime')}>
                <Controller
                    name="estimated_minutes"
                    control={control}
                    render={({ field }) => (
                        <EstimatedTimePicker value={field.value} onChange={field.onChange} />
                    )}
                />
            </FormItem>

            {/* Team + member assignment */}
            {canAssign && (
                <>
                    {/* Team */}
                    <FormItem label="Team">
                        <Controller
                            name="team_id"
                            control={control}
                            render={({ field }) => (
                                <Select<TeamOption>
                                    isClearable
                                    placeholder="Select a team (optional)..."
                                    options={teamOptions}
                                    value={teamOptions.find((o) => o.value === field.value) || null}
                                    onChange={(opt) => {
                                        field.onChange(opt?.value ?? null)
                                    }}
                                    formatOptionLabel={(opt) => (
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                                            <span className="font-medium">{opt.label}</span>
                                            <span className="text-xs text-gray-400">
                                                {opt.member_ids.length} member{opt.member_ids.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    )}
                                />
                            )}
                        />
                    </FormItem>

                    {/* Assignee — single technician */}
                    <FormItem
                        label={t('woForm.field.assignMember')}
                        extra={
                            assetSiteId != null ? (
                                <span className="text-xs text-indigo-400">
                                    Grouped by site
                                </span>
                            ) : undefined
                        }
                    >
                        <Controller
                            name="assigned_member_id"
                            control={control}
                            render={({ field }) => (
                                <Select<MemberOption, false, GroupedMember>
                                    isClearable
                                    placeholder={t('woForm.placeholder.selectMember')}
                                    options={groupedMembers as any}
                                    value={allMemberOptions.find((o) => o.value === field.value) || null}
                                    onChange={(opt) => {
                                        field.onChange(opt?.value ?? null)
                                        setSuggestion(null)
                                    }}
                                    formatOptionLabel={(opt) => {
                                        const otherSites = assetSiteId != null
                                            ? opt.sites.filter((s) => s.id !== assetSiteId)
                                            : opt.sites
                                        const isLocal = assetSiteId != null && opt.sites.some((s) => s.id === assetSiteId)
                                        return (
                                            <div className="flex items-center justify-between gap-2 w-full">
                                                <span>{opt.label}</span>
                                                {!isLocal && otherSites.length > 0 && (
                                                    <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0">
                                                        {otherSites.map((s) => s.name).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    }}
                                />
                            )}
                        />
                    </FormItem>

                    {/* AI Technician Suggestion */}
                    <div className="mb-4">
                        <Button
                            type="button"
                            variant="twoTone"
                            size="sm"
                            className="w-full"
                            loading={isSuggesting}
                            disabled={!watchedDueAt}
                            onClick={handleSuggestTechnician}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <TbSparkles className="text-base shrink-0" />
                                <span>{isSuggesting ? 'Analyzing schedules…' : 'Suggest with AI'}</span>
                            </span>
                        </Button>
                        {!watchedDueAt && (
                            <p className="text-xs text-gray-400 mt-1.5 text-center">
                                Set a due date to enable conflict detection
                            </p>
                        )}
                        {suggestion && (
                            <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <TbSparkles className="text-indigo-500 text-sm" />
                                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                        AI assigned: {suggestion.name}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{suggestion.reason}</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </Card>
    )
}

export default WorkOrderSideSection
