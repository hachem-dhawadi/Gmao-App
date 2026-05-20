import { useEffect, useRef, useState, useCallback } from 'react'
import Table from '@/components/ui/Table'
import TableRowSkeleton from '@/components/shared/loaders/TableRowSkeleton'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import FileManagerHeader from './components/FileManagerHeader'
import FileSegment from './components/FileSegment'
import FileList from './components/FileList'
import FileDetails from './components/FileDetails'
import FileManagerDeleteDialog from './components/FileManagerDeleteDialog'
import FileManagerInviteDialog from './components/FileManagerInviteDialog'
import FileManagerRenameDialog from './components/FileManagerRenameDialog'
import CreateFolderDialog from './components/CreateFolderDialog'
import { useFileManagerStore } from './store/useFileManagerStore'
import { apiGetFileList } from '@/services/FileService'
import AxiosBase from '@/services/axios/AxiosBase'

const { THead, Th, Tr } = Table

const FileManager = () => {
    const {
        layout,
        fileList,
        setFileList,
        setDeleteDialog,
        setInviteDialog,
        setRenameDialog,
        openedDirectoryId,
        setOpenedDirectoryId,
        setDirectories,
        setSelectedFile,
    } = useFileManagerStore()

    const [isLoading, setIsLoading] = useState(false)

    // Always-current ref so the pendingRefresh effect never has a stale directory
    const openedDirRef = useRef(openedDirectoryId)
    useEffect(() => {
        openedDirRef.current = openedDirectoryId
    }, [openedDirectoryId])

    // Simple, reliable loader — no SWR complications
    // silent=true suppresses the error toast (used for post-CRUD refreshes so the
    // user only sees the action's own success/failure, not a confusing reload error)
    const loadDirectory = useCallback(
        async (dirId: string, silent = false) => {
            setIsLoading(true)
            let stale = false
            try {
                const resp = await apiGetFileList(dirId || undefined)
                // Discard the response if the user navigated away while this
                // request was in flight — prevents a stale silent refresh from
                // overwriting a subsequent navigation's results.
                if (useFileManagerStore.getState().openedDirectoryId !== dirId) {
                    stale = true
                    return
                }
                setDirectories(resp.data.directory)
                setFileList(resp.data.list)
            } catch {
                if (!silent) {
                    toast.push(
                        <Notification type="danger" title="Failed to load files" />,
                        { placement: 'top-end' },
                    )
                }
            } finally {
                // Only clear the loading flag when this response is the one
                // that actually updated state — stale requests leave isLoading
                // true so the in-flight navigation request's spinner stays visible.
                if (!stale) setIsLoading(false)
            }
        },
        // Zustand setters and getState are stable — this function is created exactly once
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    )

    // Load root on mount — always reset stale Zustand navigation state from a previous
    // React Router session (store is not cleared on navigation, only on page reload)
    useEffect(() => {
        setOpenedDirectoryId('')
        setDirectories([])
        openedDirRef.current = ''
        loadDirectory('')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Post-CRUD refresh: silent so its failure never produces an extra toast
    const refresh = () => loadDirectory(openedDirRef.current, true)

    // ── handlers ────────────────────────────────────────────────────────────────

    const handleOpen = (id: string) => {
        setOpenedDirectoryId(id)
        loadDirectory(id)
    }

    const handleEntryClick = () => {
        setOpenedDirectoryId('')
        loadDirectory('')
    }

    const handleDirectoryClick = (id: string) => {
        setOpenedDirectoryId(id)
        loadDirectory(id)
    }

    const handleShare = (id: string, fileType: string) => setInviteDialog({ id, open: true, fileType })
    const handleDelete = (id: string, fileType: string) => setDeleteDialog({ id, open: true, fileType })
    const handleRename = (id: string, fileType: string) => setRenameDialog({ id, open: true, fileType })

    const handleFileClick = (fileId: string) => {
        const item = fileList.find((f) => f.id === fileId)
        if (item && item.fileType !== 'directory') {
            setSelectedFile(fileId)
        }
    }

    const handleDownload = async (id: string) => {
        const item = fileList.find((f) => f.id === id)
        if (!item || item.fileType === 'directory') return
        try {
            const response = await AxiosBase({
                url: `/file-manager/files/${id}/download`,
                method: 'get',
                responseType: 'blob',
            })
            const url = URL.createObjectURL(response.data as Blob)
            const link = document.createElement('a')
            link.href = url
            link.download = item.name
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch {
            toast.push(
                <Notification type="danger" title="Download failed" />,
                { placement: 'top-end' },
            )
        }
    }

    // ── render ───────────────────────────────────────────────────────────────────

    return (
        <>
            <div>
                <FileManagerHeader
                    onEntryClick={handleEntryClick}
                    onDirectoryClick={handleDirectoryClick}
                />
                <div className="mt-6">
                    {isLoading ? (
                        layout === 'grid' ? (
                            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 mt-4 gap-4 lg:gap-6">
                                {[...Array(4).keys()].map((i) => (
                                    <FileSegment key={i} loading />
                                ))}
                            </div>
                        ) : (
                            <Table>
                                <THead>
                                    <Tr>
                                        <Th>File</Th>
                                        <Th>Size</Th>
                                        <Th>Type</Th>
                                        <Th></Th>
                                    </Tr>
                                </THead>
                                <TableRowSkeleton
                                    avatarInColumns={[0]}
                                    columns={4}
                                    rows={5}
                                    avatarProps={{ width: 30, height: 30 }}
                                />
                            </Table>
                        )
                    ) : fileList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <p className="text-lg font-semibold">
                                This folder is empty
                            </p>
                            <p className="text-sm mt-1">
                                Upload a file or create a folder to get started
                            </p>
                        </div>
                    ) : (
                        <FileList
                            fileList={fileList}
                            layout={layout}
                            onDownload={handleDownload}
                            onShare={handleShare}
                            onDelete={handleDelete}
                            onRename={handleRename}
                            onOpen={handleOpen}
                            onFileClick={handleFileClick}
                        />
                    )}
                </div>
            </div>
            <FileDetails onShare={handleShare} />
            <FileManagerDeleteDialog onDeleted={refresh} />
            <FileManagerInviteDialog onShared={refresh} />
            <FileManagerRenameDialog onRenamed={refresh} />
            <CreateFolderDialog onCreated={refresh} />
        </>
    )
}

export default FileManager
