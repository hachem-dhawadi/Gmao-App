import appConfig from '@/configs/app.config'
import {
    TOKEN_TYPE,
    REQUEST_HEADER_AUTH_KEY,
    TOKEN_NAME_IN_STORAGE,
} from '@/constants/api.constant'
import { CURRENT_COMPANY_ID_KEY } from '@/constants/app.constant'
import cookiesStorage from '@/utils/cookiesStorage'
import type { InternalAxiosRequestConfig } from 'axios'

const getAccessToken = (): string => {
    const storage = appConfig.accessTokenPersistStrategy

    if (storage === 'localStorage') {
        return localStorage.getItem(TOKEN_NAME_IN_STORAGE) || ''
    }

    if (storage === 'sessionStorage') {
        return sessionStorage.getItem(TOKEN_NAME_IN_STORAGE) || ''
    }

    return (cookiesStorage.getItem(TOKEN_NAME_IN_STORAGE) as string | null) || ''
}

const AxiosRequestIntrceptorConfigCallback = (
    config: InternalAxiosRequestConfig,
) => {
    const accessToken = getAccessToken()

    if (accessToken) {
        config.headers[REQUEST_HEADER_AUTH_KEY] = `${TOKEN_TYPE}${accessToken}`
    }

    const companyId = localStorage.getItem(CURRENT_COMPANY_ID_KEY) || ''

    if (/^\d+$/.test(companyId)) {
        config.headers['X-Company-Id'] = companyId
    }

    return config
}

export default AxiosRequestIntrceptorConfigCallback
