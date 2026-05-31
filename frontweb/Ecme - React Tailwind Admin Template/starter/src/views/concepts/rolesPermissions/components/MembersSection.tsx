import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import Badge from '@/components/ui/Badge'
import Select, { Option as DefaultOption } from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import DataTable from '@/components/shared/DataTable'
import DebouceInput from '@/components/shared/DebouceInput'
import StickyFooter from '@/components/shared/StickyFooter'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { TbSearch, TbChecks, TbChevronDown } from 'react-icons/tb'
import dayjs from 'dayjs'
import { components } from 'react-select'
import { apiUpdateMemberRoles, apiDeleteMember } from '@/services/MembersService'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import type { Member } from '@/services/MembersService'
import type { Role } from '@/services/RolesService'
import type { ColumnDef, Row } from '@/components/shared/DataTable'
import type { ControlProps, OptionProps } from 'react-select'
import type { KeyedMutator } from 'swr'
import type { MembersListResponse } from '@/services/MembersService'

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusOption = { label: string; value: string; dotBackground: string }
type RoleOption = { label: string; value: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const { Control } = components

const statusColor: Record<string, string> = {
    active: 'bg-emerald-200 dark:bg-emerald-200 text-gray-900 dark:text-gray-900',
    inactive: 'bg-red-200 dark:bg-red-200 text-gray-900 dark:text-gray-900',
}

// ── Custom Select components ───────────────────────────────────────────────────

const StatusSelectOption = (props: OptionProps<StatusOption>) => (
    <DefaultOption<StatusOption>
        {...props}
        customLabel={(data, label) => (
            <span className="flex items-center gap-2">
                <Badge className={data.dotBackground} />
                <span>{label}</span>
            </span>
        )}
    />
)

const CustomControl = ({ children, ...props }: ControlProps<StatusOption>) => {
    const selected = props.getValue()[0]
    return (
        <Control {...props}>
            {selected && (
                <div className="flex ml-3">
                    <Badge className={selected.dotBackground} />
                </div>
            )}
            {children}
        </Control>
    )
}

// ── Props ──────────────────────────────────────────────────────────────────────

type MembersSectionProps = {
    members: Member[]
    roles: Role[]
    isLoading: boolean
    mutate: KeyedMutator<MembersListResponse>
}

// ── Component ─────────────────────────────────────────────────────────────────

const MembersSection = ({
    members,
    roles,
    isLoading,
    mutate,
}: MembersSectionProps) => {
    const { t } = useTranslation()
    const statusOptions: StatusOption[] = useMemo(() => [
        { label: t('rolesPermissions.filter.all'), value: '', dotBackground: 'bg-gray-200' },
        { label: t('rolesPermissions.filter.active'), value: 'active', dotBackground: 'bg-success' },
        { label: t('rolesPermissions.filter.inactive'), value: 'inactive', dotBackground: 'bg-error' },
    ], [t])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [pageIndex, setPageIndex] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [selected, setSelected] = useState<Member[]>([])
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const roleOptions: RoleOption[] = [
        { label: t('rolesPermissions.filter.all'), value: '' },
        ...roles.map((r) => ({ label: r.label, value: r.code })),
    ]

    const filtered = useMemo(() => {
        return members.filter((m) => {
            if (search) {
                const q = search.toLowerCase()
                if (
                    !m.user?.name?.toLowerCase().includes(q) &&
                    !m.user?.email?.toLowerCase().includes(q)
                )
                    return false
            }
            if (statusFilter && m.status !== statusFilter) return false
            if (roleFilter && !m.roles.some((r) => r.code === roleFilter))
                return false
            return true
        })
    }, [members, search, statusFilter, roleFilter])

    const paginated = useMemo(() => {
        const start = (pageIndex - 1) * pageSize
        return filtered.slice(start, start + pageSize)
    }, [filtered, pageIndex, pageSize])

    const handleRoleChange = async (member: Member, newRoleCode: string) => {
        try {
            await apiUpdateMemberRoles(member.id, [newRoleCode])
            mutate()
        } catch {
            toast.push(
                <Notification type="danger">
                    {t('rolesPermissions.toast.roleUpdateError')}
                </Notification>,
                { placement: 'top-center' },
            )
        }
    }

    const handleConfirmDelete = async () => {
        setDeleting(true)
        try {
            await Promise.all(selected.map((m) => apiDeleteMember(m.id)))
            await mutate()
            toast.push(
                <Notification type="success">
                    {t('rolesPermissions.toast.membersRemoved')}
                </Notification>,
                { placement: 'top-center' },
            )
            setSelected([])
            setDeleteOpen(false)
        } catch {
            toast.push(
                <Notification type="danger">
                    {t('rolesPermissions.toast.membersRemoveFailed')}
                </Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleting(false)
        }
    }

    const columns: ColumnDef<Member>[] = useMemo(
        () => [
            {
                header: t('rolesPermissions.col.name'),
                accessorKey: 'user.name',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div className="flex items-center gap-2">
                            <Avatar size={40} shape="circle">
                                {(row.user?.name?.[0] || '?').toUpperCase()}
                            </Avatar>
                            <div>
                                <div className="font-bold heading-text">
                                    {row.user?.name || '—'}
                                </div>
                                <div>{row.user?.email || '—'}</div>
                            </div>
                        </div>
                    )
                },
            },
            {
                header: t('rolesPermissions.col.status'),
                accessorKey: 'status',
                cell: (props) => {
                    const { status } = props.row.original
                    return (
                        <Tag
                            className={
                                statusColor[status] ||
                                'bg-gray-200 text-gray-700'
                            }
                        >
                            <span className="capitalize">{status}</span>
                        </Tag>
                    )
                },
            },
            {
                header: t('rolesPermissions.col.lastOnline'),
                accessorKey: 'user.last_login_at',
                cell: (props) => {
                    const lastLogin = props.row.original.user?.last_login_at
                    if (!lastLogin) {
                        return <span className="text-gray-400">{t('rolesPermissions.never')}</span>
                    }
                    return (
                        <div className="flex flex-col">
                            <span className="font-semibold">
                                {dayjs(lastLogin).format('MMMM, D YYYY')}
                            </span>
                            <small>{dayjs(lastLogin).format('hh:mm A')}</small>
                        </div>
                    )
                },
            },
            {
                header: t('rolesPermissions.col.role'),
                accessorKey: 'roles',
                size: 160,
                cell: (props) => {
                    const row = props.row.original
                    const currentRole = row.roles[0]
                    const otherRoles = roles.filter(
                        (r) => r.code !== currentRole?.code,
                    )

                    return (
                        <Dropdown
                            renderTitle={
                                <div className="inline-flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                    <span className="font-bold heading-text">
                                        {currentRole?.label ?? 'No role'}
                                    </span>
                                    <TbChevronDown />
                                </div>
                            }
                        >
                            {otherRoles.map((role) => (
                                <Dropdown.Item
                                    key={role.id}
                                    eventKey={role.code}
                                    onClick={() =>
                                        handleRoleChange(row, role.code)
                                    }
                                >
                                    {role.label}
                                </Dropdown.Item>
                            ))}
                        </Dropdown>
                    )
                },
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [roles, members, t],
    )

    const handleRowSelect = (checked: boolean, row: Member) => {
        setSelected((prev) =>
            checked ? [...prev, row] : prev.filter((m) => m.id !== row.id),
        )
    }

    const handleAllRowSelect = (checked: boolean, rows: Row<Member>[]) => {
        setSelected(checked ? rows.map((r) => r.original) : [])
    }

    return (
        <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <DebouceInput
                    className="max-w-[300px]"
                    placeholder={t('rolesPermissions.filter.search')}
                    type="text"
                    size="sm"
                    prefix={<TbSearch className="text-lg" />}
                    onChange={(e) => {
                        setSearch(e.target.value)
                        setPageIndex(1)
                    }}
                />
                <div className="flex items-center gap-2">
                    <Select<StatusOption, false>
                        className="min-w-[150px] w-full"
                        components={{
                            Control: CustomControl,
                            Option: StatusSelectOption,
                        }}
                        options={statusOptions}
                        size="sm"
                        placeholder={t('rolesPermissions.filter.status')}
                        defaultValue={statusOptions[0]}
                        onChange={(option) => {
                            setStatusFilter(option?.value || '')
                            setPageIndex(1)
                        }}
                    />
                    <Select<RoleOption>
                        className="min-w-[150px] w-full"
                        options={roleOptions}
                        size="sm"
                        placeholder={t('rolesPermissions.col.role')}
                        defaultValue={roleOptions[0]}
                        onChange={(option) => {
                            setRoleFilter(
                                (option as RoleOption | null)?.value || '',
                            )
                            setPageIndex(1)
                        }}
                    />
                </div>
            </div>

            {/* Table */}
            <DataTable
                selectable
                columns={columns}
                data={paginated}
                noData={!isLoading && paginated.length === 0}
                skeletonAvatarColumns={[0]}
                skeletonAvatarProps={{ width: 28, height: 28 }}
                loading={isLoading}
                pagingData={{
                    total: filtered.length,
                    pageIndex,
                    pageSize,
                }}
                checkboxChecked={(row) =>
                    selected.some((s) => s.id === row.id)
                }
                hoverable={false}
                onPaginationChange={(page) => setPageIndex(page)}
                onSelectChange={(size) => {
                    setPageSize(Number(size))
                    setPageIndex(1)
                }}
                onCheckBoxChange={handleRowSelect}
                onIndeterminateCheckBoxChange={handleAllRowSelect}
            />

            {/* Sticky footer */}
            {selected.length > 0 && (
                <StickyFooter
                    className="-mx-8 flex items-center justify-between py-4 bg-white dark:bg-gray-800"
                    stickyClass="border-t border-gray-200 dark:border-gray-700 px-8"
                    defaultClass="container mx-auto px-8 rounded-xl border border-gray-200 dark:border-gray-600 mt-4"
                >
                    <div className="container mx-auto">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <span className="text-lg text-primary">
                                    <TbChecks />
                                </span>
                                <span className="font-semibold flex items-center gap-1">
                                    <span className="heading-text">
                                        {t('rolesPermissions.footer.membersSelected', { count: selected.length })}
                                    </span>
                                    <span>{t('rolesPermissions.footer.selected')}</span>
                                </span>
                            </span>
                            <Button
                                size="sm"
                                type="button"
                                customColorClass={() =>
                                    'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error'
                                }
                                onClick={() => setDeleteOpen(true)}
                            >
                                {t('common.delete')}
                            </Button>
                        </div>
                    </div>
                </StickyFooter>
            )}

            <ConfirmDialog
                isOpen={deleteOpen}
                type="danger"
                title={t('rolesPermissions.confirmDelete.title')}
                onClose={() => setDeleteOpen(false)}
                onRequestClose={() => setDeleteOpen(false)}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>{t('rolesPermissions.confirmDelete.body', { count: selected.length })}</p>
            </ConfirmDialog>
        </>
    )
}

export default MembersSection
