const getFileType = (type: string) => {
    switch (type.toLowerCase()) {
        case 'pdf':       return 'PDF'
        case 'xls':
        case 'xlsx':      return 'XLS'
        case 'doc':
        case 'docx':      return 'DOC'
        case 'ppt':
        case 'pptx':      return 'PPT'
        case 'figma':     return 'Figma'
        case 'jpg':
        case 'jpeg':      return 'JPEG'
        case 'png':       return 'PNG'
        case 'gif':       return 'GIF'
        case 'webp':      return 'WEBP'
        case 'svg':       return 'SVG'
        case 'bmp':       return 'BMP'
        case 'tiff':
        case 'tif':       return 'TIFF'
        case 'avif':      return 'AVIF'
        case 'heic':
        case 'heif':      return 'HEIC'
        case 'txt':       return 'TXT'
        case 'csv':       return 'CSV'
        case 'zip':
        case 'rar':
        case '7z':        return 'Archive'
        case 'directory': return 'Folder'
        default:          return type.toUpperCase() || 'FILE'
    }
}

const FileType = ({ type }: { type: string }) => {
    return <>{getFileType(type)}</>
}

export default FileType
