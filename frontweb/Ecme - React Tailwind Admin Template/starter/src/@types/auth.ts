export type SignInCredential = {
    email: string
    password: string
    deviceName?: string
}

export type SignUpCredential = {
    name: string
    email: string
    password: string
    passwordConfirmation: string
}

export type CreateCompanyRequest = {
    name: string
    legalName: string
    phone: string
    email?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    postalCode?: string
    country?: string
    timezone?: string
}

export type ForgotPassword = {
    email: string
}

export type ResetPassword = {
    password: string
}

export type BackendAuthUser = {
    id: number
    name: string
    email: string
    phone: string | null
    avatar_path: string | null
    locale: string | null
    is_active: boolean
    is_superadmin: boolean
    last_login_at: string | null
    created_at: string
}

export type BackendMembership = {
    member_id: number
    company_id: number
    company: {
        id: number
        name: string
        legal_name: string | null
        is_active: boolean
        approval_status: 'pending' | 'approved' | 'rejected'
    } | null
    status: string
    roles: Array<{
        id: number
        code: string
        label: string
    }>
}

export type ApiEnvelope<T> = {
    success: boolean
    message: string
    data: T
}

export type AuthPayload = {
    user: BackendAuthUser
    token: string
    token_type: string
    default_company_id: number | null
    memberships: BackendMembership[]
}

export type SignInResponse = ApiEnvelope<AuthPayload>

export type SignUpResponse = ApiEnvelope<AuthPayload>

export type CreateCompanyResponse = ApiEnvelope<{
    company: {
        id: number
        name: string
        legal_name: string | null
        is_active: boolean
        approval_status: 'pending' | 'approved' | 'rejected'
    }
}>

export type MeResponse = ApiEnvelope<{
    user: BackendAuthUser
    current_company: {
        id: number
        name: string
        legal_name: string | null
        timezone: string
        is_active: boolean
        approval_status: 'pending' | 'approved' | 'rejected'
    } | null
    current_member: {
        id: number
        company_id: number
        user_id: number
        department_id: number | null
        employee_code: string | null
        job_title: string | null
        status: string
    } | null
}>

export type AuthRequestStatus = 'success' | 'failed' | ''

export type AuthResult = Promise<{
    status: AuthRequestStatus
    message: string
}>

export type User = {
    userId?: string | null
    avatar?: string | null
    userName?: string | null
    email?: string | null
    authority?: string[]
    isSuperadmin?: boolean
    phone?: string | null
}

export type Token = {
    accessToken: string
    refereshToken?: string
}

export type OauthSignInCallbackPayload = {
    onSignIn: (tokens: Token, user?: User) => void
    redirect: () => void
}
