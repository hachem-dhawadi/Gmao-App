import { useState } from 'react'
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
import type { RolesResponse, Role } from '@/services/RolesService'
import type { MembersListResponse } from '@/services/MembersService'

const RolesPermissions = () => {
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
        ['/members', 'all-for-roles'],
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
                        <h3>Roles & Permissions</h3>
                        <Button
                            variant="solid"
                            onClick={() => setCreateOpen(true)}
                        >
                            Create role
                        </Button>
                    </div>
                    <div className="mb-10">
                        <RoleCards
                            roles={roles}
                            members={members}
                            onEditRole={(role) => setSelectedRole(role)}
                        />
                    </div>
                </div>
                <div>
                    <h3 className="mb-6">All accounts</h3>
                    <MembersSection
                        members={members}
                        roles={roles}
                        isLoading={membersLoading}
                        mutate={mutateMembers}
                    />
                </div>
            </Container>

            <RolePermissionsDialog
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
