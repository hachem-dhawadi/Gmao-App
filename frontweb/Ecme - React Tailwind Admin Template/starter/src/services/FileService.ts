import ApiService from './ApiService'
import type { GetFileListResponse } from '@/views/concepts/files/FileManager/types'

type SimpleResponse = { success: boolean; message: string }

// List files and directories in a folder (empty directory_id = root)
export async function apiGetFileList(directoryId?: string) {
    return ApiService.fetchDataWithAxios<GetFileListResponse>({
        url: '/file-manager',
        method: 'get',
        params: directoryId ? { directory_id: directoryId } : {},
    })
}

// Directories
export async function apiCreateDirectory(data: { name: string; parent_id?: string | null }) {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: { item: unknown } }>({
        url: '/file-manager/directories',
        method: 'post',
        data,
    })
}

export async function apiRenameDirectory(id: string, name: string) {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: { item: unknown } }>({
        url: `/file-manager/directories/${id}`,
        method: 'patch',
        data: { name },
    })
}

export async function apiDeleteDirectory(id: string) {
    return ApiService.fetchDataWithAxios<SimpleResponse>({
        url: `/file-manager/directories/${id}`,
        method: 'delete',
    })
}

// Files
export async function apiUploadFiles(formData: FormData) {
    return ApiService.fetchDataWithAxios<{ success: boolean; message: string; data: { items: unknown[] } }, unknown>({
        url: '/file-manager/upload',
        method: 'post',
        data: formData,
    })
}

export async function apiRenameFile(id: string, name: string) {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: { item: unknown } }>({
        url: `/file-manager/files/${id}`,
        method: 'patch',
        data: { name },
    })
}

export async function apiDeleteFile(id: string) {
    return ApiService.fetchDataWithAxios<SimpleResponse>({
        url: `/file-manager/files/${id}`,
        method: 'delete',
    })
}

export async function apiShareFile(id: string, memberIds: number[]) {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: { item: unknown } }>({
        url: `/file-manager/files/${id}/share`,
        method: 'post',
        data: { member_ids: memberIds },
    })
}

export async function apiShareDirectory(id: string, memberIds: number[]) {
    return ApiService.fetchDataWithAxios<{ success: boolean; data: { item: unknown } }>({
        url: `/file-manager/directories/${id}/share`,
        method: 'post',
        data: { member_ids: memberIds },
    })
}

export function getFileDownloadUrl(id: string): string {
    return `/api/v1/file-manager/files/${id}/download`
}
