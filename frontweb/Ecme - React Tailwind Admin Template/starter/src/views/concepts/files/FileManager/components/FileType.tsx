const getFileType = (type: string) => {
    switch (type) {
        case 'pdf':
            return 'PDF'
        case 'xls':
            return 'XLS'
        case 'doc':
            return 'DOC'
        case 'ppt':
            return 'PPT'
        case 'figma':
            return 'Figma'
        case 'image/jpeg':
        case 'jpeg':
            return 'JPEG'
        case 'png':
            return 'PNG'
        case 'gif':
            return 'GIF'
        case 'webp':
            return 'WEBP'
        case 'txt':
            return 'TXT'
        case 'csv':
            return 'CSV'
        case 'zip':
            return 'ZIP'
        case 'directory':
            return 'Folder'
        default:
            return type.toUpperCase() || 'FILE'
    }
}

const FileType = ({ type }: { type: string }) => {
    return <>{getFileType(type)}</>
}

export default FileType
