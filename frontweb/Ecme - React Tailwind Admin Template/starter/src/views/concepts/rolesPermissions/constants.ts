import {
    TbUserCog,
    TbBox,
    TbListCheck,
    TbPackage,
    TbShieldCheck,
    TbBuildingSkyscraper,
    TbShoppingCart,
    TbCalendarStats,
    TbFiles,
    TbMessage,
} from 'react-icons/tb'
import type { ComponentType } from 'react'

export type AccessorItem = { label: string; value: string }

export type AccessModule = {
    id: string
    name: string
    description: string
    accessor: AccessorItem[]
}

export const accessModules: AccessModule[] = [
    {
        id: 'members',
        name: 'Member management',
        description: 'Access control for member operations',
        accessor: [
            { label: 'Read', value: 'members.read' },
            { label: 'Create', value: 'members.create' },
            { label: 'Update', value: 'members.update' },
            { label: 'Delete', value: 'members.delete' },
        ],
    },
    {
        id: 'departments',
        name: 'Departments',
        description: 'Access control for department management',
        accessor: [
            { label: 'Read', value: 'departments.read' },
            { label: 'Create', value: 'departments.create' },
            { label: 'Update', value: 'departments.update' },
            { label: 'Delete', value: 'departments.delete' },
        ],
    },
    {
        id: 'roles',
        name: 'Roles & Permissions',
        description: 'Access control for role management',
        accessor: [
            { label: 'Read', value: 'roles.read' },
            { label: 'Write', value: 'roles.write' },
        ],
    },
    {
        id: 'assets',
        name: 'Assets',
        description: 'Access control for asset operations',
        accessor: [
            { label: 'Read', value: 'assets.read' },
            { label: 'Write', value: 'assets.write' },
            { label: 'Delete', value: 'assets.delete' },
        ],
    },
    {
        id: 'work_orders',
        name: 'Work Orders',
        description: 'Access control for work order management',
        accessor: [
            { label: 'Read', value: 'work_orders.read' },
            { label: 'Write', value: 'work_orders.write' },
            { label: 'Assign', value: 'work_orders.assign' },
            { label: 'Delete', value: 'work_orders.delete' },
        ],
    },
    {
        id: 'pm_plans',
        name: 'PM Plans',
        description: 'Access control for preventive maintenance plans',
        accessor: [
            { label: 'Read', value: 'pm_plans.read' },
            { label: 'Write', value: 'pm_plans.write' },
            { label: 'Delete', value: 'pm_plans.delete' },
        ],
    },
    {
        id: 'inventory',
        name: 'Inventory',
        description: 'Access control for inventory management',
        accessor: [
            { label: 'Read', value: 'inventory.read' },
            { label: 'Write', value: 'inventory.write' },
            { label: 'Delete', value: 'inventory.delete' },
        ],
    },
    {
        id: 'purchasing',
        name: 'Purchasing',
        description: 'Access control for purchasing operations',
        accessor: [
            { label: 'Read', value: 'purchasing.read' },
            { label: 'Write', value: 'purchasing.write' },
            { label: 'Delete', value: 'purchasing.delete' },
        ],
    },
    {
        id: 'files',
        name: 'File Manager',
        description: 'Access to the file manager',
        accessor: [
            { label: 'Read', value: 'files.read' },
            { label: 'Write', value: 'files.write' },
        ],
    },
    {
        id: 'chat',
        name: 'Chat',
        description: 'Access to the chat',
        accessor: [
            { label: 'Read', value: 'chat.read' },
            { label: 'Write', value: 'chat.write' },
        ],
    },
]

export const moduleIcon: Record<string, ComponentType> = {
    members: TbUserCog,
    departments: TbBuildingSkyscraper,
    roles: TbShieldCheck,
    assets: TbBox,
    work_orders: TbListCheck,
    pm_plans: TbCalendarStats,
    inventory: TbPackage,
    purchasing: TbShoppingCart,
    files: TbFiles,
    chat: TbMessage,
}
