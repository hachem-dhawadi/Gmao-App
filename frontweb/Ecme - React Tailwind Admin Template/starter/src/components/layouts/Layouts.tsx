import { Suspense } from 'react'
import Loading from '@/components/shared/Loading'
import type { CommonProps } from '@/@types/common'
import { useAuth } from '@/auth'
import { useThemeStore } from '@/store/themeStore'
import PostLoginLayout from './PostLoginLayout'
import PreLoginLayout from './PreLoginLayout'
import useGlobalChatNotifications from '@/hooks/useGlobalChatNotifications'

const AuthenticatedLayout = ({ layoutType, children }: CommonProps & { layoutType: string }) => {
    useGlobalChatNotifications()
    return <PostLoginLayout layoutType={layoutType}>{children}</PostLoginLayout>
}

const Layout = ({ children }: CommonProps) => {
    const layoutType = useThemeStore((state) => state.layout.type)
    const { authenticated } = useAuth()

    return (
        <Suspense
            fallback={
                <div className="flex flex-auto flex-col h-[100vh]">
                    <Loading loading={true} />
                </div>
            }
        >
            {authenticated ? (
                <AuthenticatedLayout layoutType={layoutType}>
                    {children}
                </AuthenticatedLayout>
            ) : (
                <PreLoginLayout>{children}</PreLoginLayout>
            )}
        </Suspense>
    )
}

export default Layout
