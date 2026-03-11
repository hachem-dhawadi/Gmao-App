import { useSessionUser } from '@/store/authStore'
import { CURRENT_COMPANY_ID_KEY } from '@/constants/app.constant'

const Home = () => {
    const user = useSessionUser((state) => state.user)
    const companyId = localStorage.getItem(CURRENT_COMPANY_ID_KEY)

    return (
        <div className="space-y-2">
            <h3>Tenant Home</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
                Signed in as: <span className="font-semibold">{user.userName || 'Unknown user'}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
                Current Company ID header: <span className="font-semibold">{companyId || 'not set'}</span>
            </p>
        </div>
    )
}

export default Home
