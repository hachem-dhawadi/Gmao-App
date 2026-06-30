import api from './ApiService'

export type FmItem = {
    id: string
    name: string
    fileType: string
    srcUrl: string
    size: number | null
    author: { name: string; email: string; img: string }
    uploadDate: number
    recent: boolean
}

export type FmBreadcrumb = { id: string; label: string }

export type FileListResponse = {
    success: boolean
    data: {
        list: FmItem[]
        directory: FmBreadcrumb[]
    }
}

export async function apiGetFileList(directoryId?: string | null) {
    const params: Record<string, unknown> = {}
    if (directoryId) params.directory_id = directoryId
    return api.get<FileListResponse>('/file-manager', { params })
}

export function getDownloadUrl(baseUrl: string, fileId: string) {
    const base = baseUrl.replace('/api/v1', '')
    return `${base}/api/v1/file-manager/files/${fileId}/download`
}

export async function apiGetDownloadToken(fileId: string) {
    return api.get<{ success: boolean; data: { token: string } }>(`/file-manager/files/${fileId}/download-token`)
}

export function getTokenDownloadUrl(baseUrl: string, token: string) {
    const base = baseUrl.replace('/api/v1', '')
    return `${base}/api/v1/file-manager/files/download/${token}`
}

export async function apiDeleteDirectory(dirId: string) {
    return api.delete(`/file-manager/directories/${dirId}`)
}

export async function apiUploadFile(
    file: { uri: string; name: string; type: string },
    directoryId?: string | null,
) {
    const form = new FormData()
    form.append('files[]', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)
    if (directoryId) form.append('directory_id', directoryId)
    return api.post<{ success: boolean; data: { items: FmItem[] } }>(
        '/file-manager/upload',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    )
}

export async function apiDeleteFile(fileId: string) {
    return api.delete(`/file-manager/files/${fileId}`)
}

export async function apiCreateDirectory(data: { name: string; parent_id?: string | null }) {
    return api.post<{ success: boolean; data: { item: FmItem } }>('/file-manager/directories', data)
}
