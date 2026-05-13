import useSWR from 'swr'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Skeleton from '@/components/ui/Skeleton'
import { apiGetRoles } from '@/services/RolesService'
import { TbCheck, TbMinus, TbShield } from 'react-icons/tb'
import type { RolesResponse, Role } from '@/services/RolesService'

const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
    hr: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    manager: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    technician: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
}

const moduleGroups: { module: string; label: string; prefix: string }[] = [
    { module: 'companies', label: 'Company', prefix: 'companies.' },
    { module: 'members', label: 'Members', prefix: 'members.' },
    { module: 'departments', label: 'Departments', prefix: 'departments.' },
    { module: 'roles', label: 'Roles', prefix: 'roles.' },
    { module: 'assets', label: 'Assets', prefix: 'assets.' },
    { module: 'work_orders', label: 'Work Orders', prefix: 'work_orders.' },
    { module: 'inventory', label: 'Inventory', prefix: 'inventory.' },
    { module: 'purchasing', label: 'Purchasing', prefix: 'purchasing.' },
    { module: 'files', label: 'Files', prefix: 'files.' },
    { module: 'chat', label: 'Chat', prefix: 'chat.' },
    { module: 'notifications', label: 'Notifications', prefix: 'notifications.' },
]

const RolesPermissions = () => {
    const { data, isLoading } = useSWR(
        '/roles',
        () => apiGetRoles<RolesResponse>(),
        { revalidateOnFocus: false },
    )

    const roles: Role[] = data?.data?.roles || []

    // collect all unique permissions across all roles
    const allPermissions = Array.from(
        new Map(
            roles.flatMap((r) => r.permissions).map((p) => [p.code, p]),
        ).values(),
    ).sort((a, b) => a.code.localeCompare(b.code))

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <Skeleton height={400} />
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xl">
                        <TbShield />
                    </div>
                    <div>
                        <h3 className="text-gray-900 dark:text-gray-100">
                            Roles & Permissions
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Overview of what each role can do in your company
                        </p>
                    </div>
                </div>

                {/* Role cards summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    {roles.map((role) => (
                        <div
                            key={role.id}
                            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700"
                        >
                            <div
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${roleColors[role.code] || 'bg-gray-100 text-gray-600'}`}
                            >
                                {role.label}
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {role.permissions.length}
                            </p>
                            <p className="text-xs text-gray-400">permissions</p>
                        </div>
                    ))}
                </div>

                {/* Permission matrix */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 pr-6 font-semibold text-gray-600 dark:text-gray-400 w-56">
                                    Permission
                                </th>
                                {roles.map((role) => (
                                    <th
                                        key={role.id}
                                        className="text-center py-3 px-4 font-semibold"
                                    >
                                        <span
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors[role.code] || 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {role.label}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {moduleGroups.map((group) => {
                                const groupPerms = allPermissions.filter((p) =>
                                    p.code.startsWith(group.prefix),
                                )
                                if (groupPerms.length === 0) return null

                                return (
                                    <>
                                        {/* Module header row */}
                                        <tr key={`group-${group.module}`}>
                                            <td
                                                colSpan={roles.length + 1}
                                                className="pt-5 pb-1"
                                            >
                                                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                                    {group.label}
                                                </span>
                                            </td>
                                        </tr>

                                        {/* Permission rows */}
                                        {groupPerms.map((perm, idx) => (
                                            <tr
                                                key={perm.code}
                                                className={
                                                    idx % 2 === 0
                                                        ? 'bg-gray-50 dark:bg-gray-700/20'
                                                        : ''
                                                }
                                            >
                                                <td className="py-2.5 pr-6 text-gray-700 dark:text-gray-300 rounded-l-lg pl-2">
                                                    {perm.label}
                                                </td>
                                                {roles.map((role) => {
                                                    const has = role.permissions.some(
                                                        (p) => p.code === perm.code,
                                                    )
                                                    return (
                                                        <td
                                                            key={role.id}
                                                            className="py-2.5 px-4 text-center"
                                                        >
                                                            {has ? (
                                                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                                                                    <TbCheck className="text-emerald-600 dark:text-emerald-400 text-xs font-bold" />
                                                                </span>
                                                            ) : (
                                                                <TbMinus className="text-gray-300 dark:text-gray-600 mx-auto" />
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                    These are system roles. Permissions are managed automatically by the application.
                </p>
            </AdaptiveCard>
        </Container>
    )
}

export default RolesPermissions
