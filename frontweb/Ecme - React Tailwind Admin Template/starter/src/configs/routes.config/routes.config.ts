import { lazy } from 'react'
import authRoute from './authRoute'
import othersRoute from './othersRoute'
import { SUPERADMIN } from '@/constants/roles.constant'
import type { Routes } from '@/@types/routes'

export const publicRoutes: Routes = [...authRoute]

const DrawerPlaceholder = lazy(() => import('@/views/demo/DrawerPlaceholder'))
const AssetList = lazy(() => import('@/views/concepts/assets/AssetList'))
const RolesPermissions = lazy(() => import('@/views/concepts/rolesPermissions/RolesPermissions'))
const AssetCreate = lazy(() => import('@/views/concepts/assets/AssetCreate'))
const AssetEdit = lazy(() => import('@/views/concepts/assets/AssetEdit'))
const AssetDetails = lazy(() => import('@/views/concepts/assets/AssetDetails'))
const SiteList = lazy(() => import('@/views/concepts/sites/SiteList'))
const TeamList = lazy(() => import('@/views/concepts/teams/TeamList'))
const SiteCreate = lazy(() => import('@/views/concepts/sites/SiteCreate'))
const SiteEdit = lazy(() => import('@/views/concepts/sites/SiteEdit'))
const WorkOrderList = lazy(() => import('@/views/concepts/workOrders/WorkOrderList'))
const WorkOrderCreate = lazy(() => import('@/views/concepts/workOrders/WorkOrderCreate'))
const WorkOrderEdit = lazy(() => import('@/views/concepts/workOrders/WorkOrderEdit'))
const WorkOrderDetails = lazy(() => import('@/views/concepts/workOrders/WorkOrderDetails'))
const WorkOrderBoard = lazy(() => import('@/views/concepts/workOrders/WorkOrderBoard'))
const ItemList = lazy(() => import('@/views/concepts/inventory/ItemList/ItemList'))
const ItemCreate = lazy(() => import('@/views/concepts/inventory/ItemCreate/ItemCreate'))
const ItemEdit = lazy(() => import('@/views/concepts/inventory/ItemEdit/ItemEdit'))
const ItemDetails = lazy(() => import('@/views/concepts/inventory/ItemDetails/ItemDetails'))
const WarehouseList = lazy(() => import('@/views/concepts/inventory/WarehouseList/WarehouseList'))
const WarehouseCreate = lazy(() => import('@/views/concepts/inventory/WarehouseCreate/WarehouseCreate'))
const WarehouseEdit = lazy(() => import('@/views/concepts/inventory/WarehouseEdit/WarehouseEdit'))
const WarehouseDetails = lazy(() => import('@/views/concepts/inventory/WarehouseDetails/WarehouseDetails'))
const StockMoveList = lazy(() => import('@/views/concepts/inventory/StockMoveList/StockMoveList'))
const PmPlanList = lazy(() => import('@/views/concepts/pm/PmPlanList/PmPlanList'))
const PmPlanCreate = lazy(() => import('@/views/concepts/pm/PmPlanCreate/PmPlanCreate'))
const PmPlanEdit = lazy(() => import('@/views/concepts/pm/PmPlanEdit/PmPlanEdit'))
const PmPlanDetails = lazy(() => import('@/views/concepts/pm/PmPlanDetails/PmPlanDetails'))
const Reports = lazy(() => import('@/views/concepts/reports/Reports'))
const RequestList = lazy(() => import('@/views/concepts/requests/RequestList'))
const RequestCreate = lazy(() => import('@/views/concepts/requests/RequestCreate'))
const RequestDetails = lazy(() => import('@/views/concepts/requests/RequestDetails'))
const SupplierList = lazy(() => import('@/views/concepts/purchasing/SupplierList/SupplierList'))
const PurchaseOrderList = lazy(() => import('@/views/concepts/purchasing/PurchaseOrderList/PurchaseOrderList'))
const PurchaseOrderCreate = lazy(() => import('@/views/concepts/purchasing/PurchaseOrderCreate/PurchaseOrderCreate'))
const PurchaseOrderEdit = lazy(() => import('@/views/concepts/purchasing/PurchaseOrderEdit/PurchaseOrderEdit'))
const PurchaseOrderDetails = lazy(() => import('@/views/concepts/purchasing/PurchaseOrderDetails/PurchaseOrderDetails'))
const ReceiptList = lazy(() => import('@/views/concepts/purchasing/ReceiptList/ReceiptList'))
const EcommerceDashboard = lazy(() => import('@/views/dashboards/EcommerceDashboard'))
const Calendar = lazy(() => import('@/views/concepts/calendar/Calendar'))
const FileManager = lazy(() => import('@/views/concepts/files/FileManager'))
const ChatPage = lazy(() => import('@/views/concepts/chat/Chat'))
const Mail = lazy(() => import('@/views/concepts/mail/Mail'))
const CustomerDetails = lazy(() => import('@/views/concepts/customers/CustomerDetails'))

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
        component: CustomerDetails,
        authority: ['members.read'],
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
        key: 'concepts.chat',
        path: '/concepts/chat',
        component: ChatPage,
        authority: [],
        meta: {
            pageContainerType: 'gutterless',
            pageBackgroundType: 'plain',
        },
    },
    {
        key: 'concepts.fileManager',
        path: '/concepts/file-manager',
        component: FileManager,
        authority: ['files.read'],
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
        key: 'others.landing',
        path: '/others/landing',
        component: DrawerPlaceholder,
        authority: [],
    },
    // GMAO placeholder routes
    {
        key: 'concepts.workOrders.workOrderList',
        path: '/concepts/work-orders/work-order-list',
        component: WorkOrderList,
        authority: ['work_orders.read'],
    },
    {
        key: 'concepts.workOrders.workOrderCreate',
        path: '/concepts/work-orders/work-order-create',
        component: WorkOrderCreate,
        authority: ['work_orders.write'],
    },
    {
        key: 'concepts.workOrders.workOrderEdit',
        path: '/concepts/work-orders/work-order-edit/:id',
        component: WorkOrderEdit,
        authority: ['work_orders.write'],
    },
    {
        key: 'concepts.workOrders.workOrderDetails',
        path: '/concepts/work-orders/work-order-details/:id',
        component: WorkOrderDetails,
        authority: ['work_orders.read'],
    },
    {
        key: 'concepts.workOrders.workOrderBoard',
        path: '/concepts/work-orders/work-order-board',
        component: WorkOrderBoard,
        authority: ['work_orders.read'],
    },
    {
        key: 'concepts.pm.pmList',
        path: '/concepts/pm/pm-list',
        component: PmPlanList,
        authority: ['pm_plans.read'],
    },
    {
        key: 'concepts.pm.pmCreate',
        path: '/concepts/pm/pm-create',
        component: PmPlanCreate,
        authority: ['pm_plans.write'],
    },
    {
        key: 'concepts.pm.pmDetails',
        path: '/concepts/pm/pm-details/:id',
        component: PmPlanDetails,
        authority: ['pm_plans.read'],
    },
    {
        key: 'concepts.pm.pmEdit',
        path: '/concepts/pm/pm-edit/:id',
        component: PmPlanEdit,
        authority: ['pm_plans.write'],
    },
    {
        key: 'concepts.inventory.items',
        path: '/concepts/inventory/items',
        component: ItemList,
        authority: ['inventory.read'],
    },
    {
        key: 'concepts.inventory.items.itemCreate',
        path: '/concepts/inventory/items/item-create',
        component: ItemCreate,
        authority: ['inventory.write'],
    },
    {
        key: 'concepts.inventory.items.itemEdit',
        path: '/concepts/inventory/items/item-edit/:id',
        component: ItemEdit,
        authority: ['inventory.write'],
    },
    {
        key: 'concepts.inventory.items.itemDetails',
        path: '/concepts/inventory/items/item-details/:id',
        component: ItemDetails,
        authority: ['inventory.read'],
    },
    {
        key: 'concepts.inventory.warehouses',
        path: '/concepts/inventory/warehouses',
        component: WarehouseList,
        authority: ['inventory.write'],
    },
    {
        key: 'concepts.inventory.warehouses.warehouseCreate',
        path: '/concepts/inventory/warehouses/warehouse-create',
        component: WarehouseCreate,
        authority: ['inventory.write'],
    },
    {
        key: 'concepts.inventory.warehouses.warehouseEdit',
        path: '/concepts/inventory/warehouses/warehouse-edit/:id',
        component: WarehouseEdit,
        authority: ['inventory.write'],
    },
    {
        key: 'concepts.inventory.warehouses.warehouseDetails',
        path: '/concepts/inventory/warehouses/warehouse-details/:id',
        component: WarehouseDetails,
        authority: ['inventory.read'],
    },
    {
        key: 'concepts.inventory.stockMoves',
        path: '/concepts/inventory/stock-moves',
        component: StockMoveList,
        authority: ['inventory.write'],
    },
    {
        key: 'concepts.reports',
        path: '/concepts/reports',
        component: Reports,
        authority: ['work_orders.read'],
    },
    {
        key: 'concepts.requests.requestList',
        path: '/concepts/requests/request-list',
        component: RequestList,
        authority: ['work_orders.read'],
    },
    {
        key: 'concepts.requests.requestCreate',
        path: '/concepts/requests/request-create',
        component: RequestCreate,
        authority: ['work_orders.read'],
    },
    {
        key: 'concepts.requests.requestDetails',
        path: '/concepts/requests/request-details/:id',
        component: RequestDetails,
        authority: ['work_orders.read'],
    },
    {
        key: 'concepts.purchasing.suppliers',
        path: '/concepts/purchasing/suppliers',
        component: SupplierList,
        authority: ['purchasing.read'],
    },
    {
        key: 'concepts.purchasing.purchaseOrders',
        path: '/concepts/purchasing/purchase-orders',
        component: PurchaseOrderList,
        authority: ['purchasing.read'],
    },
    {
        key: 'concepts.purchasing.purchaseOrderCreate',
        path: '/concepts/purchasing/purchase-orders/create',
        component: PurchaseOrderCreate,
        authority: ['purchasing.write'],
        meta: {
            header: {
                title: 'Create order',
                contained: true,
                description: 'Create new purchase orders quickly and accurately',
            },
            footer: false,
        },
    },
    {
        key: 'concepts.purchasing.purchaseOrderEdit',
        path: '/concepts/purchasing/purchase-orders/edit/:id',
        component: PurchaseOrderEdit,
        authority: ['purchasing.write'],
        meta: {
            header: {
                title: 'Edit order',
                contained: true,
            },
            footer: false,
        },
    },
    {
        key: 'concepts.purchasing.purchaseOrderDetails',
        path: '/concepts/purchasing/purchase-orders/:id',
        component: PurchaseOrderDetails,
        authority: ['purchasing.read'],
        meta: {
            header: {
                contained: true,
                title: lazy(
                    () => import('@/views/concepts/purchasing/PurchaseOrderDetails/components/PoDetailHeader'),
                ),
                extraHeader: lazy(
                    () => import('@/views/concepts/purchasing/PurchaseOrderDetails/components/PoDetailHeaderExtra'),
                ),
            },
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.purchasing.receipts',
        path: '/concepts/purchasing/receipts',
        component: ReceiptList,
        authority: ['purchasing.read'],
    },
    {
        key: 'concepts.teams',
        path: '/concepts/teams',
        component: TeamList,
        authority: ['teams.read'],
    },
    {
        key: 'concepts.rolesPermissions',
        path: '/concepts/roles-permissions',
        component: RolesPermissions,
        authority: ['roles.read'],
        meta: {
            pageBackgroundType: 'plain',
        },
    },
]

export const protectedRoutes: Routes = [
    {
        key: 'home',
        path: '/dashboard',
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
        key: 'superadmin.users',
        path: '/superadmin/users',
        component: lazy(() => import('@/views/concepts/superadmin/UserList')),
        authority: [SUPERADMIN],
        meta: { header: { title: 'All Users' } },
    },
    {
        key: 'concepts.company.companyList',
        path: '/concepts/company/company-list',
        component: lazy(() => import('@/views/concepts/company/CompanyList')),
        authority: [SUPERADMIN],
    },
    {
        key: 'concepts.company.companyEdit',
        path: '/concepts/company/company-edit/:id',
        component: lazy(() => import('@/views/concepts/company/CompanyEdit')),
        authority: [SUPERADMIN],
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
        authority: [SUPERADMIN],
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
        authority: [SUPERADMIN],
    },
    {
        key: 'concepts.customers.customerList',
        path: '/concepts/customers/customer-list',
        component: lazy(() => import('@/views/concepts/customers/CustomerList')),
        authority: ['members.read'],
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
        authority: ['members.create'],
    },
    {
        key: 'concepts.sites',
        path: '/concepts/sites',
        component: SiteList,
        authority: ['sites.read'],
    },
    {
        key: 'concepts.sites.siteCreate',
        path: '/concepts/sites/site-create',
        component: SiteCreate,
        authority: ['sites.create'],
    },
    {
        key: 'concepts.sites.siteEdit',
        path: '/concepts/sites/site-edit/:id',
        component: SiteEdit,
        authority: ['sites.update'],
    },
    {
        key: 'concepts.assets.assetList',
        path: '/concepts/assets/asset-list',
        component: AssetList,
        authority: ['assets.read'],
    },
    {
        key: 'concepts.assets.assetCreate',
        path: '/concepts/assets/asset-create',
        component: AssetCreate,
        authority: ['assets.write'],
    },
    {
        key: 'concepts.assets.assetEdit',
        path: '/concepts/assets/asset-edit/:id',
        component: AssetEdit,
        authority: ['assets.write'],
    },
    {
        key: 'concepts.assets.assetDetails',
        path: '/concepts/assets/asset-details/:id',
        component: AssetDetails,
        authority: ['assets.read'],
    },
    {
        key: 'concepts.account.settings',
        path: '/concepts/account/settings',
        component: lazy(() => import('@/views/concepts/accounts/Settings')),
        authority: [],
        meta: {
            header: {
                title: 'nav.account.settings',
            },
            pageContainerType: 'contained',
        },
    },
    ...placeholderRoutes,
    ...othersRoute,
]

