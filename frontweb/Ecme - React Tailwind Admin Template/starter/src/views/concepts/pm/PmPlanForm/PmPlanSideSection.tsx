import { useMemo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import { Controller, useWatch } from 'react-hook-form'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { apiGetAssetsList, apiGetAssetChecklistTemplates } from '@/services/AssetsService'
import { apiGetMembersList } from '@/services/MembersService'
import { apiGetAllTeams } from '@/services/TeamsService'
import { apiGeneratePmChecklist } from '@/services/AiService'
import type { AssetsListResponse } from '@/services/AssetsService'
import type { MembersListResponse } from '@/services/MembersService'
import type { Control, FieldErrors, UseFormSetValue, UseFormGetValues } from 'react-hook-form'
import type { PmPlanFormSchema } from './types'
import { TbSparkles, TbLoader2 } from 'react-icons/tb'

type Props = {
    control: Control<PmPlanFormSchema>
    errors: FieldErrors<PmPlanFormSchema>
    setValue: UseFormSetValue<PmPlanFormSchema>
    getValues: UseFormGetValues<PmPlanFormSchema>
}

type AssetOption   = { value: number; label: string; code: string; site_id: number | null }
type MemberOption  = { value: number; label: string; sites: { id: number; name: string }[] }
type TeamOption    = { value: number; label: string; color: string; member_ids: number[] }
type GroupedMember = { label: string; options: MemberOption[] }

const PmPlanSideSection = ({ control, errors, setValue, getValues }: Props) => {
    const { t } = useTranslation()
    const [isGenerating, setIsGenerating] = useState(false)

    const handleGenerateChecklist = async () => {
        if (!watchedAssetId) return
        setIsGenerating(true)
        try {
            const result = await apiGeneratePmChecklist(watchedAssetId)
            if (result.tasks?.length) {
                setValue('tasks', result.tasks, { shouldDirty: true })
            }
        } catch {
            // silent fail — user still has manual input
        } finally {
            setIsGenerating(false)
        }
    }

    const intervalUnitOptions = useMemo(() => [
        { value: 'days',   label: t('pmForm.intervalUnit.days') },
        { value: 'weeks',  label: t('pmForm.intervalUnit.weeks') },
        { value: 'months', label: t('pmForm.intervalUnit.months') },
    ], [t])

    const { data: assetsData } = useSWR(
        '/assets-all',
        () => apiGetAssetsList<AssetsListResponse>({ per_page: 100 }),
        { revalidateOnFocus: false },
    )

    const { data: membersData } = useSWR(
        '/members-all',
        () => apiGetMembersList<MembersListResponse>({ per_page: 200 }),
        { revalidateOnFocus: false },
    )

    const { data: teamsData } = useSWR(
        '/teams-all-pm',
        () => apiGetAllTeams(),
        { revalidateOnFocus: false },
    )

    const assetOptions: AssetOption[] =
        assetsData?.data?.assets?.map((a) => ({
            value:   a.id,
            label:   a.name,
            code:    a.code,
            site_id: a.site_id ?? null,
        })) || []

    // All technicians with sites info
    const allTechnicianOptions: MemberOption[] =
        membersData?.data?.members
            ?.filter((m) => m.roles.some((r) => r.code === 'technician'))
            .map((m) => ({
                value: m.id,
                label: m.user?.name ?? m.employee_code,
                sites: m.sites ?? [],
            })) || []

    const teamOptions: TeamOption[] =
        teamsData?.data?.teams?.map((t) => ({
            value:      t.id,
            label:      t.name,
            color:      t.color,
            member_ids: t.member_ids,
        })) || []

    const watchedAssetId = useWatch({ control, name: 'asset_id' })

    const { data: templateData } = useSWR(
        watchedAssetId ? ['/asset-checklist-templates', watchedAssetId] : null,
        () => apiGetAssetChecklistTemplates(watchedAssetId!),
        { revalidateOnFocus: false },
    )

    const templates = templateData?.data?.checklist_templates ?? []

    const prevAssetIdRef = useRef<number | null | undefined>(undefined)

    useEffect(() => {
        if (prevAssetIdRef.current === watchedAssetId) return
        prevAssetIdRef.current = watchedAssetId

        if (!watchedAssetId || templates.length === 0) return

        const currentTasks = getValues('tasks') ?? []
        if (currentTasks.length === 0) {
            setValue('tasks', templates.map((t) => ({ title: t.title })))
        }
    }, [watchedAssetId, templates])

    const loadDefaultTasks = () => {
        setValue('tasks', templates.map((t) => ({ title: t.title })))
    }

    const selectedAsset = assetOptions.find((a) => a.value === watchedAssetId)
    const assetSiteId   = selectedAsset?.site_id ?? null

    // Group by whether the technician works at the asset's site
    const buildGrouped = (members: MemberOption[]): GroupedMember[] | MemberOption[] => {
        if (assetSiteId == null) return members

        const local = members.filter((m) => m.sites.some((s) => s.id === assetSiteId))
        const other = members.filter((m) => !m.sites.some((s) => s.id === assetSiteId))

        const groups: GroupedMember[] = []
        if (local.length > 0) {
            const siteName = local[0].sites.find((s) => s.id === assetSiteId)?.name ?? 'This Site'
            groups.push({ label: `Local · ${siteName}`, options: local })
        }
        if (other.length > 0) {
            groups.push({ label: 'Other Sites', options: other })
        }
        return groups.length > 0 ? groups : members
    }

    const groupedAssignable = buildGrouped(allTechnicianOptions)

    return (
        <>
            {/* ── Trigger ── */}
            <Card>
                <h4 className="mb-2">{t('pmForm.triggerTitle')}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                    {t('pmForm.triggerSubtitle')}
                </p>

                <FormItem
                    label={t('pmForm.field.repeatEvery')}
                    asterisk
                    invalid={
                        Boolean(errors.trigger_interval_value) ||
                        Boolean(errors.trigger_interval_unit)
                    }
                    errorMessage={
                        errors.trigger_interval_value?.message ||
                        errors.trigger_interval_unit?.message
                    }
                >
                    <div className="flex gap-2">
                        <Controller
                            name="trigger_interval_value"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="number"
                                    min={1}
                                    className="w-24"
                                    placeholder="3"
                                    invalid={Boolean(errors.trigger_interval_value)}
                                    {...field}
                                />
                            )}
                        />
                        <Controller
                            name="trigger_interval_unit"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    className="flex-1"
                                    options={intervalUnitOptions}
                                    value={intervalUnitOptions.find((o) => o.value === field.value) || null}
                                    onChange={(opt) => field.onChange(opt?.value)}
                                />
                            )}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        {t('pmForm.intervalExample')}
                    </p>
                </FormItem>

                <FormItem
                    label={t('pmForm.field.firstRun')}
                    extra={<span className="text-xs text-gray-400">{t('pmForm.firstRunHint')}</span>}
                >
                    <Controller
                        name="trigger_next_run_at"
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                placeholder={t('pmForm.placeholder.pickDate')}
                                value={field.value ? dayjs(field.value).toDate() : null}
                                onChange={(date) =>
                                    field.onChange(date ? dayjs(date).format('YYYY-MM-DD') : '')
                                }
                            />
                        )}
                    />
                </FormItem>
            </Card>

            {/* ── Assignment ── */}
            <Card>
                <h4 className="mb-6">{t('pmForm.assignmentTitle')}</h4>

                {/* Asset */}
                <FormItem label={t('pmForm.field.asset')}>
                    <Controller
                        name="asset_id"
                        control={control}
                        render={({ field }) => (
                            <Select<AssetOption>
                                placeholder={t('pmForm.placeholder.selectAsset')}
                                options={assetOptions}
                                value={assetOptions.find((o) => o.value === field.value) || null}
                                onChange={(option) => field.onChange(option?.value ?? null)}
                                formatOptionLabel={(opt) => (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{opt.label}</span>
                                        <span className="text-xs text-gray-400 font-mono">{opt.code}</span>
                                    </div>
                                )}
                            />
                        )}
                    />
                    {watchedAssetId && (
                        <div className="mt-3 flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={isGenerating}
                                onClick={handleGenerateChecklist}
                                className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isGenerating
                                    ? <TbLoader2 className="text-base animate-spin shrink-0" />
                                    : <TbSparkles className="text-base shrink-0" />
                                }
                                {isGenerating ? 'Generating checklist…' : 'Generate checklist with AI'}
                            </button>
                            {templates.length > 0 && (
                                <button
                                    type="button"
                                    onClick={loadDefaultTasks}
                                    className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                >
                                    Load {templates.length} default task{templates.length !== 1 ? 's' : ''}
                                </button>
                            )}
                        </div>
                    )}
                </FormItem>

                {/* Team — independent of Assign To */}
                <FormItem
                    label="Team"
                    extra={<span className="text-xs text-gray-400">Responsible team</span>}
                >
                    <Controller
                        name="team_id"
                        control={control}
                        render={({ field }) => (
                            <Select<TeamOption>
                                isClearable
                                placeholder="Select team (optional)..."
                                options={teamOptions}
                                value={teamOptions.find((o) => o.value === field.value) || null}
                                onChange={(opt) => field.onChange(opt?.value ?? null)}
                                formatOptionLabel={(opt) => (
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: opt.color }}
                                        />
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

                {/* Assign To — single lead, independent of team */}
                <FormItem
                    className="mt-4"
                    label={t('pmForm.field.assignTo')}
                    extra={
                        assetSiteId != null
                            ? <span className="text-xs text-indigo-400">Grouped by site</span>
                            : undefined
                    }
                >
                    <Controller
                        name="assigned_member_id"
                        control={control}
                        render={({ field }) => (
                            <Select<MemberOption, false, GroupedMember>
                                isClearable
                                placeholder={t('pmForm.placeholder.selectTechnician')}
                                options={groupedAssignable as any}
                                noOptionsMessage={() => t('pmForm.noTechnicians')}
                                value={allTechnicianOptions.find((o) => o.value === field.value) || null}
                                onChange={(option) => field.onChange(option?.value ?? null)}
                                formatOptionLabel={(opt) => {
                                    const isLocal = assetSiteId != null && opt.sites.some((s) => s.id === assetSiteId)
                                    const otherSites = assetSiteId != null
                                        ? opt.sites.filter((s) => s.id !== assetSiteId)
                                        : opt.sites
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
            </Card>
        </>
    )
}

export default PmPlanSideSection
