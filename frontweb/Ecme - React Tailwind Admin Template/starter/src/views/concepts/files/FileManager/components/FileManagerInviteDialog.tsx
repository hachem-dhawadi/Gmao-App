import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Avatar from '@/components/ui/Avatar'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useFileManagerStore } from '../store/useFileManagerStore'
import { apiShareFile, apiShareDirectory } from '@/services/FileService'
import { apiGetMembersList } from '@/services/MembersService'
import useSWR from 'swr'

type MemberOption = {
    value: number
    label: string
    email: string
}

type Props = {
    onShared?: () => void
}

const FileManagerInviteDialog = ({ onShared }: Props) => {
    const { t } = useTranslation()
    const { inviteDialog, setInviteDialog, fileList } = useFileManagerStore()

    const [selected, setSelected] = useState<MemberOption[]>([])
    const [saving, setSaving] = useState(false)
    const [prePopulated, setPrePopulated] = useState(false)

    const { data: membersResp } = useSWR(
        inviteDialog.open ? '/members-for-share' : null,
        () => apiGetMembersList({ per_page: 200 }),
    )

    const memberOptions: MemberOption[] = useMemo(() => {
        return (
            membersResp?.data?.members?.map((m) => ({
                value: m.id,
                label: m.user?.name ?? `Member #${m.id}`,
                email: m.user?.email ?? '',
            })) ?? []
        )
    }, [membersResp])

    const currentFile = useMemo(
        () => fileList.find((f) => f.id === inviteDialog.id),
        [fileList, inviteDialog.id],
    )

    // Pre-populate selected with already-shared members once member options load.
    // Runs once per dialog open so the user's manual changes aren't overwritten.
    useEffect(() => {
        if (!inviteDialog.open || prePopulated || memberOptions.length === 0 || !currentFile) return
        setSelected(
            memberOptions.filter((opt) =>
                currentFile.permissions.some((p) => p.memberId === opt.value),
            ),
        )
        setPrePopulated(true)
    }, [inviteDialog.open, prePopulated, memberOptions.length, currentFile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleClose = () => {
        setInviteDialog({ id: '', open: false })
        setSelected([])
        setPrePopulated(false)
    }

    const isDirectory = inviteDialog.fileType === 'directory'

    const handleSave = async () => {
        setSaving(true)
        try {
            const memberIds = selected.map((o) => o.value)
            if (isDirectory) {
                await apiShareDirectory(inviteDialog.id, memberIds)
            } else {
                await apiShareFile(inviteDialog.id, memberIds)
            }
            onShared?.()
            toast.push(
                <Notification
                    type="success"
                    title={isDirectory ? t('fileManager.share.toastFolderSuccess') : t('fileManager.share.toastFileSuccess')}
                />,
                { placement: 'top-end' },
            )
            handleClose()
        } catch {
            toast.push(
                <Notification
                    type="danger"
                    title={isDirectory ? t('fileManager.share.toastFolderFailed') : t('fileManager.share.toastFileFailed')}
                />,
                { placement: 'top-end' },
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog
            isOpen={inviteDialog.open}
            contentClassName="mt-[20%]"
            onClose={handleClose}
            onRequestClose={handleClose}
        >
            <h4>{isDirectory ? t('fileManager.share.titleFolder') : t('fileManager.share.titleFile')}</h4>
            {currentFile && (
                <p className="mt-1 text-sm text-gray-500">
                    {currentFile.name}
                </p>
            )}
            <div className="mt-6">
                <Select
                    isMulti
                    placeholder={t('fileManager.share.placeholder')}
                    options={memberOptions}
                    value={selected}
                    onChange={(val) => setSelected(val as MemberOption[])}
                    formatOptionLabel={(opt: MemberOption) => (
                        <div className="flex items-center gap-2">
                            <Avatar size={24} shape="circle">
                                {opt.label.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                                <div className="font-semibold text-sm">{opt.label}</div>
                                <div className="text-xs text-gray-400">{opt.email}</div>
                            </div>
                        </div>
                    )}
                />
            </div>
            {currentFile && currentFile.permissions.length > 0 && (
                <div className="mt-4">
                    <p className="text-xs text-gray-500 font-semibold mb-2">
                        {t('fileManager.share.currentlyShared')}
                    </p>
                    <div className="flex flex-col gap-2">
                        {currentFile.permissions.map((p) => (
                            <div
                                key={p.userName}
                                className="flex items-center gap-2 text-sm"
                            >
                                <Avatar size={24} shape="circle">
                                    {p.userName.charAt(0).toUpperCase()}
                                </Avatar>
                                <span>{p.userName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="mt-6 flex justify-end items-center gap-2">
                <Button type="button" size="sm" onClick={handleClose}>
                    {t('common.cancel')}
                </Button>
                <Button
                    type="button"
                    variant="solid"
                    size="sm"
                    loading={saving}
                    disabled={selected.length === 0}
                    onClick={handleSave}
                >
                    {t('fileManager.share.shareBtn')}
                </Button>
            </div>
        </Dialog>
    )
}

export default FileManagerInviteDialog
