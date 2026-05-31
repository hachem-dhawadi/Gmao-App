import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import Segment from '@/components/ui/Segment'
import Button from '@/components/ui/Button'
import UploadFile from './UploadFile'
import { useFileManagerStore } from '../store/useFileManagerStore'
import { TbChevronRight, TbLayoutGrid, TbList, TbFolderPlus } from 'react-icons/tb'
import type { Layout } from '../types'

type FileManagerHeaderProps = {
    onEntryClick: () => void
    onDirectoryClick: (id: string) => void
}

const FileManagerHeader = ({
    onEntryClick,
    onDirectoryClick,
}: FileManagerHeaderProps) => {
    const { t } = useTranslation()
    const { directories, layout, setLayout, openedDirectoryId, setCreateDirDialog } =
        useFileManagerStore()

    const handleEntryClick = () => {
        onEntryClick()
    }

    const handleDirectoryClick = (id: string) => {
        onDirectoryClick(id)
    }

    const handleNewFolder = () => {
        setCreateDirDialog({ open: true, parentId: openedDirectoryId })
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                {directories.length > 0 ? (
                    <div className="flex items-center gap-2">
                        <h3 className="flex items-center gap-2 text-base sm:text-2xl">
                            <span
                                className="hover:text-primary cursor-pointer"
                                role="button"
                                onClick={handleEntryClick}
                            >
                                {t('fileManager.title')}
                            </span>
                            {directories.map((dir, index) => (
                                <Fragment key={dir.id}>
                                    <TbChevronRight className="text-lg" />
                                    {directories.length - 1 === index ? (
                                        <span>{dir.label}</span>
                                    ) : (
                                        <span
                                            className="hover:text-primary cursor-pointer"
                                            role="button"
                                            onClick={() =>
                                                handleDirectoryClick(dir.id)
                                            }
                                        >
                                            {dir.label}
                                        </span>
                                    )}
                                </Fragment>
                            ))}
                        </h3>
                    </div>
                ) : (
                    <h3>{t('fileManager.title')}</h3>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Segment
                    value={layout}
                    onChange={(val) => setLayout(val as Layout)}
                >
                    <Segment.Item value="grid" className="text-xl px-3">
                        <TbLayoutGrid />
                    </Segment.Item>
                    <Segment.Item value="list" className="text-xl px-3">
                        <TbList />
                    </Segment.Item>
                </Segment>
                <Button
                    type="button"
                    variant="default"
                    icon={<TbFolderPlus />}
                    onClick={handleNewFolder}
                >
                    {t('fileManager.newFolder')}
                </Button>
                <UploadFile />
            </div>
        </div>
    )
}

export default FileManagerHeader
