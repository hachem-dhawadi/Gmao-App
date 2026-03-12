import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { useAuth } from '@/auth'
import { apiMe } from '@/services/AuthService'

const CompanyPending = () => {
    const navigate = useNavigate()
    const { signOut } = useAuth()

    const [message, setMessage] = useState('')
    const [isRefreshing, setRefreshing] = useState(false)

    const checkStatus = async () => {
        setRefreshing(true)
        setMessage('')

        try {
            const resp = await apiMe()
            const company = resp.data?.current_company

            if (!company) {
                navigate('/company-setup')
                return
            }

            if (company.is_active && company.approval_status === 'approved') {
                navigate('/home')
                return
            }

            if (company.approval_status === 'rejected') {
                setMessage(
                    'Your company was rejected by superadmin. Please contact support.',
                )
                return
            }

            setMessage('Still pending approval. Please wait for superadmin validation.')
        } catch (error: unknown) {
            const responseMessage =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ||
                'Unable to refresh status right now.'

            setMessage(responseMessage)
        } finally {
            setRefreshing(false)
        }
    }

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 text-center">
            <div className="space-y-2">
                <h3>Company pending approval</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Your account is ready. Your company is waiting for
                    superadmin review before tenant access is enabled.
                </p>
            </div>

            {message && (
                <Alert showIcon type="info">
                    {message}
                </Alert>
            )}

            <div className="flex items-center justify-center gap-3">
                <Button
                    variant="solid"
                    loading={isRefreshing}
                    onClick={checkStatus}
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh status'}
                </Button>
                <Button onClick={() => signOut()}>Sign out</Button>
            </div>
        </div>
    )
}

export default CompanyPending