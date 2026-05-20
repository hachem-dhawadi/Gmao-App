import { create } from 'zustand'
import type { Files, Directories, Layout } from '../types'

type DialogProps = { id: string; open: boolean; fileType?: string }
type FileTypeDialogProps = { id: string; open: boolean; fileType: string }
type CreateDirDialogProps = { open: boolean; parentId: string }

export type FileManagerState = {
    fileList: Files
    layout: Layout
    selectedFile: string
    openedDirectoryId: string
    directories: Directories
    deleteDialog: FileTypeDialogProps
    renameDialog: FileTypeDialogProps
    inviteDialog: DialogProps
    createDirDialog: CreateDirDialogProps
}

type FileManagerAction = {
    setFileList: (payload: Files) => void
    setLayout: (payload: Layout) => void
    setOpenedDirectoryId: (payload: string) => void
    setDirectories: (payload: Directories) => void
    setSelectedFile: (payload: string) => void
    setDeleteDialog: (payload: FileTypeDialogProps) => void
    setRenameDialog: (payload: FileTypeDialogProps) => void
    setInviteDialog: (payload: DialogProps) => void
    setCreateDirDialog: (payload: CreateDirDialogProps) => void
    deleteFile: (payload: { id: string; isDirectory: boolean }) => void
    renameFile: (payload: { id: string; fileName: string }) => void
}

const initialState: FileManagerState = {
    fileList: [],
    layout: 'grid',
    selectedFile: '',
    openedDirectoryId: '',
    directories: [],
    deleteDialog: { open: false, id: '', fileType: '' },
    renameDialog: { open: false, id: '', fileType: '' },
    inviteDialog: { open: false, id: '', fileType: '' },
    createDirDialog: { open: false, parentId: '' },
}

export const useFileManagerStore = create<FileManagerState & FileManagerAction>(
    (set, get) => ({
        ...initialState,
        setFileList: (payload) => set(() => ({ fileList: payload })),
        setLayout: (payload: Layout) => set(() => ({ layout: payload })),
        setOpenedDirectoryId: (payload) =>
            set(() => ({ openedDirectoryId: payload })),
        setSelectedFile: (payload) => set(() => ({ selectedFile: payload })),
        setDirectories: (payload) => set(() => ({ directories: payload })),
        setDeleteDialog: (payload) => set(() => ({ deleteDialog: payload })),
        setInviteDialog: (payload) => set(() => ({ inviteDialog: payload })),
        setRenameDialog: (payload) => set(() => ({ renameDialog: payload })),
        setCreateDirDialog: (payload) => set(() => ({ createDirDialog: payload })),
        deleteFile: (payload) =>
            set(() => ({
                fileList: get().fileList.filter((file) => {
                    if (file.id !== payload.id) return true
                    return payload.isDirectory
                        ? file.fileType !== 'directory'
                        : file.fileType === 'directory'
                }),
            })),
        renameFile: (payload) =>
            set(() => ({
                fileList: get().fileList.map((file) => {
                    if (file.id === payload.id) {
                        if (file.fileType === 'directory') {
                            file = { ...file, name: payload.fileName }
                        } else {
                            const parts = file.name.split('.')
                            const ext = parts.length > 1 ? parts[parts.length - 1] : ''
                            file = { ...file, name: ext ? `${payload.fileName}.${ext}` : payload.fileName }
                        }
                    }
                    return file
                }),
            })),
    }),
)
