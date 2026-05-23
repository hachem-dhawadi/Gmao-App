import { NAV_ITEM_TYPE_TITLE, NAV_ITEM_TYPE_ITEM } from '@/constants/navigation.constant'
import { ADMIN, HR, MANAGER, TECHNICIAN } from '@/constants/roles.constant'
import { CONCEPTS_PREFIX_PATH } from '@/constants/route.constant'
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
            {
                key: 'concepts.requests.requestList',
                path: `${CONCEPTS_PREFIX_PATH}/requests/request-list`,
                title: 'Requests',
                translateKey: 'nav.requests',
                icon: 'workOrderList',
                type: NAV_ITEM_TYPE_ITEM,
                authority: ['user'],
                subMenu: [],
            },
            {
                key: 'concepts.reports',
                path: `${CONCEPTS_PREFIX_PATH}/reports`,
                title: 'Reports',
                translateKey: 'nav.reports',
                icon: 'reports',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, MANAGER],
                subMenu: [],
            },
        ],
    },
]

export default dashboardsNavigationConfig
