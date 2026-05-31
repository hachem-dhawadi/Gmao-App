import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useFileManagerStore } from '../store/useFileManagerStore'
import { apiRenameFile, apiRenameDirectory } from '@/services/FileService'

type Props = {
    onRenamed?: () => void
}

const FileManagerRenameDialog = ({ onRenamed }: Props) => {
    const { t } = useTranslation()
    const { renameDialog, setRenameDialog, renameFile } = useFileManagerStore()

    const [newName, setNewName] = useState('')
    const [loading, setLoading] = useState(false)

    // fileType stored when dialog opened — avoids fileList.find() which can match
    // wrong entity when files and directories share the same numeric ID.
    const isDirectory = renameDialog.fileType === 'directory'

    const handleClose = () => {
        setRenameDialog({ id: '', open: false, fileType: '' })
        setNewName('')
    }

    const handleSubmit = async () => {
        if (!newName.trim()) return
        setLoading(true)
        try {
            if (isDirectory) {
                await apiRenameDirectory(renameDialog.id, newName.trim())
            } else {
                await apiRenameFile(renameDialog.id, newName.trim())
            }
            renameFile({ id: renameDialog.id, fileName: newName.trim() })
            toast.push(
                <Notification type="success" title={t('fileManager.rename.toastSuccess')} />,
                { placement: 'top-end' },
            )
            handleClose()
            onRenamed?.()
        } catch {
            toast.push(
                <Notification type="danger" title={t('fileManager.rename.toastFailed')} />,
                { placement: 'top-end' },
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog
            isOpen={renameDialog.open}
            contentClassName="mt-[50%]"
            onClose={handleClose}
            onRequestClose={handleClose}
        >
            <h4>{isDirectory ? t('fileManager.rename.titleFolder') : t('fileManager.rename.titleFile')}</h4>
            <div className="mt-6">
                <Input
                    placeholder={t('fileManager.rename.placeholder')}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    autoFocus
                />
            </div>
            <div className="mt-6 flex justify-end items-center gap-2">
                <Button type="button" size="sm" onClick={handleClose}>
                    {t('fileManager.rename.close')}
                </Button>
                <Button
                    type="button"
                    variant="solid"
                    size="sm"
                    loading={loading}
                    disabled={!newName.trim()}
                    onClick={handleSubmit}
                >
                    <span className="flex justify-center min-w-10">{t('fileManager.rename.ok')}</span>
                </Button>
            </div>
        </Dialog>
    )
}

export default FileManagerRenameDialog
