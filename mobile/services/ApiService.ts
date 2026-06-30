import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.43.163:8000/api/v1'

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 15000,
})

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('auth_token')
    if (token) config.headers.Authorization = `Bearer ${token}`

    const { user } = useAuthStore.getState()
    if (user?.companyId) config.headers['X-Company-Id'] = String(user.companyId)

    return config
})

api.interceptors.response.use(
    (res) => res,
    async (err) => {
        if (err.response?.status === 401) {
            await SecureStore.deleteItemAsync('auth_token')
        }
        return Promise.reject(err)
    },
)

export default api
