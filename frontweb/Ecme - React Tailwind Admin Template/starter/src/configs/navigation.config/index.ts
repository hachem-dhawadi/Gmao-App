import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_COLLAPSE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import dashboardsNavigationConfig from './dashboards.navigation.config'
import conceptsNavigationConfig from './concepts.navigation.config'
import { SUPERADMIN } from '@/constants/roles.constant'
import { CONCEPTS_PREFIX_PATH } from '@/constants/route.constant'
import type { NavigationTree } from '@/@types/navigation'

const superadminNavigationConfig: NavigationTree[] = [
    {
        key: 'superadmin',
        path: '',
        title: 'Administration',
        translateKey: 'nav.superadmin.administration',
        icon: 'dashboard',
        type: NAV_ITEM_TYPE_TITLE,
        authority: [SUPERADMIN],
        subMenu: [
            {
                key: 'superadmin.dashboard',
                path: '/superadmin/dashboard',
                title: 'Dashboard',
                translateKey: 'nav.superadmin.dashboard',
                icon: 'dashboardEcommerce',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [SUPERADMIN],
                subMenu: [],
            },
            {
                key: 'superadmin.companies',
                path: '',
                title: 'Companies',
                translateKey: 'nav.superadmin.companies',
                icon: 'company',
                type: NAV_ITEM_TYPE_COLLAPSE,
                authority: [SUPERADMIN],
                subMenu: [
                    {
                        key: 'concepts.company.companyList',
                        path: `${CONCEPTS_PREFIX_PATH}/company/company-list`,
                        title: 'Company List',
                        translateKey: 'nav.superadmin.companyList',
                        icon: 'companyList',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: [SUPERADMIN],
                        subMenu: [],
                    },
                    {
                        key: 'concepts.company.companyCreate',
                        path: `${CONCEPTS_PREFIX_PATH}/company/company-create`,
                        title: 'Add Company',
                        translateKey: 'nav.superadmin.companyCreate',
                        icon: 'companyCreate',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: [SUPERADMIN],
                        subMenu: [],
                    },
                ],
            },
        ],
    },
]

const navigationConfig: NavigationTree[] = [
    ...superadminNavigationConfig,
    ...dashboardsNavigationConfig,
    ...conceptsNavigationConfig,
]

export default navigationConfig
