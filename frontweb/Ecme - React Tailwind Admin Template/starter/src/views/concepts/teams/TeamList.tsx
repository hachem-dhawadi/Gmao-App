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
    TbChevronLeft, TbChevronRight, TbX, TbUsersGroup,
} from 'react-icons/tb'
import classNames from '@/utils/classNames'

// ── Member avatar ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    '#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b',
    '#ef4444','#3b82f6','#10b981','#f97316','#06b6d4',
]

function nameToColor(name: string): string {
    let h = 0
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function nameToInitials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('')
}

const MemberAvatar = ({ name, avatar }: { name: string; avatar: string | null }) => {
    const [failed, setFailed] = useState(false)
    if (avatar && !failed) {
        return <img className="w-7 h-7 rounded-full object-cover" src={avatar} alt={name} onError={() => setFailed(true)} />
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

// ── Team card ─────────────────────────────────────────────────────────────────

const TeamCard = ({
    team, canWrite, onEdit, onDelete,
}: { team: Team; canWrite: boolean; onEdit: () => void; onDelete: () => void }) => {
    const count   = team.members_count ?? 0
    const members = team.members ?? []

    return (
        <div className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">

            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0 w-2.5 h-2.5 rounded-full mt-0.5" style={{ backgroundColor: team.color }} />
                    <h6 className="font-bold text-gray-800 dark:text-gray-100 truncate">{team.name}</h6>
                </div>
                <span className={classNames(
                    'shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1',
                    team.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400',
                )}>
                    <span className={classNames('w-1.5 h-1.5 rounded-full', team.is_active ? 'bg-emerald-500' : 'bg-gray-400')} />
                    {team.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>

            {/* Description */}
            <p className={classNames(
                'text-sm line-clamp-2 leading-relaxed flex-1',
                team.description ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600 italic',
            )}>
                {team.description || 'No description provided.'}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                {/* Avatars */}
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center">
                        {members.slice(0, 4).map((m, idx) => (
                            <Tooltip key={m.id} title={m.name}>
                                <div className="rounded-full ring-2 ring-white dark:ring-gray-800 -ml-1.5 first:ml-0" style={{ zIndex: 4 - idx }}>
                                    <MemberAvatar name={m.name} avatar={m.avatar} />
                                </div>
                            </Tooltip>
                        ))}
                        {members.length > 4 && (
                            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-800 -ml-1.5 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-gray-500">+{members.length - 4}</span>
                            </div>
                        )}
                    </div>
                    <span className="text-xs text-gray-400">{count} member{count !== 1 ? 's' : ''}</span>
                </div>

                {/* Actions — visible on hover */}
                {canWrite && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip title="Edit">
                            <button
                                type="button"
                                onClick={onEdit}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            >
                                <TbEdit className="text-sm" />
                            </button>
                        </Tooltip>
                        <Tooltip title="Delete">
                            <button
                                type="button"
                                onClick={onDelete}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            >
                                <TbTrash className="text-sm" />
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

const CardSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
            <Skeleton className="w-2.5 h-2.5 rounded-full" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1">
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="w-7 h-7 rounded-full" style={{ marginLeft: '-6px' }} />
            <Skeleton className="w-7 h-7 rounded-full" style={{ marginLeft: '-6px' }} />
        </div>
    </div>
)

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState = ({ search, canWrite, onCreate }: { search: string; canWrite: boolean; onCreate: () => void }) => (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
            <TbUsersGroup className="text-3xl text-indigo-400" />
        </div>
        <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">
                {search ? `No results for "${search}"` : 'No teams yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
                {search
                    ? 'Try a different keyword or clear your search.'
                    : 'Create teams to group technicians and assign them to work orders faster.'}
            </p>
        </div>
        {canWrite && !search && (
            <Button variant="solid" icon={<TbPlus />} onClick={onCreate}>Create First Team</Button>
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
        () => apiGetTeamsList({ page, per_page: 12, search: search || undefined, is_active: isActiveParam }),
        { revalidateOnFocus: false },
    )

    const teams      = data?.data?.teams ?? []
    const pagination = data?.data?.pagination

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await apiDeleteTeam(deleteTarget.id)
            toast.push(
                <Notification type="success">Team <strong>{deleteTarget.name}</strong> deleted.</Notification>,
                { placement: 'top-center' },
            )
            setDeleteTarget(null)
            mutate()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete team.'
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Container>
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold">Teams</h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                        {pagination
                            ? `${pagination.total} team${pagination.total !== 1 ? 's' : ''}`
                            : 'Group technicians for faster work order assignment'}
                    </p>
                </div>
                {canWrite && (
                    <Button variant="solid" size="sm" icon={<TbPlus />} onClick={() => setCreateOpen(true)}>
                        New Team
                    </Button>
                )}
            </div>

            {/* ── Search + filter ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <TbSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Search teams…"
                        className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition"
                    />
                    {search && (
                        <button type="button" onClick={() => { setSearch(''); setPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                            <TbX className="text-sm" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl self-start sm:self-auto">
                    {(['all', 'active', 'inactive'] as const).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => { setStatusFilter(f); setPage(1) }}
                            className={classNames(
                                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
                                statusFilter === f
                                    ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Grid ── */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
            ) : teams.length === 0 ? (
                <EmptyState search={search} canWrite={canWrite} onCreate={() => setCreateOpen(true)} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
                <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-400">
                        Page {page} of {pagination.last_page} · {pagination.total} teams
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
            <TeamFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); mutate() }} />
            <TeamFormDialog open={!!editTarget} team={editTarget ?? undefined} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); mutate() }} />
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
                    Are you sure you want to delete <strong className="text-gray-800 dark:text-gray-100">{deleteTarget?.name}</strong>?
                </p>
                <p className="text-xs text-gray-400 mt-1">Work orders linked to this team will have their team reference cleared.</p>
            </ConfirmDialog>
        </Container>
    )
}

export default TeamList
