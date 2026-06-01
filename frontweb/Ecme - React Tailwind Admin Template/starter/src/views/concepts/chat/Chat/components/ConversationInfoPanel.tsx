import { useEffect, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Dialog from '@/components/ui/Dialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useChatStore } from '../store/chatStore'
import { useSessionUser } from '@/store/authStore'
import {
    apiGetConversationFiles,
    apiLeaveConversation,
    apiDeleteConversation,
} from '@/services/ChatService'
import type { ConversationFile } from '@/services/ChatService'
import type { SelectedConversation } from '../types'
import {
    TbX,
    TbUsers,
    TbFile,
    TbPhoto,
    TbDownload,
    TbDoorExit,
    TbTrash,
} from 'react-icons/tb'
import dayjs from 'dayjs'

type Props = {
    conversation: SelectedConversation
    onClose: () => void
}

const formatBytes = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ConversationInfoPanel = ({ conversation, onClose }: Props) => {
    const memberId    = useSessionUser((state) => state.user.memberId)
    const removeConversation = useChatStore((state) => state.removeConversation)

    const [files, setFiles]             = useState<ConversationFile[]>([])
    const [filesLoading, setFilesLoading] = useState(false)
    const [confirmLeave, setConfirmLeave]   = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        if (!conversation.id) return
        setFilesLoading(true)
        apiGetConversationFiles(conversation.id)
            .then((resp) => setFiles(resp.data.files))
            .catch(() => setFiles([]))
            .finally(() => setFilesLoading(false))
    }, [conversation.id])

    const handleLeave = async () => {
        if (!conversation.id) return
        setActionLoading(true)
        try {
            await apiLeaveConversation(conversation.id)
            removeConversation(conversation.id)
            toast.push(<Notification type="success">You left the group.</Notification>, { placement: 'top-center' })
        } catch {
            toast.push(<Notification type="danger">Failed to leave group.</Notification>, { placement: 'top-center' })
        } finally {
            setActionLoading(false)
            setConfirmLeave(false)
        }
    }

    const handleDelete = async () => {
        if (!conversation.id) return
        setActionLoading(true)
        try {
            await apiDeleteConversation(conversation.id)
            removeConversation(conversation.id)
            toast.push(<Notification type="success">Conversation deleted.</Notification>, { placement: 'top-center' })
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                || 'Failed to delete conversation.'
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setActionLoading(false)
            setConfirmDelete(false)
        }
    }

    const isGroup   = conversation.type === 'group'
    const isCreator = conversation.created_by_member_id === memberId

    const imageFiles = files.filter((f) => f.mime_type?.startsWith('image/'))
    const otherFiles = files.filter((f) => !f.mime_type?.startsWith('image/'))

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 w-72 shrink-0">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 h-[72px] border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-600">
                <span className="font-bold heading-text">
                    {isGroup ? 'Group Info' : 'Conversation Info'}
                </span>
                <button
                    className="text-xl text-gray-500 hover:text-primary"
                    onClick={onClose}
                >
                    <TbX />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                {/* Members section (group only) */}
                {isGroup && conversation.members && conversation.members.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <TbUsers className="text-primary text-lg" />
                            <span className="font-semibold text-sm heading-text">
                                Members ({conversation.members.length})
                            </span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {conversation.members.map((member) => (
                                <div key={member.id} className="flex items-center gap-2">
                                    <Avatar src={member.avatar ?? undefined} size={32}>
                                        {!member.avatar
                                            ? (member.name?.charAt(0)?.toUpperCase() ?? '?')
                                            : null}
                                    </Avatar>
                                    <span className="text-sm font-medium heading-text truncate">
                                        {member.name ?? 'Unknown'}
                                        {member.id === memberId && (
                                            <span className="ml-1 text-xs text-gray-400">(you)</span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Shared images */}
                {imageFiles.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <TbPhoto className="text-primary text-lg" />
                            <span className="font-semibold text-sm heading-text">
                                Photos ({imageFiles.length})
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            {imageFiles.map((f) => (
                                <a
                                    key={f.id}
                                    href={f.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={f.original_name}
                                    className="aspect-square rounded overflow-hidden block"
                                >
                                    <img
                                        src={f.url}
                                        alt={f.original_name}
                                        className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Shared files */}
                {filesLoading && (
                    <div className="flex justify-center py-4">
                        <Spinner size={24} />
                    </div>
                )}

                {!filesLoading && otherFiles.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <TbFile className="text-primary text-lg" />
                            <span className="font-semibold text-sm heading-text">
                                Files ({otherFiles.length})
                            </span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {otherFiles.map((f) => (
                                <div
                                    key={f.id}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700 group"
                                >
                                    <TbFile className="text-gray-400 text-xl shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium heading-text truncate">
                                            {f.original_name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {formatBytes(f.size_bytes)} · {dayjs(f.created_at).format('DD MMM')}
                                        </p>
                                    </div>
                                    <a
                                        href={f.url}
                                        download={f.original_name}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-gray-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <TbDownload className="text-lg" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!filesLoading && files.length === 0 && (
                    <p className="text-xs text-gray-400 text-center">No shared files yet</p>
                )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                {isGroup && (
                    <Button
                        block
                        variant="plain"
                        className="text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 justify-start"
                        icon={<TbDoorExit />}
                        onClick={() => setConfirmLeave(true)}
                    >
                        Leave Group
                    </Button>
                )}
                {(!isGroup || isCreator) && (
                    <Button
                        block
                        variant="plain"
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 justify-start"
                        icon={<TbTrash />}
                        onClick={() => setConfirmDelete(true)}
                    >
                        {isGroup ? 'Delete Group' : 'Delete Conversation'}
                    </Button>
                )}
            </div>

            {/* Leave confirm dialog */}
            <Dialog isOpen={confirmLeave} onClose={() => setConfirmLeave(false)} onRequestClose={() => setConfirmLeave(false)}>
                <div className="text-center">
                    <h5 className="mb-2">Leave Group?</h5>
                    <p className="text-sm text-gray-500 mb-6">
                        You will no longer receive messages from <strong>{conversation.name}</strong>.
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Button onClick={() => setConfirmLeave(false)}>Cancel</Button>
                        <Button variant="solid" className="bg-amber-500 hover:bg-amber-600" loading={actionLoading} onClick={handleLeave}>
                            Leave
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Delete confirm dialog */}
            <Dialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} onRequestClose={() => setConfirmDelete(false)}>
                <div className="text-center">
                    <h5 className="mb-2">
                        {isGroup ? 'Delete Group?' : 'Delete Conversation?'}
                    </h5>
                    <p className="text-sm text-gray-500 mb-6">
                        {isGroup
                            ? 'This will permanently delete the group and all its messages for everyone.'
                            : 'This conversation will be removed from your list.'}
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                        <Button variant="solid" className="bg-red-500 hover:bg-red-600" loading={actionLoading} onClick={handleDelete}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default ConversationInfoPanel
