import { useState } from 'react'
import Alert from '@/components/ui/Alert'
import OtpVerificationForm from './components/OtpVerificationForm'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { apiSendOtp } from '@/services/AuthService'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth'

export const OtpVerificationBase = () => {
    const [otpVerified, setOtpVerified] = useTimeOutMessage()
    const [otpResend, setOtpResend] = useTimeOutMessage()
    const [message, setMessage] = useTimeOutMessage()
    const [resending, setResending] = useState(false)

    const { completePendingSignIn } = useAuth()
    const [searchParams] = useSearchParams()
    const email = searchParams.get('email') ?? ''

    const handleResendOtp = async () => {
        if (!email) return
        setResending(true)
        try {
            await apiSendOtp(email)
            setOtpResend('A new verification code has been sent to your email.')
        } catch (error: unknown) {
            const msg =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || 'Failed to resend code.'
            setMessage(msg)
        } finally {
            setResending(false)
        }
    }

    const handleVerified = (msg: string) => {
        setOtpVerified(msg)
        // Complete sign-in with the pending token, then navigate to company setup
        setTimeout(() => {
            completePendingSignIn()
        }, 1500)
    }

    return (
        <div>
            <div className="mb-8">
                <h3 className="mb-2">Verify your email</h3>
                <p className="font-semibold heading-text">
                    We sent a 6-digit code to{' '}
                    <span className="text-primary">{email || 'your email'}</span>.
                    Enter it below to continue.
                </p>
            </div>

            {!email && (
                <Alert showIcon className="mb-4" type="danger">
                    Invalid verification link. Please register again.
                </Alert>
            )}
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}
            {otpResend && (
                <Alert showIcon className="mb-4" type="info">
                    <span className="break-all">{otpResend}</span>
                </Alert>
            )}
            {otpVerified && (
                <Alert showIcon className="mb-4" type="success">
                    <span className="break-all">{otpVerified}</span>
                </Alert>
            )}

            {email && (
                <OtpVerificationForm
                    email={email}
                    setMessage={setMessage}
                    setOtpVerified={handleVerified}
                />
            )}

            <div className="mt-4 text-center">
                <span className="font-semibold">Didn&apos;t receive the code? </span>
                <button
                    className="heading-text font-bold underline"
                    onClick={handleResendOtp}
                    disabled={resending}
                >
                    {resending ? 'Sending...' : 'Resend code'}
                </button>
            </div>
        </div>
    )
}

const OtpVerification = () => {
    return <OtpVerificationBase />
}

export default OtpVerification
