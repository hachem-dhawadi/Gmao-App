import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

const pageTitleMap: Record<string, string> = {
    '/dashboards/ecommerce': 'Ecommerce Dashboard',
    '/dashboards/project': 'Project Dashboard',
    '/dashboards/marketing': 'Marketing Dashboard',
    '/dashboards/analytic': 'Analytic Dashboard',
    '/concepts/calendar': 'Calendar',
    '/concepts/file-manager': 'File Manager',
    '/concepts/mail': 'Mail',
    '/concepts/chat': 'Chat',
    '/others/landing': 'Landing',
}

const DrawerPlaceholder = () => {
    const { pathname } = useLocation()

    const pageTitle = useMemo(() => {
        return pageTitleMap[pathname] || 'Coming Soon'
    }, [pathname])

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h4 className="mb-2">{pageTitle}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
                This page is wired from demo drawer navigation and ready for feature integration.
            </p>
        </div>
    )
}

export default DrawerPlaceholder
