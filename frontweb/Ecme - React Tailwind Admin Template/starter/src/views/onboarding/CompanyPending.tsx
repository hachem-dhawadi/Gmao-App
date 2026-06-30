import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { useAuth } from '@/auth'
import { apiMe } from '@/services/AuthService'

type PageState = 'pending' | 'rejected' | 'suspended'

const CompanyPending = () => {
    const navigate = useNavigate()
    const { signOut } = useAuth()

    const [message, setMessage] = useState('')
    const [pageState, setPageState] = useState<PageState>('pending')
    const [isRefreshing, setRefreshing] = useState(false)

    const checkStatus = async () => {
        setRefreshing(true)
        setMessage('')

        try {
            const resp = await apiMe()
            const company = resp.data?.current_company

            if (!company) {
                navigate('/concepts/account/settings?view=company')
                return
            }

            if (company.approval_status === 'approved' && company.is_active) {
                navigate('/home')
                return
            }

            if (company.approval_status === 'rejected') {
                setPageState('rejected')
                setMessage('Your company registration was rejected by the platform administrator. Please contact support.')
                return
            }

            if (company.approval_status === 'approved' && !company.is_active) {
                setPageState('suspended')
                setMessage('Your company has been approved but is currently suspended. Please contact the platform administrator.')
                return
            }

            setMessage('Still pending approval. Please wait for platform review.')
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

    useEffect(() => {
        checkStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const titles: Record<PageState, string> = {
        pending: 'Company pending approval',
        rejected: 'Company registration rejected',
        suspended: 'Company account suspended',
    }

    const subtitles: Record<PageState, string> = {
        pending: 'Your account is ready. Your company is waiting for platform review before access is enabled.',
        rejected: 'Your company registration was not approved. Please contact the platform administrator for more information.',
        suspended: 'Your company account has been temporarily suspended. Please contact the platform administrator.',
    }

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 text-center">
            <div className="space-y-2">
                <h3>{titles[pageState]}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {subtitles[pageState]}
                </p>
            </div>

            {message && (
                <Alert showIcon type={pageState === 'rejected' ? 'danger' : pageState === 'suspended' ? 'warning' : 'info'}>
                    {message}
                </Alert>
            )}

            <div className="flex items-center justify-center gap-3">
                {pageState === 'pending' && (
                    <Button
                        variant="solid"
                        loading={isRefreshing}
                        onClick={checkStatus}
                    >
                        {isRefreshing ? 'Checking...' : 'Refresh status'}
                    </Button>
                )}
                {pageState !== 'pending' && (
                    <Button variant="solid" loading={isRefreshing} onClick={checkStatus}>
                        {isRefreshing ? 'Checking...' : 'Check again'}
                    </Button>
                )}
                <Button onClick={() => signOut()}>Sign out</Button>
            </div>
        </div>
    )
}

export default CompanyPending