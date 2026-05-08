import { lazy } from 'react'
import authRoute from './authRoute'
import othersRoute from './othersRoute'
import { SUPERADMIN } from '@/constants/roles.constant'
import type { Routes } from '@/@types/routes'

export const publicRoutes: Routes = [...authRoute]

const DrawerPlaceholder = lazy(() => import('@/views/demo/DrawerPlaceholder'))
const EcommerceDashboard = lazy(() => import('@/views/dashboards/EcommerceDashboard'))
const Calendar = lazy(() => import('@/views/concepts/calendar/Calendar'))
const FileManager = lazy(() => import('@/views/concepts/files/FileManager'))
const Mail = lazy(() => import('@/views/concepts/mail/Mail'))
const Chat = lazy(() => import('@/views/concepts/chat/Chat'))

const placeholderRoutes: Routes = [
    {
        key: 'dashboard.ecommerce',
        path: '/dashboards/ecommerce',
        component: EcommerceDashboard,
        authority: [],
    },
    {
        key: 'dashboard.project',
        path: '/dashboards/project',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'dashboard.marketing',
        path: '/dashboards/marketing',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'dashboard.analytic',
        path: '/dashboards/analytic',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.ai.chat',
        path: '/concepts/ai/chat',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.ai.image',
        path: '/concepts/ai/image',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.projects.scrumBoard',
        path: '/concepts/projects/scrum-board',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.projects.projectList',
        path: '/concepts/projects/project-list',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.projects.projectDetails',
        path: '/concepts/projects/project-details/:id',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.projects.projectTasks',
        path: '/concepts/projects/tasks',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.projects.projectIssue',
        path: '/concepts/projects/tasks/:id',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.customers.customerDetails',
        path: '/concepts/customers/customer-details/:id',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.products.productList',
        path: '/concepts/products/product-list',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.products.productEdit',
        path: '/concepts/products/product-edit/:id',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.products.productCreate',
        path: '/concepts/products/product-create',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.products.productDetails',
        path: '/concepts/products/product-details/:id',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.orders.orderList',
        path: '/concepts/orders/order-list',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.orders.orderEdit',
        path: '/concepts/orders/order-edit/:id',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.orders.orderCreate',
        path: '/concepts/orders/order-create',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.orders.orderDetails',
        path: '/concepts/orders/order-details/:id',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.account.activityLog',
        path: '/concepts/account/activity-log',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.account.rolesPermissions',
        path: '/concepts/account/roles-permissions',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.account.pricing',
        path: '/concepts/account/pricing',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.helpCenter.supportHub',
        path: '/concepts/help-center/support-hub',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.helpCenter.article',
        path: '/concepts/help-center/article/:id',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.helpCenter.editArticle',
        path: '/concepts/help-center/edit-article/:id',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.helpCenter.manageArticle',
        path: '/concepts/help-center/manage-article',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.calendar',
        path: '/concepts/calendar',
        component: Calendar,
        authority: [],
    },
    {
        key: 'concepts.fileManager',
        path: '/concepts/file-manager',
        component: FileManager,
        authority: [],
        meta: {
            pageContainerType: 'contained',
            pageBackgroundType: 'plain',
        },
    },
    {
        key: 'concepts.mail',
        path: '/concepts/mail',
        component: Mail,
        authority: [],
    },
    {
        key: 'concepts.chat',
        path: '/concepts/chat',
        component: Chat,
        authority: [],
    },
    {
        key: 'others.landing',
        path: '/others/landing',
        component: DrawerPlaceholder,
        authority: [],
    },
    // GMAO placeholder routes
    {
        key: 'concepts.assets.assetList',
        path: '/concepts/assets/asset-list',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.assets.assetCreate',
        path: '/concepts/assets/asset-create',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.workOrders.workOrderList',
        path: '/concepts/work-orders/work-order-list',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.workOrders.workOrderCreate',
        path: '/concepts/work-orders/work-order-create',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.pm.pmList',
        path: '/concepts/pm/pm-list',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.pm.pmCreate',
        path: '/concepts/pm/pm-create',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.inventory.items',
        path: '/concepts/inventory/items',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.inventory.warehouses',
        path: '/concepts/inventory/warehouses',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.inventory.stockMoves',
        path: '/concepts/inventory/stock-moves',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.purchasing.suppliers',
        path: '/concepts/purchasing/suppliers',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.purchasing.purchaseOrders',
        path: '/concepts/purchasing/purchase-orders',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.purchasing.receipts',
        path: '/concepts/purchasing/receipts',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.departments',
        path: '/concepts/departments',
        component: DrawerPlaceholder,
        authority: [],
    },
    {
        key: 'concepts.rolesPermissions',
        path: '/concepts/roles-permissions',
        component: DrawerPlaceholder,
        authority: [],
    },
]

export const protectedRoutes: Routes = [
    {
        key: 'home',
        path: '/home',
        component: lazy(() => import('@/views/Home')),
        authority: [],
    },
    {
        key: 'onboarding.companySetup',
        path: '/company-setup',
        component: lazy(() => import('@/views/onboarding/CompanySetup')),
        authority: [],
    },
    {
        key: 'onboarding.companyPending',
        path: '/company-pending',
        component: lazy(() => import('@/views/onboarding/CompanyPending')),
        authority: [],
    },
    {
        key: 'superadmin.dashboard',
        path: '/superadmin/dashboard',
        component: lazy(() => import('@/views/SuperadminDashboard')),
        authority: [SUPERADMIN],
    },
    {
        key: 'concepts.company.companyList',
        path: '/concepts/company/company-list',
        component: lazy(() => import('@/views/concepts/company/CompanyList')),
        authority: [],
    },
    {
        key: 'concepts.company.companyEdit',
        path: '/concepts/company/company-edit/:id',
        component: lazy(() => import('@/views/concepts/company/CompanyEdit')),
        authority: [],
        meta: {
            header: {
                title: 'Edit company',
            },
        },
    },
    {
        key: 'concepts.company.companyCreate',
        path: '/concepts/company/company-create',
        component: lazy(() => import('@/views/concepts/company/CompanyCreate')),
        authority: [],
        meta: {
            header: {
                title: 'Create company',
            },
        },
    },
    {
        key: 'concepts.company.companyDetails',
        path: '/concepts/company/company-details/:id',
        component: lazy(() => import('@/views/concepts/company/CompanyDetails')),
        authority: [],
    },
    {
        key: 'concepts.customers.customerList',
        path: '/concepts/customers/customer-list',
        component: lazy(() => import('@/views/concepts/customers/CustomerList')),
        authority: [],
    },
    {
        key: 'concepts.customers.customerEdit',
        path: '/concepts/customers/customer-edit/:id',
        component: lazy(() => import('@/views/concepts/customers/CustomerEdit')),
        authority: [],
    },
    {
        key: 'concepts.customers.customerCreate',
        path: '/concepts/customers/customer-create',
        component: lazy(() => import('@/views/concepts/customers/CustomerCreate')),
        authority: [],
    },
    {
        key: 'concepts.account.settings',
        path: '/concepts/account/settings',
        component: lazy(() => import('@/views/concepts/accounts/Settings')),
        authority: [],
        meta: {
            header: {
                title: 'Settings',
            },
            pageContainerType: 'contained',
        },
    },
    ...placeholderRoutes,
    ...othersRoute,
]

