import { useRef, useImperativeHandle } from 'react'
import AuthContext from './AuthContext'
import appConfig from '@/configs/app.config'
import { useSessionUser, useToken } from '@/store/authStore'
import { useLocaleStore } from '@/store/localeStore'
import { apiSignIn, apiSignOut, apiSignUp } from '@/services/AuthService'
import {
    CURRENT_COMPANY_ID_KEY,
    OWNER_COMPANY_TAB_KEY,
    REDIRECT_URL_KEY,
} from '@/constants/app.constant'
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

type PendingAuth = {
    token: string
    user: User
    payload: AuthPayload
}

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

const getSelectedMembership = (payload?: AuthPayload) => {
    if (!payload || payload.memberships.length === 0) {
        return undefined
    }

    return (
        payload.memberships.find(
            (membership) => membership.company_id === payload.default_company_id,
        ) || payload.memberships[0]
    )
}

const mapBackendUser = (
    backendUser: BackendAuthUser,
    payload?: AuthPayload,
): User => {
    const selectedMembership = getSelectedMembership(payload)

    const roleCodes = backendUser.is_superadmin
        ? []
        : (selectedMembership?.roles || []).map((role) => role.code)

    const permissionCodes = backendUser.is_superadmin
        ? []
        : (selectedMembership?.roles || []).flatMap((role) => role.permissions ?? [])

    const authority = backendUser.is_superadmin
        ? ['superadmin']
        : Array.from(new Set(['user', ...roleCodes, ...permissionCodes]))

    return {
        userId: String(backendUser.id),
        avatar: backendUser.avatar_url || backendUser.avatar_path,
        userName: backendUser.name,
        email: backendUser.email,
        phone: backendUser.phone,
        isSuperadmin: backendUser.is_superadmin,
        authority,
        memberId: selectedMembership?.member_id ?? null,
    }
}

const resolvePostAuthPath = (user: User, payload?: AuthPayload): string => {
    if (user.isSuperadmin) {
        return appConfig.authenticatedEntryPath
    }

    if (!payload || payload.memberships.length === 0) {
        return '/concepts/account/settings?view=company'
    }

    const selectedMembership = getSelectedMembership(payload)
    const selectedCompany = selectedMembership?.company

    if (!selectedCompany) {
        return '/concepts/account/settings?view=company'
    }

    if (selectedCompany.approval_status !== 'approved') {
        if (user.authority?.includes('admin')) {
            return '/concepts/account/settings?view=company'
        }
        return '/company-pending'
    }

    if (!selectedCompany.is_active) {
        return '/company-pending'
    }

    return appConfig.authenticatedEntryPath
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
    const pendingAuthRef = useRef<PendingAuth | null>(null)

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
        localStorage.removeItem(OWNER_COMPANY_TAB_KEY)
        setUser({
            userId: '',
            avatar: '',
            userName: '',
            email: '',
            authority: [],
            isSuperadmin: false,
            phone: null,
            memberId: null,
        })
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

            const mappedUser = mapBackendUser(resp.data.user, resp.data)

            handleSignIn({ accessToken: resp.data.token }, mappedUser)

            if (resp.data.user.locale) {
                useLocaleStore.getState().setLang(resp.data.user.locale)
            }

            if (mappedUser.isSuperadmin) {
                localStorage.removeItem(CURRENT_COMPANY_ID_KEY)
                localStorage.removeItem(OWNER_COMPANY_TAB_KEY)
            } else if (resp.data.default_company_id) {
                localStorage.setItem(
                    CURRENT_COMPANY_ID_KEY,
                    String(resp.data.default_company_id),
                )

                if (mappedUser.authority?.includes('admin')) {
                    localStorage.setItem(OWNER_COMPANY_TAB_KEY, '1')
                }
            } else {
                localStorage.removeItem(CURRENT_COMPANY_ID_KEY)
                localStorage.setItem(OWNER_COMPANY_TAB_KEY, '1')
            }

            redirect(mappedUser, resp.data)

            return {
                status: 'success',
                message: resp.message,
            }
        } catch (errors: unknown) {
            const errData = (errors as { response?: { data?: { message?: string; requires_email_verification?: boolean; email?: string } } })
                ?.response?.data

            // Unverified email — redirect to OTP page (no token yet)
            if (errData?.requires_email_verification && errData?.email) {
                navigatorRef.current?.navigate(
                    `/otp-verification?email=${encodeURIComponent(errData.email)}`,
                )
                return { status: 'failed', message: errData.message || 'Email not verified' }
            }

            return {
                status: 'failed',
                message: errData?.message || String(errors),
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

            const mappedUser = mapBackendUser(resp.data.user, resp.data)

            if (resp.data.requires_otp) {
                // Store auth data without signing in — user must verify email first.
                // Signing in now would set authenticated=true and PublicRoute would
                // bounce the user away from /otp-verification back to the dashboard.
                pendingAuthRef.current = {
                    token: resp.data.token,
                    user: mappedUser,
                    payload: resp.data,
                }
                navigatorRef.current?.navigate(
                    `/otp-verification?email=${encodeURIComponent(resp.data.user.email)}`,
                )
            } else {
                handleSignIn({ accessToken: resp.data.token }, mappedUser)
                localStorage.removeItem(CURRENT_COMPANY_ID_KEY)
                localStorage.setItem(OWNER_COMPANY_TAB_KEY, '1')
                redirect(mappedUser, resp.data)
            }

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

    const completePendingSignIn = () => {
        const pending = pendingAuthRef.current
        if (!pending) return
        pendingAuthRef.current = null
        handleSignIn({ accessToken: pending.token }, pending.user)
        localStorage.removeItem(CURRENT_COMPANY_ID_KEY)
        localStorage.setItem(OWNER_COMPANY_TAB_KEY, '1')
        navigatorRef.current?.navigate('/concepts/account/settings?view=company')
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
                completePendingSignIn,
            }}
        >
            {children}
            <IsolatedNavigator ref={navigatorRef} />
        </AuthContext.Provider>
    )
}

export default AuthProvider


