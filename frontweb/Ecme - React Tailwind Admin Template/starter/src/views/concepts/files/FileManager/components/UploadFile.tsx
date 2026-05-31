import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Upload from '@/components/ui/Upload'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import UploadMedia from '@/assets/svg/UploadMedia'
import { useFileManagerStore } from '../store/useFileManagerStore'
import { apiUploadFiles, apiGetFileList } from '@/services/FileService'
import type { File as FmFile } from '../types'

const UploadFile = () => {
    const { t } = useTranslation()
    const { openedDirectoryId, setFileList, setDirectories } = useFileManagerStore()

    const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])

    const handleClose = () => {
        setUploadDialogOpen(false)
        setSelectedFiles([])
    }

    const handleUpload = async () => {
        if (selectedFiles.length === 0 || isUploading) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            selectedFiles.forEach((file) => formData.append('files[]', file))
            if (openedDirectoryId) {
                formData.append('directory_id', openedDirectoryId)
            }

            const result = await apiUploadFiles(formData)

            // Primary: show uploaded files immediately from the response — no round-trip needed.
            // The backend returns the formatted file records in data.items.
            const newItems = ((result as { data?: { items?: FmFile[] } }).data?.items) ?? []
            if (newItems.length > 0) {
                const current = useFileManagerStore.getState().fileList
                const dirs = current.filter((f) => f.fileType === 'directory')
                const existingFiles = current.filter((f) => f.fileType !== 'directory')
                const allFiles = [...existingFiles, ...newItems].sort((a, b) =>
                    a.name.localeCompare(b.name),
                )
                setFileList([...dirs, ...allFiles])
            }

            // Secondary: silent background reload to sync accurate server state.
            // Errors are swallowed — the inline update above already shows the file.
            apiGetFileList(openedDirectoryId || undefined)
                .then((resp) => {
                    setDirectories(resp.data.directory)
                    setFileList(resp.data.list)
                })
                .catch(() => {
                    // Reload failed — inline update stays visible, which is correct
                })

            toast.push(
                <Notification
                    title={t('fileManager.uploadDialog.toastSuccess', { count: selectedFiles.length })}
                    type="success"
                />,
                { placement: 'top-center' },
            )
            handleClose()
        } catch {
            toast.push(
                <Notification title={t('fileManager.uploadDialog.toastFailed')} type="danger" />,
                { placement: 'top-center' },
            )
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <>
            <Button type="button" variant="solid" onClick={() => setUploadDialogOpen(true)}>
                {t('fileManager.upload')}
            </Button>
            <Dialog
                isOpen={uploadDialogOpen}
                onClose={handleClose}
                onRequestClose={handleClose}
            >
                <h4>{t('fileManager.uploadDialog.title')}</h4>
                <Upload
                    draggable
                    className="mt-6 bg-gray-100 dark:bg-transparent"
                    onChange={setSelectedFiles}
                    onFileRemove={setSelectedFiles}
                >
                    <div className="my-4 text-center">
                        <div className="text-6xl mb-4 flex justify-center">
                            <UploadMedia height={150} width={200} />
                        </div>
                        <p className="font-semibold">
                            <span className="text-gray-800 dark:text-white">
                                {t('fileManager.uploadDialog.dropHint')}{' '}
                            </span>
                            <span className="text-blue-500">{t('fileManager.uploadDialog.browse')}</span>
                        </p>
                        <p className="mt-1 font-semibold opacity-60 dark:text-white">
                            {t('fileManager.uploadDialog.through')}
                        </p>
                    </div>
                </Upload>
                <div className="mt-4">
                    <Button
                        block
                        type="button"
                        loading={isUploading}
                        variant="solid"
                        disabled={selectedFiles.length === 0 || isUploading}
                        onClick={handleUpload}
                    >
                        {t('fileManager.uploadDialog.uploadBtn')}
                    </Button>
                </div>
            </Dialog>
        </>
    )
}

export default UploadFile
