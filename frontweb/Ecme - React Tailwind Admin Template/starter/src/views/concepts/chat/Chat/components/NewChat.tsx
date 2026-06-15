import { useEffect, useState, useMemo } from 'react'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import ScrollBar from '@/components/ui/ScrollBar'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import classNames from '@/utils/classNames'
import { apiGetMembersForChat } from '@/services/MembersService'
import { apiCreateConversation } from '@/services/ChatService'
import { useChatStore } from '../store/chatStore'
import { TbSearch, TbCheck, TbPlus, TbUsers } from 'react-icons/tb'
import type { ChatMember } from '@/services/MembersService'

type Props = {
    onCreated: () => void
}

const NewChat = ({ onCreated }: Props) => {
    const setSelectedConversation = useChatStore((state) => state.setSelectedConversation)

    const [open, setOpen]             = useState(false)
    const [query, setQuery]           = useState('')
    const [groupName, setGroupName]   = useState('')
    const [selected, setSelected]     = useState<ChatMember[]>([])
    const [members, setMembers]       = useState<ChatMember[]>([])
    const [loading, setLoading]       = useState(false)
    const [creating, setCreating]     = useState(false)

    useEffect(() => {
        if (!open) return
        setLoading(true)
        apiGetMembersForChat()
            .then((resp) => setMembers(resp.members ?? []))
            .finally(() => setLoading(false))
    }, [open])

    const filtered = useMemo(() =>
        members.filter((m) =>
            !query || m.name.toLowerCase().includes(query.toLowerCase()),
        ),
    [members, query])

    const isGroup = selected.length > 1

    const toggle = (member: ChatMember) => {
        setSelected((prev) =>
            prev.some((m) => m.id === member.id)
                ? prev.filter((m) => m.id !== member.id)
                : [...prev, member],
        )
    }

    const handleStart = async () => {
        if (selected.length === 0) return
        if (isGroup && !groupName.trim()) {
            toast.push(<Notification type="warning">Please enter a group name.</Notification>, { placement: 'top-center' })
            return
        }
        setCreating(true)
        try {
            const resp = await apiCreateConversation({
                type:       isGroup ? 'group' : 'direct',
                member_ids: selected.map((m) => m.id),
                name:       isGroup ? groupName.trim() : undefined,
            })
            const conv = resp.data.conversation
            setSelectedConversation({
                id:                   conv.id,
                name:                 conv.name,
                avatar:               conv.avatar,
                type:                 conv.type,
                members:              conv.members,
                created_by_member_id: conv.created_by_member_id,
            })
            onCreated()
            handleClose()
        } catch {
            toast.push(<Notification type="danger">Failed to start conversation.</Notification>, { placement: 'top-center' })
        } finally {
            setCreating(false)
        }
    }

    const handleClose = () => {
        setOpen(false)
        setSelected([])
        setQuery('')
        setGroupName('')
    }

    return (
        <>
            <Button block variant="solid" icon={<TbPlus />} onClick={() => setOpen(true)}>
                New chat
            </Button>

            <Dialog isOpen={open} onClose={handleClose} onRequestClose={handleClose}>
                <div>
                    <div className="text-center mb-5">
                        <h4 className="mb-1">New Conversation</h4>
                        <p className="text-sm text-gray-500">Select one person for DM or multiple for a group</p>
                    </div>

                    {isGroup && (
                        <div className="mb-4">
                            <Input
                                prefix={<TbUsers />}
                                placeholder="Group name..."
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                    )}

                    <Input
                        prefix={<TbSearch />}
                        placeholder="Search members..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />

                    <div className="mt-3">
                        <p className="font-semibold uppercase text-xs mb-3 text-gray-400">
                            {filtered.length} member{filtered.length !== 1 ? 's' : ''}
                        </p>
                        <ScrollBar className="overflow-y-auto h-72">
                            <div className="flex flex-col gap-1 pr-2">
                                {loading && <p className="text-center text-gray-400 text-sm py-4">Loading...</p>}
                                {!loading && filtered.map((member) => {
                                    const isSelected = selected.some((m) => m.id === member.id)
                                    return (
                                        <div
                                            key={member.id}
                                            className={classNames(
                                                'py-2 px-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                                                isSelected && 'bg-gray-100 dark:bg-gray-700',
                                            )}
                                            role="button"
                                            onClick={() => toggle(member)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Avatar src={member.avatar_url ?? undefined} size={32}>
                                                    {!member.avatar_url
                                                        ? (member.name?.charAt(0)?.toUpperCase() ?? '?')
                                                        : null}
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold text-sm heading-text">
                                                        {member.name}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{member.email}</p>
                                                </div>
                                            </div>
                                            {isSelected && <TbCheck className="text-xl text-primary" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollBar>
                    </div>

                    <Button
                        block
                        variant="solid"
                        className="mt-4"
                        disabled={selected.length === 0}
                        loading={creating}
                        onClick={handleStart}
                    >
                        {isGroup ? 'Create Group' : 'Start Chat'}
                    </Button>
                </div>
            </Dialog>
        </>
    )
}

export default NewChat
