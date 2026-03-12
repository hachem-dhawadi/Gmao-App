import { useRef, useImperativeHandle } from 'react'
import AuthContext from './AuthContext'
import appConfig from '@/configs/app.config'
import { useSessionUser, useToken } from '@/store/authStore'
import { apiSignIn, apiSignOut, apiSignUp } from '@/services/AuthService'
import { CURRENT_COMPANY_ID_KEY, REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useNavigate } from 'react-router-dom'
import type {
    AuthPayload,
    BackendAuthUser,
    SignInCredential,
    SignUpCredential,
    AuthResult,
    OauthSignInCallbackPayload,
    User,
    Token,
} from '@/@types/auth'
import type { ReactNode, Ref } from 'react'
import type { NavigateFunction } from 'react-router-dom'

type AuthProviderProps = { children: ReactNode }

export type IsolatedNavigatorRef = {
    navigate: NavigateFunction
}

const IsolatedNavigator = ({ ref }: { ref: Ref<IsolatedNavigatorRef> }) => {
    const navigate = useNavigate()

    useImperativeHandle(
        ref,
        () => {
            return {
                navigate,
            }
        },
        [navigate],
    )

    return <></>
}

const mapBackendUser = (backendUser: BackendAuthUser): User => ({
    userId: String(backendUser.id),
    avatar: backendUser.avatar_path,
    userName: backendUser.name,
    email: backendUser.email,
    phone: backendUser.phone,
    isSuperadmin: backendUser.is_superadmin,
    authority: backendUser.is_superadmin ? ['superadmin'] : ['user'],
})

const resolvePostAuthPath = (user: User, payload?: AuthPayload): string => {
    if (user.isSuperadmin) {
        return '/superadmin/dashboard'
    }

    if (!payload || payload.memberships.length === 0) {
        return '/company-setup'
    }

    const selectedMembership = payload.memberships.find(
        (membership) => membership.company_id === payload.default_company_id,
    )

    const selectedCompany = selectedMembership?.company

    if (!selectedCompany) {
        return '/company-setup'
    }

    if (selectedCompany.is_active && selectedCompany.approval_status === 'approved') {
        return appConfig.authenticatedEntryPath
    }

    return '/company-pending'
}

function AuthProvider({ children }: AuthProviderProps) {
    const signedIn = useSessionUser((state) => state.session.signedIn)
    const user = useSessionUser((state) => state.user)
    const setUser = useSessionUser((state) => state.setUser)
    const setSessionSignedIn = useSessionUser(
        (state) => state.setSessionSignedIn,
    )
    const { token, setToken } = useToken()

    const authenticated = Boolean(token && signedIn)

    const navigatorRef = useRef<IsolatedNavigatorRef>(null)

    const redirect = (signedInUser?: User, payload?: AuthPayload) => {
        const search = window.location.search
        const params = new URLSearchParams(search)
        const redirectUrl = params.get(REDIRECT_URL_KEY)

        if (redirectUrl) {
            navigatorRef.current?.navigate(redirectUrl)
            return
        }

        navigatorRef.current?.navigate(resolvePostAuthPath(signedInUser || {}, payload))
    }

    const handleSignIn = (tokens: Token, user?: User) => {
        setToken(tokens.accessToken)
        setSessionSignedIn(true)

        if (user) {
            setUser(user)
        }
    }

    const handleSignOut = () => {
        setToken('')
        localStorage.removeItem(CURRENT_COMPANY_ID_KEY)
        setUser({})
        setSessionSignedIn(false)
    }

    const signIn = async (values: SignInCredential): AuthResult => {
        try {
            const resp = await apiSignIn(values)

            if (!resp.success || !resp.data) {
                return {
                    status: 'failed',
                    message: resp.message || 'Unable to sign in',
                }
            }

            const mappedUser = mapBackendUser(resp.data.user)

            handleSignIn({ accessToken: resp.data.token }, mappedUser)

            if (mappedUser.isSuperadmin) {
                localStorage.removeItem(CURRENT_COMPANY_ID_KEY)
            } else if (resp.data.default_company_id) {
                localStorage.setItem(
                    CURRENT_COMPANY_ID_KEY,
                    String(resp.data.default_company_id),
                )
            } else {
                localStorage.removeItem(CURRENT_COMPANY_ID_KEY)
            }

            redirect(mappedUser, resp.data)

            return {
                status: 'success',
                message: resp.message,
            }
        } catch (errors: unknown) {
            const message =
                (errors as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || String(errors)

            return {
                status: 'failed',
                message,
            }
        }
    }

    const signUp = async (values: SignUpCredential): AuthResult => {
        try {
            const resp = await apiSignUp(values)

            if (!resp.success || !resp.data) {
                return {
                    status: 'failed',
                    message: resp.message || 'Unable to create owner account',
                }
            }

            const mappedUser = mapBackendUser(resp.data.user)

            handleSignIn({ accessToken: resp.data.token }, mappedUser)
            localStorage.removeItem(CURRENT_COMPANY_ID_KEY)
            redirect(mappedUser, resp.data)

            return {
                status: 'success',
                message: resp.message,
            }
        } catch (errors: unknown) {
            const message =
                (errors as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || String(errors)

            return {
                status: 'failed',
                message,
            }
        }
    }

    const signOut = async () => {
        try {
            await apiSignOut()
        } finally {
            handleSignOut()
            navigatorRef.current?.navigate(appConfig.unAuthenticatedEntryPath)
        }
    }

    const oAuthSignIn = (
        callback: (payload: OauthSignInCallbackPayload) => void,
    ) => {
        callback({
            onSignIn: handleSignIn,
            redirect: () => redirect(user),
        })
    }

    return (
        <AuthContext.Provider
            value={{
                authenticated,
                user,
                signIn,
                signUp,
                signOut,
                oAuthSignIn,
            }}
        >
            {children}
            <IsolatedNavigator ref={navigatorRef} />
        </AuthContext.Provider>
    )
}

export default AuthProvider
