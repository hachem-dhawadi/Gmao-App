import { useState } from 'react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useFileManagerStore } from '../store/useFileManagerStore'
import { apiDeleteFile, apiDeleteDirectory } from '@/services/FileService'
import type { AxiosError } from 'axios'

type Props = {
    onDeleted?: () => void
}

const FileManagerDeleteDialog = ({ onDeleted }: Props) => {
    const { deleteDialog, setDeleteDialog, deleteFile } = useFileManagerStore()

    const [loading, setLoading] = useState(false)

    // fileType is stored when the dialog is opened — no fileList lookup needed.
    // Files and directories live in separate DB tables and can share numeric IDs,
    // so searching fileList by id alone can match the wrong entity type.
    const isDirectory = deleteDialog.fileType === 'directory'

    const handleClose = () => {
        setDeleteDialog({ id: '', open: false, fileType: '' })
    }

    const handleConfirm = async () => {
        const { id } = deleteDialog
        setLoading(true)
        try {
            if (isDirectory) {
                await apiDeleteDirectory(id)
            } else {
                await apiDeleteFile(id)
            }
            deleteFile({ id, isDirectory })
            toast.push(
                <Notification
                    type="success"
                    title={isDirectory ? 'Folder deleted' : 'File deleted'}
                />,
                { placement: 'top-end' },
            )
            handleClose()
            onDeleted?.()
        } catch (err) {
            const msg =
                (err as AxiosError<{ message?: string }>)?.response?.data
                    ?.message ?? 'Delete failed'
            toast.push(
                <Notification type="danger" title={msg} />,
                { placement: 'top-end' },
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <ConfirmDialog
            isOpen={deleteDialog.open}
            type="danger"
            title={isDirectory ? 'Delete folder' : 'Delete file'}
            confirmButtonProps={{ loading, type: 'button' }}
            cancelButtonProps={{ type: 'button' }}
            onClose={handleClose}
            onRequestClose={handleClose}
            onCancel={handleClose}
            onConfirm={handleConfirm}
        >
            <p>
                Are you sure you want to delete this{' '}
                <strong>{isDirectory ? 'folder' : 'file'}</strong>?
                {isDirectory && ' All contents will be permanently removed.'}
                {' '}This action cannot be undone.
            </p>
        </ConfirmDialog>
    )
}

export default FileManagerDeleteDialog
