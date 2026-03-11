import Logo from '@/components/template/Logo'
import Alert from '@/components/ui/Alert'
import SignInForm from './components/SignInForm'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useThemeStore } from '@/store/themeStore'

type SignInProps = {
    signUpUrl?: string
    disableSubmit?: boolean
}

export const SignInBase = ({
    signUpUrl = '/sign-up',
    disableSubmit,
}: SignInProps) => {
    const [message, setMessage] = useTimeOutMessage()

    const mode = useThemeStore((state) => state.mode)

    return (
        <>
            <div className="mb-8">
                <Logo
                    type="streamline"
                    mode={mode}
                    imgClass="mx-auto"
                    logoWidth={60}
                />
            </div>
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
            <div>
                <div className="mt-6 text-center">
                    <span>{`Need to register a company?`} </span>
                    <ActionLink
                        to={signUpUrl}
                        className="heading-text font-bold"
                        themeColor={false}
                    >
                        Create owner account
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
