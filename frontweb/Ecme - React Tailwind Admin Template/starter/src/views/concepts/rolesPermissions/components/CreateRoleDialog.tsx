import { useRef, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import ScrollBar from '@/components/ui/ScrollBar'
import Segment from '@/components/ui/Segment'
import { FormItem } from '@/components/ui/Form'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import classNames from '@/utils/classNames'
import isLastChild from '@/utils/isLastChild'
import { apiCreateRole } from '@/services/RolesService'
import { accessModules, moduleIcon } from '../constants'
import { TbCheck } from 'react-icons/tb'
import type { KeyedMutator } from 'swr'
import type { RolesResponse } from '@/services/RolesService'

type CreateRoleDialogProps = {
    isOpen: boolean
    onClose: () => void
    mutate: KeyedMutator<RolesResponse>
}

const CreateRoleDialog = ({ isOpen, onClose, mutate }: CreateRoleDialogProps) => {
    const roleNameRef = useRef<HTMLInputElement>(null)
    const descriptionRef = useRef<HTMLTextAreaElement>(null)
    const [selectedPerms, setSelectedPerms] = useState<Record<string, string[]>>({})
    const [submitting, setSubmitting] = useState(false)

    const handlePermChange = (values: string[], moduleId: string) => {
        setSelectedPerms((prev) => ({ ...prev, [moduleId]: values }))
    }

    const handleClose = () => {
        setSelectedPerms({})
        onClose()
    }

    const handleSubmit = async () => {
        const label = roleNameRef.current?.value?.trim()
        if (!label) {
            toast.push(
                <Notification type="danger">Role name is required.</Notification>,
                { placement: 'top-center' },
            )
            return
        }

        const permissions = Object.values(selectedPerms).flat()
        if (permissions.length === 0) {
            toast.push(
                <Notification type="danger">
                    Select at least one permission.
                </Notification>,
                { placement: 'top-center' },
            )
            return
        }

        setSubmitting(true)
        try {
            await apiCreateRole({
                label,
                description: descriptionRef.current?.value?.trim() || null,
                permissions,
            })
            await mutate()
            toast.push(
                <Notification type="success">
                    Role &quot;{label}&quot; created successfully.
                </Notification>,
                { placement: 'top-center' },
            )
            handleClose()
        } catch {
            toast.push(
                <Notification type="danger">
                    Failed to create role. The name may already exist.
                </Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            width={900}
            onClose={handleClose}
            onRequestClose={handleClose}
        >
            <h4>Create role</h4>
            <ScrollBar className="mt-6 max-h-[600px] overflow-y-auto">
                <div className="px-4">
                    <FormItem label="Role name">
                        <Input ref={roleNameRef} placeholder="e.g. Supervisor" />
                    </FormItem>
                    <FormItem label="Description">
                        <Input
                            ref={descriptionRef}
                            textArea
                            placeholder="Describe what this role can do..."
                            rows={2}
                        />
                    </FormItem>
                    <span className="font-semibold">Permission</span>

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
                                    icon={(() => { const Icon = moduleIcon[module.id]; return Icon ? <Icon /> : null })()}
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
                                        handlePermChange(val as string[], module.id)
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
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            loading={submitting}
                            onClick={handleSubmit}
                        >
                            Create
                        </Button>
                    </div>
                </div>
            </ScrollBar>
        </Dialog>
    )
}

export default CreateRoleDialog
