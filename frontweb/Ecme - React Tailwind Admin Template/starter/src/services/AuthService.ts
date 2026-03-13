import ApiService from './ApiService'
import endpointConfig from '@/configs/endpoint.config'
import type {
    SignInCredential,
    SignUpCredential,
    CreateCompanyRequest,
    UpdateCompanyRequest,
    ForgotPassword,
    ResetPassword,
    SignInResponse,
    SignUpResponse,
    CreateCompanyResponse,
    UpdateCompanyResponse,
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

const buildCompanyFormData = (
    data: CreateCompanyRequest | UpdateCompanyRequest,
): FormData => {
    const formData = new FormData()

    formData.append('name', data.name)
    formData.append('legal_name', data.legalName)
    formData.append('phone', data.phone)
    formData.append('email', data.email)
    formData.append('address_line1', data.addressLine1)
    formData.append('city', data.city)
    formData.append('postal_code', data.postalCode)
    formData.append('country', data.country)

    if (data.addressLine2) {
        formData.append('address_line2', data.addressLine2)
    }

    if (data.timezone) {
        formData.append('timezone', data.timezone)
    }

    if (data.logo) {
        formData.append('logo', data.logo)
    }

    if ('proofFiles' in data && Array.isArray(data.proofFiles)) {
        data.proofFiles.forEach((file) => {
            formData.append('proof_files[]', file)
        })
    }

    return formData
}

export async function apiCreateCompany(data: CreateCompanyRequest) {
    return ApiService.fetchDataWithAxios<CreateCompanyResponse>({
        url: endpointConfig.createCompany,
        method: 'post',
        data: buildCompanyFormData(data),
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    })
}

export async function apiUpdateCurrentCompany(data: UpdateCompanyRequest) {
    const formData = buildCompanyFormData(data)
    formData.append('_method', 'PATCH')

    return ApiService.fetchDataWithAxios<UpdateCompanyResponse>({
        url: endpointConfig.updateCurrentCompany,
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


