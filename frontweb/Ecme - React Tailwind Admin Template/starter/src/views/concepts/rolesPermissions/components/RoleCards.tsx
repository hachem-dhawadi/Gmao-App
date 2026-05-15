import Button from '@/components/ui/Button'
import UsersAvatarGroup from '@/components/shared/UsersAvatarGroup'
import { TbArrowRight } from 'react-icons/tb'
import type { Role } from '@/services/RolesService'
import type { Member } from '@/services/MembersService'

type RoleCardsProps = {
    roles: Role[]
    members: Member[]
    onEditRole: (role: Role) => void
}

const RoleCards = ({ roles, members, onEditRole }: RoleCardsProps) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {roles.map((role) => {
                const roleMembers = members
                    .filter((m) => m.roles.some((r) => r.code === role.code))
                    .map((m) => ({ name: m.user?.name || '?', img: '' }))

                return (
                    <div
                        key={role.id}
                        className="flex flex-col justify-between rounded-2xl p-5 bg-gray-100 dark:bg-gray-700 min-h-[140px]"
                    >
                        <div className="flex items-center justify-between">
                            <h6 className="font-bold">{role.label}</h6>
                        </div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {role.permissions.length} permissions assigned
                        </p>
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex flex-col">
                                <div className="-ml-2">
                                    <UsersAvatarGroup
                                        avatarProps={{
                                            className:
                                                'cursor-pointer -mr-2 border-2 border-white dark:border-gray-500',
                                            size: 28,
                                        }}
                                        avatarGroupProps={{ maxCount: 3 }}
                                        chained={false}
                                        users={roleMembers}
                                    />
                                </div>
                            </div>
                            <Button
                                variant="plain"
                                size="sm"
                                className="py-0 h-auto"
                                icon={<TbArrowRight />}
                                iconAlignment="end"
                                onClick={() => onEditRole(role)}
                            >
                                Edit role
                            </Button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default RoleCards
