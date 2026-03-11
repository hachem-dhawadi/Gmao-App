import ApiService from './ApiService'
import endpointConfig from '@/configs/endpoint.config'
import type {
    SignInCredential,
    SignUpCredential,
    ForgotPassword,
    ResetPassword,
    SignInResponse,
    SignUpResponse,
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
    const formData = new FormData()

    formData.append('owner_name', data.ownerName)
    formData.append('owner_email', data.ownerEmail)
    formData.append('owner_phone', data.ownerPhone)
    formData.append('owner_password', data.ownerPassword)
    formData.append('owner_password_confirmation', data.ownerPasswordConfirmation)
    formData.append('company_name', data.companyName)
    formData.append('company_timezone', data.companyTimezone)

    data.proofFiles.forEach((file) => {
        formData.append('proof_files[]', file)
    })

    return ApiService.fetchDataWithAxios<SignUpResponse, FormData>({
        url: endpointConfig.signUp,
        method: 'post',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
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
