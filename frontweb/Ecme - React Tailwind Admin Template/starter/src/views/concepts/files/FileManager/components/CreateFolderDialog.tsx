import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useFileManagerStore } from '../store/useFileManagerStore'
import { apiCreateDirectory } from '@/services/FileService'

type Props = {
    onCreated?: () => void
}

const CreateFolderDialog = ({ onCreated }: Props) => {
    const { t } = useTranslation()
    const { createDirDialog, setCreateDirDialog } = useFileManagerStore()

    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)

    const handleClose = () => {
        setCreateDirDialog({ open: false, parentId: '' })
        setName('')
    }

    const handleSubmit = async () => {
        if (!name.trim()) return
        setLoading(true)
        try {
            await apiCreateDirectory({
                name: name.trim(),
                parent_id: createDirDialog.parentId || null,
            })
            onCreated?.()
            toast.push(
                <Notification type="success" title={t('fileManager.createFolder.toastSuccess')} />,
                { placement: 'top-end' },
            )
            handleClose()
        } catch {
            toast.push(
                <Notification type="danger" title={t('fileManager.createFolder.toastFailed')} />,
                { placement: 'top-end' },
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog
            isOpen={createDirDialog.open}
            contentClassName="mt-[50%]"
            onClose={handleClose}
            onRequestClose={handleClose}
        >
            <h4>{t('fileManager.createFolder.title')}</h4>
            <div className="mt-6">
                <Input
                    placeholder={t('fileManager.createFolder.placeholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    autoFocus
                />
            </div>
            <div className="mt-6 flex justify-end items-center gap-2">
                <Button type="button" size="sm" onClick={handleClose}>
                    {t('common.cancel')}
                </Button>
                <Button
                    type="button"
                    variant="solid"
                    size="sm"
                    loading={loading}
                    disabled={!name.trim()}
                    onClick={handleSubmit}
                >
                    {t('common.create')}
                </Button>
            </div>
        </Dialog>
    )
}

export default CreateFolderDialog
