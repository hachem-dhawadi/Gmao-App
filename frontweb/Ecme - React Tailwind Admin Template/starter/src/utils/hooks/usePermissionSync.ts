import useSWR from 'swr'
import { apiMe } from '@/services/AuthService'
import { useSessionUser } from '@/store/authStore'
import type { BackendAuthUser, BackendMembership } from '@/@types/auth'

function buildAuthority(
    backendUser: BackendAuthUser,
    memberships: BackendMembership[],
    defaultCompanyId: number | null,
): string[] {
    if (backendUser.is_superadmin) return ['superadmin']

    const selectedMembership =
        memberships.find((m) => m.company_id === defaultCompanyId) ||
        memberships[0]

    if (!selectedMembership) return ['user']

    const roleCodes = selectedMembership.roles.map((r) => r.code)
    const permissionCodes = selectedMembership.roles.flatMap(
        (r) => r.permissions ?? [],
    )
    return Array.from(new Set(['user', ...roleCodes, ...permissionCodes]))
}

const usePermissionSync = () => {
    const setUser = useSessionUser((state) => state.setUser)

    useSWR('/auth/me/permission-sync', apiMe, {
        revalidateOnFocus: true,
        refreshInterval: 30_000,
        onSuccess: (resp) => {
            if (!resp?.data?.memberships) return

            const { user: backendUser, memberships, default_company_id } =
                resp.data

            const newAuthority = buildAuthority(
                backendUser,
                memberships,
                default_company_id,
            )

            const currentAuthority =
                useSessionUser.getState().user.authority || []
            const changed =
                newAuthority.length !== currentAuthority.length ||
                newAuthority.some((a) => !currentAuthority.includes(a))

            if (changed) {
                setUser({ authority: newAuthority })
            }
        },
    })
}

export default usePermissionSync
