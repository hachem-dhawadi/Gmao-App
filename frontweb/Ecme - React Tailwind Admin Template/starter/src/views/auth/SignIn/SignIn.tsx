import Alert from '@/components/ui/Alert'
import SignInForm from './components/SignInForm'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'

type SignInProps = {
    signUpUrl?: string
    forgotPasswordUrl?: string
    disableSubmit?: boolean
}

export const SignInBase = ({
    signUpUrl = '/sign-up',
    forgotPasswordUrl = '/forgot-password',
    disableSubmit,
}: SignInProps) => {
    const [message, setMessage] = useTimeOutMessage()

    return (
        <>
            <div className="mb-10">
                <h2 className="mb-2">Welcome back!</h2>
                <p className="font-semibold heading-text">
                    Sign in with your account to continue.
                </p>
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}
            <SignInForm disableSubmit={disableSubmit} setMessage={setMessage} />
            <div className="mt-4 text-center">
                <ActionLink
                    to={forgotPasswordUrl}
                    className="heading-text font-bold"
                    themeColor={false}
                >
                    Forgot password?
                </ActionLink>
            </div>
            <div>
                <div className="mt-4 text-center">
                    <span>{`Need to register a company?`} </span>
                    <ActionLink
                        to={signUpUrl}
                        className="heading-text font-bold"
                        themeColor={false}
                    >
                        Create account
                    </ActionLink>
                </div>
            </div>
        </>
    )
}

const SignIn = () => {
    return <SignInBase />
}

export default SignIn
