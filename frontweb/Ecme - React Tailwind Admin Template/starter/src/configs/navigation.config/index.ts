import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import dashboardsNavigationConfig from './dashboards.navigation.config'
import conceptsNavigationConfig from './concepts.navigation.config'
import { SUPERADMIN } from '@/constants/roles.constant'
import type { NavigationTree } from '@/@types/navigation'

const customNavigationConfig: NavigationTree[] = [
    {
        key: 'others',
        path: '',
        title: 'Others',
        translateKey: 'nav.others.others',
        icon: 'documentation',
        type: NAV_ITEM_TYPE_TITLE,
        authority: [],
        subMenu: [
            {
                key: 'others.accessDenied',
                path: '/access-denied',
                title: 'Access Denied',
                translateKey: 'nav.others.accessDenied',
                icon: 'helpCenter',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
            {
                key: 'others.landing',
                path: '/others/landing',
                title: 'Landing',
                translateKey: 'nav.others.landing',
                icon: 'dashboardProject',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
        ],
    },
    {
        key: 'superadmin.dashboard',
        path: '/superadmin/dashboard',
        title: 'Superadmin',
        translateKey: 'nav.superadmin.dashboard',
        icon: 'dashboard',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [SUPERADMIN],
        subMenu: [],
    },
]

const navigationConfig: NavigationTree[] = [
    ...dashboardsNavigationConfig,
    ...conceptsNavigationConfig,
    ...customNavigationConfig,
]

export default navigationConfig
