import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import ScrollBar from '@/components/ui/ScrollBar'
import Segment from '@/components/ui/Segment'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import classNames from '@/utils/classNames'
import isLastChild from '@/utils/isLastChild'
import { apiUpdateRole, apiDeleteRole } from '@/services/RolesService'
import { accessModules, moduleIcon } from '../constants'
import { TbCheck, TbTrash } from 'react-icons/tb'
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
    const [label, setLabel] = useState('')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (!role) return
        setLabel(role.label)
        setDescription(role.description ?? '')
        setConfirmDelete(false)
        const initial: Record<string, string[]> = {}
        accessModules.forEach((module) => {
            initial[module.id] = module.accessor
                .filter((a) => role.permissions.some((p) => p.code === a.value))
                .map((a) => a.value)
        })
        setSelectedPerms(initial)
    }, [role])

    const handleClose = () => {
        setConfirmDelete(false)
        onClose()
    }

    const handleUpdate = async () => {
        if (!role) return
        const permissions = Object.values(selectedPerms).flat()
        setSubmitting(true)
        try {
            await apiUpdateRole(role.id, {
                label: label.trim() || role.label,
                description: description.trim() || null,
                permissions,
            })
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

    const handleDelete = async () => {
        if (!role) return
        setDeleting(true)
        try {
            await apiDeleteRole(role.id)
            await mutate()
            toast.push(
                <Notification type="success">
                    Role "{role.label}" deleted successfully.
                </Notification>,
                { placement: 'top-center' },
            )
            handleClose()
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to delete role.'
            toast.push(
                <Notification type="danger">{msg}</Notification>,
                { placement: 'top-center' },
            )
            setConfirmDelete(false)
        } finally {
            setDeleting(false)
        }
    }

    const isSystem = role?.is_system ?? true

    return (
        <Dialog
            isOpen={!!role}
            width={900}
            onClose={handleClose}
            onRequestClose={handleClose}
        >
            {/* Header: editable name + description for custom roles */}
            <div className="mb-2">
                {isSystem ? (
                    <>
                        <h4>{role?.label}</h4>
                        {role?.description && (
                            <p className="mt-1 text-gray-500 dark:text-gray-400">
                                {role.description}
                            </p>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col gap-2">
                        <Input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Role name"
                            className="font-semibold text-lg"
                        />
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description (optional)"
                            textArea
                            rows={2}
                        />
                    </div>
                )}
            </div>

            <ScrollBar className="mt-6 max-h-[500px] overflow-y-auto">
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

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                        {/* Delete section — only for custom roles */}
                        {!isSystem ? (
                            confirmDelete ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-red-500 font-medium">
                                        Delete this role?
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="solid"
                                        customColorClass={() =>
                                            'bg-red-500 hover:bg-red-600 text-white border-red-500'
                                        }
                                        loading={deleting}
                                        onClick={handleDelete}
                                    >
                                        Yes, delete
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="plain"
                                        onClick={() => setConfirmDelete(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="plain"
                                    icon={<TbTrash />}
                                    customColorClass={() =>
                                        'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-transparent'
                                    }
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    Delete role
                                </Button>
                            )
                        ) : (
                            <span />
                        )}

                        <div className="flex items-center gap-2">
                            <Button variant="plain" onClick={handleClose}>
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
                </div>
            </ScrollBar>
        </Dialog>
    )
}

export default RolePermissionsDialog
