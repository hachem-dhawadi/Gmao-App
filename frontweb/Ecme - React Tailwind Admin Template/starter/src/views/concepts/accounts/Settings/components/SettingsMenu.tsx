import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Menu from '@/components/ui/Menu'
import ScrollBar from '@/components/ui/ScrollBar'
import { useSessionUser } from '@/store/authStore'
import { CURRENT_COMPANY_ID_KEY, OWNER_COMPANY_TAB_KEY } from '@/constants/app.constant'
import { useSettingsStore } from '../store/settingsStore'
import useQuery from '@/utils/hooks/useQuery'
import {
    TbUserSquare,
    TbBuilding,
    TbLock,
    TbBell,
    TbFileDollar,
    TbRefreshDot,
} from 'react-icons/tb'
import type { View } from '../types'

const { MenuItem } = Menu

export const SettingsMenu = ({ onChange }: { onChange?: () => void }) => {
    const query = useQuery()
    const navigate = useNavigate()
    const location = useLocation()

    const authority = useSessionUser((state) => state.user.authority || [])
    const isSuperadmin = useSessionUser(
        (state) => Boolean(state.user.isSuperadmin),
    )

    const companyId = localStorage.getItem(CURRENT_COMPANY_ID_KEY)
    const ownerCompanyAccess = localStorage.getItem(OWNER_COMPANY_TAB_KEY) === '1'

    const showCompanyTab =
        !isSuperadmin &&
        (authority.includes('admin') || !companyId || ownerCompanyAccess)

    const menuList = useMemo(
        () => [
            { label: 'Profile', value: 'profile' as View, icon: <TbUserSquare /> },
            ...(showCompanyTab
                ? [
                      {
                          label: 'Company',
                          value: 'company' as View,
                          icon: <TbBuilding />,
                      },
                  ]
                : []),
            { label: 'Security', value: 'security' as View, icon: <TbLock /> },
            {
                label: 'Notification',
                value: 'notification' as View,
                icon: <TbBell />,
            },
            { label: 'Billing', value: 'billing' as View, icon: <TbFileDollar /> },
            {
                label: 'Integration',
                value: 'integration' as View,
                icon: <TbRefreshDot />,
            },
        ],
        [showCompanyTab],
    )

    const availableViews = useMemo(
        () => menuList.map((menu) => menu.value),
        [menuList],
    )

    const { currentView, setCurrentView } = useSettingsStore()

    useEffect(() => {
        const view = query.get('view') as View | null

        if (view && availableViews.includes(view)) {
            if (currentView !== view) {
                setCurrentView(view)
            }
            return
        }

        if (!availableViews.includes(currentView)) {
            setCurrentView(menuList[0].value)
        }
    }, [query, availableViews, currentView, setCurrentView, menuList])

    const updateQueryView = (value: View) => {
        const params = new URLSearchParams(location.search)
        params.set('view', value)
        navigate(
            {
                pathname: location.pathname,
                search: params.toString(),
            },
            { replace: true },
        )
    }

    const handleSelect = (value: View) => {
        setCurrentView(value)
        updateQueryView(value)
        onChange?.()
    }

    return (
        <div className="flex flex-col justify-between h-full">
            <ScrollBar className="h-full overflow-y-auto">
                <Menu className="mx-2 mb-10">
                    {menuList.map((menu) => (
                        <MenuItem
                            key={menu.value}
                            eventKey={menu.value}
                            className={`mb-2 ${
                                currentView === menu.value
                                    ? 'bg-gray-100 dark:bg-gray-700'
                                    : ''
                            }`}
                            isActive={currentView === menu.value}
                            onSelect={() => handleSelect(menu.value)}
                        >
                            <span className="text-2xl ltr:mr-2 rtl:ml-2">
                                {menu.icon}
                            </span>
                            <span>{menu.label}</span>
                        </MenuItem>
                    ))}
                </Menu>
            </ScrollBar>
        </div>
    )
}

export default SettingsMenu
