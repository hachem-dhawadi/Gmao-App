import { NAV_ITEM_TYPE_TITLE, NAV_ITEM_TYPE_ITEM } from '@/constants/navigation.constant'
import { ADMIN, HR, MANAGER, TECHNICIAN } from '@/constants/roles.constant'
import type { NavigationTree } from '@/@types/navigation'

const ALL_COMPANY_ROLES = [ADMIN, HR, MANAGER, TECHNICIAN]

const dashboardsNavigationConfig: NavigationTree[] = [
    {
        key: 'dashboard',
        path: '',
        title: 'Dashboard',
        translateKey: 'nav.dashboard.dashboard',
        icon: 'dashboard',
        type: NAV_ITEM_TYPE_TITLE,
        authority: ALL_COMPANY_ROLES,
        subMenu: [
            {
                key: 'home',
                path: '/dashboard',
                title: 'Dashboard',
                translateKey: 'nav.dashboard.dashboard',
                icon: 'dashboardEcommerce',
                type: NAV_ITEM_TYPE_ITEM,
                authority: ALL_COMPANY_ROLES,
                subMenu: [],
            },
        ],
    },
]

export default dashboardsNavigationConfig
