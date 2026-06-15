import { useState } from 'react'
import useSWR from 'swr'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import Skeleton from '@/components/ui/Skeleton'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { apiGetTeamsList, apiDeleteTeam } from '@/services/TeamsService'
import type { Team } from '@/services/TeamsService'
import TeamFormDialog from './components/TeamFormDialog'
import {
    TbUsers, TbSearch, TbPlus, TbEdit, TbTrash,
    TbChevronLeft, TbChevronRight, TbX,
} from 'react-icons/tb'
import classNames from '@/utils/classNames'

// ── Member avatar with initials fallback ──────────────────────────────────────

const AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
    '#ef4444', '#3b82f6', '#10b981', '#f97316', '#06b6d4',
]

function nameToColor(name: string): string {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function nameToInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() ?? '')
        .join('')
}

const MemberAvatar = ({ name, avatar }: { name: string; avatar: string | null }) => {
    const [imgFailed, setImgFailed] = useState(false)

    if (avatar && !imgFailed) {
        return (
            <img
                className="w-7 h-7 rounded-full object-cover"
                src={avatar}
                alt={name}
                onError={() => setImgFailed(true)}
            />
        )
    }

    return (
        <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white select-none"
            style={{ backgroundColor: nameToColor(name) }}
        >
            {nameToInitials(name)}
        </span>
    )
}

// ── Search bar ────────────────────────────────────────────────────────────────

type SearchBarProps = {
    value: string
    onChange: (v: string) => void
    activeFilter: 'all' | 'active' | 'inactive'
    onFilterChange: (f: 'all' | 'active' | 'inactive') => void
}

const SearchBar = ({ value, onChange, activeFilter, onFilterChange }: SearchBarProps) => {
    const statusFilters: { key: 'all' | 'active' | 'inactive'; label: string }[] = [
        { key: 'all',      label: 'All' },
        { key: 'active',   label: 'Active' },
        { key: 'inactive', label: 'Inactive' },
    ]

    return (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search input */}
            <div className="relative flex-1 max-w-sm">
                <TbSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Search teams by name…"
                    className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition"
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                    >
                        <TbX className="text-sm" />
                    </button>
                )}
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl self-start sm:self-auto">
                {statusFilters.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        onClick={() => onFilterChange(f.key)}
                        className={classNames(
                            'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                            activeFilter === f.key
                                ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

// ── Team card ─────────────────────────────────────────────────────────────────

type TeamCardProps = {
    team: Team
    canWrite: boolean
    onEdit: () => void
    onDelete: () => void
}

const TeamCard = ({ team, canWrite, onEdit, onDelete }: TeamCardProps) => {
    const count   = team.members_count ?? 0
    const members = team.members ?? []

    return (
        <div className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">

            {/* Card top — gradient banner with color */}
            <div
                className="h-16 relative flex items-end px-5 pb-0"
                style={{
                    background: `linear-gradient(135deg, ${team.color}22 0%, ${team.color}08 100%)`,
                    borderBottom: `1px solid ${team.color}25`,
                }}
            >
                {/* Team icon bubble sits on the border */}
                <div
                    className="absolute -bottom-5 left-5 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-800"
                    style={{ backgroundColor: team.color }}
                >
                    <TbUsers className="text-white text-lg" />
                </div>

                {/* Status badge top-right */}
                <div className="absolute top-3 right-4 flex items-center gap-1.5">
                    <span className={classNames(
                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                        team.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
                    )}>
                        <span className={classNames(
                            'w-1.5 h-1.5 rounded-full',
                            team.is_active ? 'bg-emerald-500' : 'bg-gray-400',
                        )} />
                        {team.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="px-5 pt-7 pb-4 flex flex-col gap-3 flex-1">
                {/* Name + count */}
                <div>
                    <h6 className="font-bold text-gray-800 dark:text-gray-100 leading-tight truncate">
                        {team.name}
                    </h6>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {count} member{count !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Description */}
                <p className={classNames(
                    'text-xs leading-relaxed line-clamp-2 min-h-[2.5rem]',
                    team.description
                        ? 'text-gray-500 dark:text-gray-400'
                        : 'text-gray-300 dark:text-gray-600 italic',
                )}>
                    {team.description || 'No description provided.'}
                </p>

                {/* Divider */}
                <div className="border-t border-dashed border-gray-100 dark:border-gray-700" />

                {/* Members */}
                {members.length === 0 ? (
                    <p className="text-xs text-gray-300 dark:text-gray-600 italic">No members assigned</p>
                ) : (
                    <div className="flex items-center justify-between gap-2">
                        {/* Avatar row */}
                        <div className="flex items-center">
                            {members.slice(0, 5).map((m, idx) => (
                                <Tooltip key={m.id} title={m.name}>
                                    <div
                                        className="rounded-full ring-2 ring-white dark:ring-gray-800 -ml-2 first:ml-0 cursor-default"
                                        style={{ zIndex: 5 - idx }}
                                    >
                                        <MemberAvatar name={m.name} avatar={m.avatar} />
                                    </div>
                                </Tooltip>
                            ))}
                            {members.length > 5 && (
                                <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-800 -ml-2 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                        +{members.length - 5}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Name snippet */}
                        <span className="text-[11px] text-gray-400 truncate max-w-[90px] text-right">
                            {members[0].name}
                            {members.length > 1 && (
                                <span className="text-gray-300 dark:text-gray-600"> &amp; {members.length - 1} more</span>
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer actions */}
            {canWrite && (
                <div className="flex border-t border-gray-100 dark:border-gray-700/60 mt-auto">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/20 transition-colors"
                    >
                        <TbEdit className="text-sm" /> Edit
                    </button>
                    <div className="w-px bg-gray-100 dark:bg-gray-700/60" />
                    <button
                        type="button"
                        onClick={onDelete}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-950/20 transition-colors"
                    >
                        <TbTrash className="text-sm" /> Delete
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

const CardSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="h-16 bg-gray-50 dark:bg-gray-700/30" />
        <div className="px-5 pt-7 pb-4 flex flex-col gap-3">
            <div>
                <Skeleton className="h-4 w-2/3 mb-1.5" />
                <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="border-t border-dashed border-gray-100 dark:border-gray-700" />
            <div className="flex gap-1">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full -ml-2" />
                <Skeleton className="h-7 w-7 rounded-full -ml-2" />
            </div>
        </div>
    </div>
)

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState = ({ search, canWrite, onCreate }: { search: string; canWrite: boolean; onCreate: () => void }) => (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f120 0%, #8b5cf620 100%)' }}
        >
            <TbUsers className="text-3xl text-indigo-400" />
        </div>
        <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">
                {search ? `No results for "${search}"` : 'No teams created yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
                {search
                    ? 'Try a different keyword or clear your search.'
                    : 'Teams let you group technicians and assign them to work orders in one click.'}
            </p>
        </div>
        {canWrite && !search && (
            <Button variant="solid" icon={<TbPlus />} onClick={onCreate}>
                Create First Team
            </Button>
        )}
    </div>
)

// ── Page ──────────────────────────────────────────────────────────────────────

const TeamList = () => {
    const userAuthority = useSessionUser((s) => s.user.authority)
    const canWrite      = useAuthority(userAuthority, ['teams.write'])

    const [search,       setSearch]       = useState('')
    const [page,         setPage]         = useState(1)
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [createOpen,   setCreateOpen]   = useState(false)
    const [editTarget,   setEditTarget]   = useState<Team | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)
    const [isDeleting,   setIsDeleting]   = useState(false)

    const isActiveParam =
        statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined

    const { data, isLoading, mutate } = useSWR(
        ['/teams', page, search, statusFilter],
        () => apiGetTeamsList({
            page,
            per_page: 12,
            search: search || undefined,
            is_active: isActiveParam,
        }),
        { revalidateOnFocus: false },
    )

    const teams      = data?.data?.teams ?? []
    const pagination = data?.data?.pagination

    const handleFilterChange = (f: 'all' | 'active' | 'inactive') => {
        setStatusFilter(f)
        setPage(1)
    }

    const handleSearchChange = (v: string) => {
        setSearch(v)
        setPage(1)
    }

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await apiDeleteTeam(deleteTarget.id)
            toast.push(
                <Notification type="success">
                    Team <strong>{deleteTarget.name}</strong> deleted.
                </Notification>,
                { placement: 'top-center' },
            )
            setDeleteTarget(null)
            mutate()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? 'Failed to delete team.'
            toast.push(
                <Notification type="danger">{msg}</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Container>
            {/* ── Page header ── */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">Teams</h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                        {pagination
                            ? `${pagination.total} team${pagination.total !== 1 ? 's' : ''} · ${teams.filter(t => t.is_active).length} active`
                            : 'Group technicians for faster work order assignment'}
                    </p>
                </div>
                {canWrite && (
                    <Button
                        variant="solid"
                        size="sm"
                        icon={<TbPlus />}
                        onClick={() => setCreateOpen(true)}
                        className="shrink-0"
                    >
                        New Team
                    </Button>
                )}
            </div>

            {/* ── Toolbar ── */}
            <SearchBar
                value={search}
                onChange={handleSearchChange}
                activeFilter={statusFilter}
                onFilterChange={handleFilterChange}
            />

            {/* ── Grid ── */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
            ) : teams.length === 0 ? (
                <EmptyState
                    search={search}
                    canWrite={canWrite}
                    onCreate={() => setCreateOpen(true)}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {teams.map((team) => (
                        <TeamCard
                            key={team.id}
                            team={team}
                            canWrite={canWrite}
                            onEdit={() => setEditTarget(team)}
                            onDelete={() => setDeleteTarget(team)}
                        />
                    ))}
                </div>
            )}

            {/* ── Pagination ── */}
            {pagination && pagination.last_page > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-400">
                        Page {page} of {pagination.last_page} &nbsp;·&nbsp; {pagination.total} teams
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            <TbChevronLeft className="text-sm" />
                        </button>
                        <button
                            disabled={page >= pagination.last_page}
                            onClick={() => setPage((p) => p + 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            <TbChevronRight className="text-sm" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Dialogs ── */}
            <TeamFormDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSaved={() => { setCreateOpen(false); mutate() }}
            />
            <TeamFormDialog
                open={!!editTarget}
                team={editTarget ?? undefined}
                onClose={() => setEditTarget(null)}
                onSaved={() => { setEditTarget(null); mutate() }}
            />
            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Delete Team"
                confirmText="Delete"
                cancelText="Cancel"
                confirmButtonProps={{ color: 'red', loading: isDeleting }}
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            >
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Are you sure you want to delete{' '}
                    <strong className="text-gray-800 dark:text-gray-100">{deleteTarget?.name}</strong>?
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Work orders linked to this team will have their team reference cleared.
                </p>
            </ConfirmDialog>
        </Container>
    )
}

export default TeamList
