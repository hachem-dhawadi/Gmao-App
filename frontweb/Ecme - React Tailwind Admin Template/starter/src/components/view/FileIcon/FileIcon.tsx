import { useEffect, useState } from 'react'
import FileDoc from '@/assets/svg/files/FileDoc'
import FileXls from '@/assets/svg/files/FileXls'
import FilePdf from '@/assets/svg/files/FilePdf'
import FilePpt from '@/assets/svg/files/FilePpt'
import FileFigma from '@/assets/svg/files/FileFigma'
import FileImage from '@/assets/svg/files/FileImage'
import Folder from '@/assets/svg/files/Folder'
import AxiosBase from '@/services/axios/AxiosBase'

const IMAGE_TYPES = new Set([
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'avif', 'heic', 'heif',
])

const AuthImage = ({ src, size }: { src: string; size: number }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null)

    useEffect(() => {
        let revoked = false
        AxiosBase({ url: src, method: 'get', responseType: 'blob' })
            .then((res) => {
                if (!revoked) {
                    setObjectUrl(URL.createObjectURL(res.data as Blob))
                }
            })
            .catch(() => { /* show fallback icon */ })
        return () => {
            revoked = true
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src])

    if (!objectUrl) return <FileImage height={size} width={size} />

    return (
        <img
            src={objectUrl}
            alt=""
            style={{ width: size, height: size, objectFit: 'cover', borderRadius: 6 }}
        />
    )
}

const FileIcon = ({
    type,
    size = 40,
    srcUrl,
}: {
    type: string
    size?: number
    srcUrl?: string
}) => {
    if (IMAGE_TYPES.has(type.toLowerCase())) {
        if (srcUrl) return <AuthImage src={srcUrl} size={size} />
        return <FileImage height={size} width={size} />
    }

    switch (type) {
        case 'pdf':
            return <FilePdf height={size} width={size} />
        case 'xls':
        case 'xlsx':
        case 'csv':
            return <FileXls height={size} width={size} />
        case 'doc':
        case 'docx':
            return <FileDoc height={size} width={size} />
        case 'ppt':
        case 'pptx':
            return <FilePpt height={size} width={size} />
        case 'figma':
            return <FileFigma height={size} width={size} />
        case 'directory':
            return <Folder height={size} width={size} />
        default:
            return <FileImage height={size} width={size} />
    }
}

export default FileIcon
