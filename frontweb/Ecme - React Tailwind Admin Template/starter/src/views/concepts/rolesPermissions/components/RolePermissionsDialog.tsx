import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import ScrollBar from '@/components/ui/ScrollBar'
import Segment from '@/components/ui/Segment'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import classNames from '@/utils/classNames'
import isLastChild from '@/utils/isLastChild'
import { apiUpdateRole } from '@/services/RolesService'
import { accessModules, moduleIcon } from '../constants'
import { TbCheck } from 'react-icons/tb'
import type { KeyedMutator } from 'swr'
import type { Role, RolesResponse } from '@/services/RolesService'

type RolePermissionsDialogProps = {
    role: Role | null
    onClose: () => void
    mutate: KeyedMutator<RolesResponse>
}

const RolePermissionsDialog = ({
    role,
    onClose,
    mutate,
}: RolePermissionsDialogProps) => {
    const { t } = useTranslation()
    const [selectedPerms, setSelectedPerms] = useState<Record<string, string[]>>({})
    const [submitting, setSubmitting] = useState(false)

    // Initialise selections whenever the role changes
    useEffect(() => {
        if (!role) return
        const initial: Record<string, string[]> = {}
        accessModules.forEach((module) => {
            initial[module.id] = module.accessor
                .filter((a) => role.permissions.some((p) => p.code === a.value))
                .map((a) => a.value)
        })
        setSelectedPerms(initial)
    }, [role])

    const handleClose = () => {
        onClose()
    }

    const handleUpdate = async () => {
        if (!role) return
        const permissions = Object.values(selectedPerms).flat()
        setSubmitting(true)
        try {
            await apiUpdateRole(role.id, { permissions })
            await mutate()
            toast.push(
                <Notification type="success">
                    {t('rolesPermissions.toast.roleUpdated', { label: role.label })}
                </Notification>,
                { placement: 'top-center' },
            )
            handleClose()
        } catch {
            toast.push(
                <Notification type="danger">
                    {t('rolesPermissions.toast.roleUpdateFailed')}
                </Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog
            isOpen={!!role}
            width={900}
            onClose={handleClose}
            onRequestClose={handleClose}
        >
            <h4>{role?.label}</h4>
            {role?.description && (
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                    {role.description}
                </p>
            )}
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
                                    icon={(() => {
                                        const Icon = moduleIcon[module.id]
                                        return Icon ? <Icon /> : null
                                    })()}
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
                                    value={selectedPerms[module.id] ?? []}
                                    onChange={(val) =>
                                        setSelectedPerms((prev) => ({
                                            ...prev,
                                            [module.id]: val as string[],
                                        }))
                                    }
                                >
                                    {module.accessor.map((access) => (
                                        <Segment.Item
                                            key={module.id + access.value}
                                            value={access.value}
                                        >
                                            {({ active, onSegmentItemClick }) => (
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
                                                    onClick={onSegmentItemClick}
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
                            onClick={handleClose}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="solid"
                            loading={submitting}
                            onClick={handleUpdate}
                        >
                            {t('common.update')}
                        </Button>
                    </div>
                </div>
            </ScrollBar>
        </Dialog>
    )
}

export default RolePermissionsDialog
