import api from './ApiService'

export type LoginPayload = { email: string; password: string; company_id?: number }

export type AuthUser = {
    id: number
    name: string
    email: string
    avatar_url?: string | null
    is_superadmin: boolean
}

export type Membership = {
    company_id: number
    company_name: string
    member_id: number
    roles: { code: string; name: string }[]
    is_active: boolean
}

export type MeResponse = {
    success: boolean
    data: {
        user: AuthUser
        memberships: Membership[]
        default_company_id: number | null
    }
}

export async function apiLogin(payload: LoginPayload) {
    return api.post<{ success: boolean; data: { token: string } }>('/auth/login', payload)
}

export async function apiMe() {
    return api.get<MeResponse>('/auth/me')
}

export async function apiLogout() {
    return api.post('/auth/logout')
}

export async function apiForgotPassword(email: string) {
    return api.post('/auth/forgot-password', { email })
}

export type RegisterPayload = {
    name:                  string
    email:                 string
    password:              string
    password_confirmation: string
}

export async function apiRegister(payload: RegisterPayload) {
    return api.post<{ success: boolean; data: { requires_otp: boolean; email: string } }>('/auth/register', payload)
}

export async function apiSendOtp(email: string) {
    return api.post<{ success: boolean; message: string }>('/auth/send-otp', { email })
}

export async function apiVerifyOtp(email: string, code: string) {
    return api.post<{ success: boolean; message: string }>('/auth/verify-otp', { email, code })
}
