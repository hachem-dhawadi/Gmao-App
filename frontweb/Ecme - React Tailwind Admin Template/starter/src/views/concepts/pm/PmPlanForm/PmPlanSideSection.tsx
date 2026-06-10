import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import { Controller, useWatch } from 'react-hook-form'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { apiGetAssetsList } from '@/services/AssetsService'
import { apiGetMembersList } from '@/services/MembersService'
import { apiGetAllTeams } from '@/services/TeamsService'
import type { AssetsListResponse } from '@/services/AssetsService'
import type { MembersListResponse } from '@/services/MembersService'
import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form'
import type { PmPlanFormSchema } from './types'

type Props = {
    control: Control<PmPlanFormSchema>
    errors: FieldErrors<PmPlanFormSchema>
    setValue: UseFormSetValue<PmPlanFormSchema>
}

type AssetOption   = { value: number; label: string; code: string; site_id: number | null }
type MemberOption  = { value: number; label: string; sites: { id: number; name: string }[] }
type TeamOption    = { value: number; label: string; color: string; member_ids: number[] }
type GroupedMember = { label: string; options: MemberOption[] }

const PmPlanSideSection = ({ control, errors, setValue }: Props) => {
    const { t } = useTranslation()

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

    const watchedAssetId    = useWatch({ control, name: 'asset_id' })
    const watchedTeamId     = useWatch({ control, name: 'team_id' })
    const watchedAssignedId = useWatch({ control, name: 'assigned_member_id' })

    const selectedTeam  = teamOptions.find((t) => t.value === watchedTeamId)
    const selectedAsset = assetOptions.find((a) => a.value === watchedAssetId)
    const assetSiteId   = selectedAsset?.site_id ?? null

    // Exclude team members from Assign To (team already covers them)
    const assignableTechs: MemberOption[] = selectedTeam
        ? allTechnicianOptions.filter((m) => !selectedTeam.member_ids.includes(m.value))
        : allTechnicianOptions

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

    const groupedAssignable = buildGrouped(assignableTechs)

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
                                onChange={(opt) => {
                                    field.onChange(opt?.value ?? null)
                                    // clear assigned member if they are now in the new team
                                    if (opt && watchedAssignedId != null && opt.member_ids.includes(watchedAssignedId)) {
                                        setValue('assigned_member_id', null)
                                    }
                                }}
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

                {/* Assign To — grouped by site, excludes team members */}
                <FormItem
                    label={t('pmForm.field.assignTo')}
                    extra={
                        <span className="text-xs text-gray-400">
                            {selectedTeam && assetSiteId != null
                                ? 'Outside team · grouped by site'
                                : selectedTeam
                                ? 'Outside team only'
                                : assetSiteId != null
                                ? 'Grouped by site'
                                : t('pmForm.technicianOnly')}
                        </span>
                    }
                >
                    <Controller
                        name="assigned_member_id"
                        control={control}
                        render={({ field }) => (
                            <Select<MemberOption, false, GroupedMember>
                                isClearable
                                placeholder={
                                    selectedTeam
                                        ? 'Add technician outside team…'
                                        : t('pmForm.placeholder.selectTechnician')
                                }
                                options={groupedAssignable as any}
                                noOptionsMessage={() =>
                                    selectedTeam
                                        ? 'All technicians are already in this team'
                                        : t('pmForm.noTechnicians')
                                }
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
