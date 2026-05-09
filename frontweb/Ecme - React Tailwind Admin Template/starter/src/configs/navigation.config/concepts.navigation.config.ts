import { CONCEPTS_PREFIX_PATH } from '@/constants/route.constant'
import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_COLLAPSE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import {
    ADMIN,
    HR,
    MANAGER,
    TECHNICIAN,
    SUPERADMIN,
} from '@/constants/roles.constant'
import type { NavigationTree } from '@/@types/navigation'

const ALL_COMPANY_ROLES = [ADMIN, HR, MANAGER, TECHNICIAN]
const ALL_ROLES = [SUPERADMIN, ADMIN, HR, MANAGER, TECHNICIAN]
const OPS_ROLES = [ADMIN, MANAGER, TECHNICIAN]
const ADMIN_MANAGER = [ADMIN, MANAGER]
const PEOPLE_MANAGERS = [SUPERADMIN, ADMIN, HR, MANAGER]

const conceptsNavigationConfig: NavigationTree[] = [
    // ─── GMAO ────────────────────────────────────────────────────────
    {
        key: 'gmao',
        path: '',
        title: 'GMAO',
        translateKey: 'nav.gmao',
        icon: 'concepts',
        type: NAV_ITEM_TYPE_TITLE,
        authority: ALL_COMPANY_ROLES,
        subMenu: [
            // Assets
            {
                key: 'concepts.assets',
                path: '',
                title: 'Assets',
                translateKey: 'nav.assets.assets',
                icon: 'assets',
                type: NAV_ITEM_TYPE_COLLAPSE,
                authority: OPS_ROLES,
                subMenu: [
                    {
                        key: 'concepts.assets.assetList',
                        path: `${CONCEPTS_PREFIX_PATH}/assets/asset-list`,
                        title: 'Asset List',
                        translateKey: 'nav.assets.assetList',
                        icon: 'assetList',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: OPS_ROLES,
                        subMenu: [],
                    },
                    {
                        key: 'concepts.assets.assetCreate',
                        path: `${CONCEPTS_PREFIX_PATH}/assets/asset-create`,
                        title: 'Add Asset',
                        translateKey: 'nav.assets.assetCreate',
                        icon: 'assetCreate',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: ADMIN_MANAGER,
                        subMenu: [],
                    },
                ],
            },

            // Work Orders
            {
                key: 'concepts.workOrders',
                path: '',
                title: 'Work Orders',
                translateKey: 'nav.workOrders.workOrders',
                icon: 'workOrders',
                type: NAV_ITEM_TYPE_COLLAPSE,
                authority: OPS_ROLES,
                subMenu: [
                    {
                        key: 'concepts.workOrders.workOrderList',
                        path: `${CONCEPTS_PREFIX_PATH}/work-orders/work-order-list`,
                        title: 'Work Order List',
                        translateKey: 'nav.workOrders.workOrderList',
                        icon: 'workOrderList',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: OPS_ROLES,
                        subMenu: [],
                    },
                    {
                        key: 'concepts.workOrders.workOrderCreate',
                        path: `${CONCEPTS_PREFIX_PATH}/work-orders/work-order-create`,
                        title: 'New Work Order',
                        translateKey: 'nav.workOrders.workOrderCreate',
                        icon: 'workOrderCreate',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: OPS_ROLES,
                        subMenu: [],
                    },
                ],
            },

            // Preventive Maintenance
            {
                key: 'concepts.pm',
                path: '',
                title: 'Preventive Maintenance',
                translateKey: 'nav.pm.pm',
                icon: 'pm',
                type: NAV_ITEM_TYPE_COLLAPSE,
                authority: ADMIN_MANAGER,
                subMenu: [
                    {
                        key: 'concepts.pm.pmList',
                        path: `${CONCEPTS_PREFIX_PATH}/pm/pm-list`,
                        title: 'PM Plans',
                        translateKey: 'nav.pm.pmList',
                        icon: 'pmList',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: ADMIN_MANAGER,
                        subMenu: [],
                    },
                    {
                        key: 'concepts.pm.pmCreate',
                        path: `${CONCEPTS_PREFIX_PATH}/pm/pm-create`,
                        title: 'New PM Plan',
                        translateKey: 'nav.pm.pmCreate',
                        icon: 'pmCreate',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: [ADMIN],
                        subMenu: [],
                    },
                ],
            },

            // Inventory
            {
                key: 'concepts.inventory',
                path: '',
                title: 'Inventory',
                translateKey: 'nav.inventory.inventory',
                icon: 'inventory',
                type: NAV_ITEM_TYPE_COLLAPSE,
                authority: OPS_ROLES,
                subMenu: [
                    {
                        key: 'concepts.inventory.items',
                        path: `${CONCEPTS_PREFIX_PATH}/inventory/items`,
                        title: 'Items',
                        translateKey: 'nav.inventory.items',
                        icon: 'inventoryItems',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: OPS_ROLES,
                        subMenu: [],
                    },
                    {
                        key: 'concepts.inventory.warehouses',
                        path: `${CONCEPTS_PREFIX_PATH}/inventory/warehouses`,
                        title: 'Warehouses',
                        translateKey: 'nav.inventory.warehouses',
                        icon: 'inventoryWarehouses',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: ADMIN_MANAGER,
                        subMenu: [],
                    },
                    {
                        key: 'concepts.inventory.stockMoves',
                        path: `${CONCEPTS_PREFIX_PATH}/inventory/stock-moves`,
                        title: 'Stock Moves',
                        translateKey: 'nav.inventory.stockMoves',
                        icon: 'inventoryStockMoves',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: OPS_ROLES,
                        subMenu: [],
                    },
                ],
            },

            // Purchasing
            {
                key: 'concepts.purchasing',
                path: '',
                title: 'Purchasing',
                translateKey: 'nav.purchasing.purchasing',
                icon: 'purchasing',
                type: NAV_ITEM_TYPE_COLLAPSE,
                authority: ADMIN_MANAGER,
                subMenu: [
                    {
                        key: 'concepts.purchasing.suppliers',
                        path: `${CONCEPTS_PREFIX_PATH}/purchasing/suppliers`,
                        title: 'Suppliers',
                        translateKey: 'nav.purchasing.suppliers',
                        icon: 'purchasingSuppliers',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: [ADMIN],
                        subMenu: [],
                    },
                    {
                        key: 'concepts.purchasing.purchaseOrders',
                        path: `${CONCEPTS_PREFIX_PATH}/purchasing/purchase-orders`,
                        title: 'Purchase Orders',
                        translateKey: 'nav.purchasing.purchaseOrders',
                        icon: 'purchasingOrders',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: ADMIN_MANAGER,
                        subMenu: [],
                    },
                    {
                        key: 'concepts.purchasing.receipts',
                        path: `${CONCEPTS_PREFIX_PATH}/purchasing/receipts`,
                        title: 'Receipts',
                        translateKey: 'nav.purchasing.receipts',
                        icon: 'purchasingReceipts',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: ADMIN_MANAGER,
                        subMenu: [],
                    },
                ],
            },
        ],
    },

    // ─── PEOPLE ──────────────────────────────────────────────────────
    {
        key: 'people',
        path: '',
        title: 'People',
        translateKey: 'nav.people',
        icon: 'customers',
        type: NAV_ITEM_TYPE_TITLE,
        authority: PEOPLE_MANAGERS,
        subMenu: [
            // Members
            {
                key: 'concepts.members',
                path: '',
                title: 'Members',
                translateKey: 'nav.members.members',
                icon: 'members',
                type: NAV_ITEM_TYPE_COLLAPSE,
                authority: PEOPLE_MANAGERS,
                subMenu: [
                    {
                        key: 'concepts.customers.customerList',
                        path: `${CONCEPTS_PREFIX_PATH}/customers/customer-list`,
                        title: 'Member List',
                        translateKey: 'nav.members.memberList',
                        icon: 'memberList',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: PEOPLE_MANAGERS,
                        subMenu: [],
                    },
                    {
                        key: 'concepts.customers.customerCreate',
                        path: `${CONCEPTS_PREFIX_PATH}/customers/customer-create`,
                        title: 'Add Member',
                        translateKey: 'nav.members.memberCreate',
                        icon: 'memberCreate',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: [SUPERADMIN, ADMIN, HR],
                        subMenu: [],
                    },
                ],
            },

            // Departments
            {
                key: 'concepts.departments',
                path: '',
                title: 'Departments',
                translateKey: 'nav.departments',
                icon: 'departments',
                type: NAV_ITEM_TYPE_COLLAPSE,
                authority: [ADMIN, HR, MANAGER],
                subMenu: [
                    {
                        key: 'concepts.departments.departmentList',
                        path: `${CONCEPTS_PREFIX_PATH}/departments`,
                        title: 'Department List',
                        translateKey: 'nav.departments.departmentList',
                        icon: 'memberList',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: [ADMIN, HR, MANAGER],
                        subMenu: [],
                    },
                    {
                        key: 'concepts.departments.departmentCreate',
                        path: `${CONCEPTS_PREFIX_PATH}/departments/department-create`,
                        title: 'Add Department',
                        translateKey: 'nav.departments.departmentCreate',
                        icon: 'memberCreate',
                        type: NAV_ITEM_TYPE_ITEM,
                        authority: [ADMIN, HR],
                        subMenu: [],
                    },
                ],
            },

            // Roles & Permissions
            {
                key: 'concepts.rolesPermissions',
                path: `${CONCEPTS_PREFIX_PATH}/roles-permissions`,
                title: 'Roles & Permissions',
                translateKey: 'nav.rolesPermissions',
                icon: 'rolesPermissions',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN],
                subMenu: [],
            },
        ],
    },

    // ─── WORKSPACE ───────────────────────────────────────────────────
    {
        key: 'workspace',
        path: '',
        title: 'Workspace',
        translateKey: 'nav.workspace',
        icon: 'fileManager',
        type: NAV_ITEM_TYPE_TITLE,
        authority: ALL_ROLES,
        subMenu: [
            {
                key: 'concepts.calendar',
                path: `${CONCEPTS_PREFIX_PATH}/calendar`,
                title: 'Calendar',
                translateKey: 'nav.calendar',
                icon: 'calendar',
                type: NAV_ITEM_TYPE_ITEM,
                authority: ALL_ROLES,
                subMenu: [],
            },
            {
                key: 'concepts.fileManager',
                path: `${CONCEPTS_PREFIX_PATH}/file-manager`,
                title: 'File Manager',
                translateKey: 'nav.fileManager',
                icon: 'fileManager',
                type: NAV_ITEM_TYPE_ITEM,
                authority: ALL_ROLES,
                subMenu: [],
            },
            {
                key: 'concepts.mail',
                path: `${CONCEPTS_PREFIX_PATH}/mail`,
                title: 'Mail',
                translateKey: 'nav.mail',
                icon: 'mail',
                type: NAV_ITEM_TYPE_ITEM,
                authority: ALL_ROLES,
                subMenu: [],
            },
            {
                key: 'concepts.chat',
                path: `${CONCEPTS_PREFIX_PATH}/chat`,
                title: 'Chat',
                translateKey: 'nav.chat',
                icon: 'chat',
                type: NAV_ITEM_TYPE_ITEM,
                authority: ALL_ROLES,
                subMenu: [],
            },
        ],
    },

    // ─── ACCOUNT ─────────────────────────────────────────────────────
    {
        key: 'account',
        path: '',
        title: 'Account',
        translateKey: 'nav.account',
        icon: 'account',
        type: NAV_ITEM_TYPE_TITLE,
        authority: ALL_ROLES,
        subMenu: [
            {
                key: 'concepts.account.settings',
                path: `${CONCEPTS_PREFIX_PATH}/account/settings`,
                title: 'Settings',
                translateKey: 'nav.account.settings',
                icon: 'accountSettings',
                type: NAV_ITEM_TYPE_ITEM,
                authority: ALL_ROLES,
                subMenu: [],
            },
        ],
    },
]

export default conceptsNavigationConfig
