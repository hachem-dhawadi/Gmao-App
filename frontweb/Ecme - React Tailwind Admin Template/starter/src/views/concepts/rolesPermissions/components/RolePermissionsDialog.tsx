import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import ScrollBar from '@/components/ui/ScrollBar'
import Segment from '@/components/ui/Segment'
import classNames from '@/utils/classNames'
import isLastChild from '@/utils/isLastChild'
import {
    TbUserCog,
    TbBox,
    TbSettings,
    TbListCheck,
    TbPackage,
    TbShieldCheck,
    TbBuildingSkyscraper,
    TbShoppingCart,
    TbCheck,
} from 'react-icons/tb'
import type { Role } from '@/services/RolesService'
import type { ReactNode } from 'react'

type AccessModule = {
    id: string
    name: string
    description: string
    accessor: { label: string; value: string }[]
}

const accessModules: AccessModule[] = [
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
            { label: 'Delete', value: 'work_orders.delete' },
            { label: 'Assign', value: 'work_orders.assign' },
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
        id: 'roles',
        name: 'Roles & Permissions',
        description: 'Access control for role management',
        accessor: [{ label: 'Read', value: 'roles.read' }],
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
]

const moduleIcon: Record<string, ReactNode> = {
    members: <TbUserCog />,
    departments: <TbBuildingSkyscraper />,
    assets: <TbBox />,
    work_orders: <TbListCheck />,
    inventory: <TbPackage />,
    roles: <TbShieldCheck />,
    purchasing: <TbShoppingCart />,
    configurations: <TbSettings />,
}

type RolePermissionsDialogProps = {
    role: Role | null
    onClose: () => void
}

const RolePermissionsDialog = ({ role, onClose }: RolePermissionsDialogProps) => {
    const permissionCodes = new Set(role?.permissions.map((p) => p.code) ?? [])

    return (
        <Dialog
            isOpen={!!role}
            width={900}
            onClose={onClose}
            onRequestClose={onClose}
        >
            <h4>{role?.label}</h4>
            <ScrollBar className="mt-6 max-h-[600px] overflow-y-auto">
                <div className="px-4">
                    {accessModules.map((module, index) => (
                        <div
                            key={module.id}
                            className={classNames(
                                'flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 border-gray-200 dark:border-gray-600',
                                !isLastChild(accessModules, index) && 'border-b',
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <Avatar
                                    className="bg-transparent dark:bg-transparent p-2 border-2 border-gray-200 dark:border-gray-600 text-primary"
                                    size={50}
                                    icon={moduleIcon[module.id]}
                                    shape="round"
                                />
                                <div>
                                    <h6 className="font-bold">{module.name}</h6>
                                    <span>{module.description}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Segment
                                    className="bg-transparent dark:bg-transparent"
                                    selectionType="multiple"
                                    value={module.accessor
                                        .filter((a) => permissionCodes.has(a.value))
                                        .map((a) => a.value)}
                                >
                                    {module.accessor.map((access) => (
                                        <Segment.Item
                                            key={module.id + access.value}
                                            value={access.value}
                                        >
                                            {({ active }) => (
                                                <Button
                                                    variant="default"
                                                    icon={
                                                        active ? (
                                                            <TbCheck className="text-primary text-xl" />
                                                        ) : (
                                                            <></>
                                                        )
                                                    }
                                                    active={active}
                                                    type="button"
                                                    className="md:min-w-[100px]"
                                                    size="sm"
                                                    customColorClass={({ active }) =>
                                                        classNames(
                                                            active &&
                                                                'bg-transparent dark:bg-transparent text-primary border-primary ring-1 ring-primary',
                                                        )
                                                    }
                                                >
                                                    {access.label}
                                                </Button>
                                            )}
                                        </Segment.Item>
                                    ))}
                                </Segment>
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-end mt-6">
                        <Button
                            className="ltr:mr-2 rtl:ml-2"
                            variant="plain"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button variant="solid" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </ScrollBar>
        </Dialog>
    )
}

export default RolePermissionsDialog
