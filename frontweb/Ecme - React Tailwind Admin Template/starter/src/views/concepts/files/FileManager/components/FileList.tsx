import { useMemo } from 'react'
import Table from '@/components/ui/Table'
import FileSegment from './FileSegment'
import FileRow from './FileRow'
import type { Files, Layout } from '../types'

type FileListProps = {
    fileList: Files
    layout: Layout
    onRename: (id: string, fileType: string) => void
    onDownload: (id: string) => void
    onShare: (id: string, fileType: string) => void
    onDelete: (id: string, fileType: string) => void
    onOpen: (id: string) => void
    onFileClick: (id: string) => void
}

const { TBody, THead, Th, Tr } = Table

const FileList = (props: FileListProps) => {
    const {
        layout,
        fileList,
        onDelete,
        onDownload,
        onShare,
        onRename,
        onOpen,
        onFileClick,
    } = props

    const folders = useMemo(
        () => fileList.filter((f) => f.fileType === 'directory'),
        [fileList],
    )

    const files = useMemo(
        () => fileList.filter((f) => f.fileType !== 'directory'),
        [fileList],
    )

    const renderFileSegment = (list: Files, isFolder?: boolean) => (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 mt-4 gap-4 lg:gap-6">
            {list.map((file) =>
                isFolder ? (
                    <FileSegment
                        key={file.id}
                        fileType={file.fileType}
                        size={file.size}
                        name={file.name}
                        onClick={() => onOpen(file.id)}
                        onOpen={() => onOpen(file.id)}
                        onShare={() => onShare(file.id, 'directory')}
                        onRename={() => onRename(file.id, file.fileType)}
                        onDelete={() => onDelete(file.id, 'directory')}
                    />
                ) : (
                    <FileSegment
                        key={file.id}
                        fileType={file.fileType}
                        size={file.size}
                        name={file.name}
                        onClick={() => onFileClick(file.id)}
                        onDownload={() => onDownload(file.id)}
                        onShare={() => onShare(file.id, file.fileType)}
                        onRename={() => onRename(file.id, file.fileType)}
                        onDelete={() => onDelete(file.id, file.fileType)}
                    />
                ),
            )}
        </div>
    )

    const renderFileRow = (list: Files, isFolder?: boolean) => (
        <Table className="mt-4">
            <THead>
                <Tr>
                    <Th>File</Th>
                    <Th>Size</Th>
                    <Th>Type</Th>
                    <Th></Th>
                </Tr>
            </THead>
            <TBody>
                {list.map((file) =>
                    isFolder ? (
                        <FileRow
                            key={file.id}
                            fileType={file.fileType}
                            size={file.size}
                            name={file.name}
                            onClick={() => onOpen(file.id)}
                            onOpen={() => onOpen(file.id)}
                            onShare={() => onShare(file.id, 'directory')}
                            onRename={() => onRename(file.id, file.fileType)}
                            onDelete={() => onDelete(file.id, 'directory')}
                        />
                    ) : (
                        <FileRow
                            key={file.id}
                            fileType={file.fileType}
                            size={file.size}
                            name={file.name}
                            onClick={() => onFileClick(file.id)}
                            onDownload={() => onDownload(file.id)}
                            onShare={() => onShare(file.id, file.fileType)}
                            onRename={() => onRename(file.id, file.fileType)}
                            onDelete={() => onDelete(file.id, file.fileType)}
                        />
                    ),
                )}
            </TBody>
        </Table>
    )

    return (
        <div>
            {folders.length > 0 && (
                <div>
                    <h4>Folders</h4>
                    {layout === 'grid' && renderFileSegment(folders, true)}
                    {layout === 'list' && renderFileRow(folders, true)}
                </div>
            )}
            {files.length > 0 && (
                <div className="mt-8">
                    <h4>Files</h4>
                    {layout === 'grid' && renderFileSegment(files)}
                    {layout === 'list' && renderFileRow(files)}
                </div>
            )}
        </div>
    )
}

export default FileList
