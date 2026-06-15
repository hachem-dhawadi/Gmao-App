import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'
import Container from '@/components/shared/Container'
import Skeleton from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import { apiGetRoles } from '@/services/RolesService'
import { apiGetMembersList } from '@/services/MembersService'
import RoleCards from './components/RoleCards'
import MembersSection from './components/MembersSection'
import RolePermissionsDialog from './components/RolePermissionsDialog'
import CreateRoleDialog from './components/CreateRoleDialog'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import type { RolesResponse, Role } from '@/services/RolesService'
import type { MembersListResponse } from '@/services/MembersService'

const RolesPermissions = () => {
    const { t } = useTranslation()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canManage = useAuthority(userAuthority, ['roles.write', 'admin'])
    const canReadMembers = useAuthority(userAuthority, ['members.read', 'admin'])

    const [selectedRole, setSelectedRole] = useState<Role | null>(null)
    const [createOpen, setCreateOpen] = useState(false)

    const {
        data: rolesData,
        isLoading: rolesLoading,
        mutate: mutateRoles,
    } = useSWR('/roles', () => apiGetRoles<RolesResponse>(), {
        revalidateOnFocus: false,
    })

    const {
        data: membersData,
        isLoading: membersLoading,
        mutate: mutateMembers,
    } = useSWR(
        canReadMembers ? ['/members', 'all-for-roles'] : null,
        () => apiGetMembersList<MembersListResponse>({ per_page: 100 }),
        { revalidateOnFocus: false },
    )

    const roles = rolesData?.data?.roles || []
    const members = membersData?.data?.members || []

    if (rolesLoading) {
        return (
            <Container>
                <Skeleton height={400} />
            </Container>
        )
    }

    return (
        <>
            <Container>
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3>{t('rolesPermissions.title')}</h3>
                        {canManage && (
                            <Button
                                variant="solid"
                                onClick={() => setCreateOpen(true)}
                            >
                                {t('rolesPermissions.createRole')}
                            </Button>
                        )}
                    </div>
                    <div className="mb-10">
                        <RoleCards
                            roles={roles}
                            members={members}
                            canManage={canManage}
                            onEditRole={(role) => setSelectedRole(role)}
                        />
                    </div>
                </div>
                <div>
                    <h3 className="mb-6">{t('rolesPermissions.allAccounts')}</h3>
                    {canReadMembers ? (
                        <MembersSection
                            members={members}
                            roles={roles}
                            isLoading={membersLoading}
                            mutate={mutateMembers}
                        />
                    ) : (
                        <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                            You don't have permission to view members.
                        </div>
                    )}
                </div>
            </Container>

            <RolePermissionsDialog
                key={selectedRole?.id ?? 0}
                role={selectedRole}
                onClose={() => setSelectedRole(null)}
                mutate={mutateRoles}
            />

            <CreateRoleDialog
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                mutate={mutateRoles}
            />
        </>
    )
}

export default RolesPermissions
