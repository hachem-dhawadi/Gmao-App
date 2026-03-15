import ApiService from './ApiService'
import { apiMe } from './AuthService'
import { countryList } from '@/constants/countries.constant'
import appConfig from '@/configs/app.config'
import { useSessionUser } from '@/store/authStore'
import type { MeResponse, BackendAuthUser, CompanyPayload } from '@/@types/auth'
import type { GetSettingsProfileResponse } from '@/views/concepts/accounts/Settings/types'

const normalizeDialCode = (dialCode: string) => dialCode.replace(/\D/g, '')

const dialCodeCandidates = Array.from(
    new Set(countryList.map((country) => normalizeDialCode(country.dialCode))),
)
    .filter((code) => code.length > 0)
    .sort((a, b) => b.length - a.length)

const splitFullName = (fullName: string) => {
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean)

    if (nameParts.length === 0) {
        return { firstName: '', lastName: '' }
    }

    if (nameParts.length === 1) {
        return { firstName: nameParts[0], lastName: nameParts[0] }
    }

    return {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
    }
}

const splitPhone = (phone: string | null) => {
    const raw = (phone || '').trim()

    if (!raw) {
        return { dialCode: '', phoneNumber: '' }
    }

    const digits = raw.replace(/\D/g, '')

    if (!digits) {
        return { dialCode: '', phoneNumber: '' }
    }

    const matchedDialCode = dialCodeCandidates.find((code) =>
        digits.startsWith(code),
    )

    if (!matchedDialCode) {
        return {
            dialCode: '',
            phoneNumber: digits,
        }
    }

    return {
        dialCode: `+${matchedDialCode}`,
        phoneNumber: digits.slice(matchedDialCode.length),
    }
}

const extractMePayload = (response: unknown): {
    user: Partial<BackendAuthUser> | null
    currentCompany: Partial<CompanyPayload> | null
} => {
    const raw = response as {
        data?: {
            user?: Partial<BackendAuthUser>
            current_company?: Partial<CompanyPayload> | null
            data?: {
                user?: Partial<BackendAuthUser>
                current_company?: Partial<CompanyPayload> | null
            }
        }
        user?: Partial<BackendAuthUser>
        current_company?: Partial<CompanyPayload> | null
    }

    const payload =
        (raw?.data?.user && raw.data) ||
        (raw?.data?.data?.user && raw.data.data) ||
        (raw?.user && raw)

    if (!payload) {
        return {
            user: null,
            currentCompany: null,
        }
    }

    return {
        user: payload.user || null,
        currentCompany: payload.current_company || null,
    }
}

const mapMeToSettingsProfile = (response: MeResponse | unknown): GetSettingsProfileResponse => {
    const sessionUser = useSessionUser.getState().user
    const { user: meUser, currentCompany } = extractMePayload(response)

    const userName = meUser?.name || sessionUser.userName || ''
    const userEmail = meUser?.email || sessionUser.email || ''
    const userPhone = meUser?.phone ?? sessionUser.phone ?? ''
    const userAvatar = meUser?.avatar_url || meUser?.avatar_path || sessionUser.avatar || ''

    const { firstName, lastName } = splitFullName(userName)
    const { dialCode, phoneNumber } = splitPhone(userPhone || null)

    return {
        id: String(meUser?.id || sessionUser.userId || ''),
        name: userName,
        firstName,
        lastName,
        email: userEmail,
        img: userAvatar,
        location: currentCompany?.country || '',
        address: currentCompany?.address_line1 || '',
        postcode: currentCompany?.postal_code || '',
        city: currentCompany?.city || '',
        country: currentCompany?.country || '',
        dialCode,
        birthday: '',
        phoneNumber,
        locale: meUser?.locale || appConfig.locale,
        isActive:
            typeof meUser?.is_active === 'boolean' ? meUser.is_active : true,
        lastLoginAt: meUser?.last_login_at || '',
        createdAt: meUser?.created_at || '',
        updatedAt: meUser?.updated_at || '',
    }
}

export async function apiGetSettingsProfile<T>() {
    const response = await apiMe()
    return mapMeToSettingsProfile(response) as unknown as T
}

export async function apiGetSettingsNotification<T>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/setting/notification',
        method: 'get',
    })
}

export async function apiGetSettingsBilling<T>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/setting/billing',
        method: 'get',
    })
}

export async function apiGetSettingsIntergration<T>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/setting/intergration',
        method: 'get',
    })
}

export async function apiGetRolesPermissionsUsers<
    T,
    U extends Record<string, unknown>,
>(params: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/rbac/users',
        method: 'get',
        params,
    })
}

export async function apiGetRolesPermissionsRoles<T>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/rbac/roles',
        method: 'get',
    })
}

export async function apiGetPricingPlans<T>() {
    return ApiService.fetchDataWithAxios<T>({
        url: '/pricing',
        method: 'get',
    })
}

