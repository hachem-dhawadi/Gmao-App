import ApiService from './ApiService'
import endpointConfig from '@/configs/endpoint.config'
import type {
    SignInCredential,
    SignUpCredential,
    CreateCompanyRequest,
    ForgotPassword,
    ResetPassword,
    SignInResponse,
    SignUpResponse,
    CreateCompanyResponse,
    MeResponse,
} from '@/@types/auth'

export async function apiSignIn(data: SignInCredential) {
    return ApiService.fetchDataWithAxios<SignInResponse>({
        url: endpointConfig.signIn,
        method: 'post',
        data: {
            email: data.email,
            password: data.password,
            device_name: data.deviceName,
        },
    })
}

export async function apiSignUp(data: SignUpCredential) {
    return ApiService.fetchDataWithAxios<SignUpResponse>({
        url: endpointConfig.signUp,
        method: 'post',
        data: {
            name: data.name,
            email: data.email,
            password: data.password,
            password_confirmation: data.passwordConfirmation,
        },
    })
}

export async function apiCreateCompany(data: CreateCompanyRequest) {
    return ApiService.fetchDataWithAxios<CreateCompanyResponse>({
        url: endpointConfig.createCompany,
        method: 'post',
        data: {
            name: data.name,
            legal_name: data.legalName,
            phone: data.phone,
            email: data.email,
            address_line1: data.addressLine1,
            address_line2: data.addressLine2,
            city: data.city,
            postal_code: data.postalCode,
            country: data.country,
            timezone: data.timezone,
        },
    })
}

export async function apiSignOut() {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.signOut,
        method: 'post',
    })
}

export async function apiMe() {
    return ApiService.fetchDataWithAxios<MeResponse>({
        url: endpointConfig.me,
        method: 'get',
    })
}

export async function apiForgotPassword<T>(data: ForgotPassword) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.forgotPassword,
        method: 'post',
        data,
    })
}

export async function apiResetPassword<T>(data: ResetPassword) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.resetPassword,
        method: 'post',
        data,
    })
}
