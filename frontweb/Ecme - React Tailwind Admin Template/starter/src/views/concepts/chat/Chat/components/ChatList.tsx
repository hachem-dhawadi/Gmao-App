import { useRef, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import ScrollBar from '@/components/ui/ScrollBar'
import NewChat from './NewChat'
import { useChatStore } from '../store/chatStore'
import classNames from '@/utils/classNames'
import dayjs from 'dayjs'
import { TbSearch, TbX, TbUsers } from 'react-icons/tb'
import type { ChatConversation } from '@/services/ChatService'

type Props = {
    onConversationCreated: () => void
}

const ChatList = ({ onConversationCreated }: Props) => {
    const conversations           = useChatStore((state) => state.conversations)
    const selectedConversation    = useChatStore((state) => state.selectedConversation)
    const setSelectedConversation = useChatStore((state) => state.setSelectedConversation)
    const setMobileSidebar        = useChatStore((state) => state.setMobileSidebar)
    const markConversationRead    = useChatStore((state) => state.markConversationRead)

    const inputRef = useRef<HTMLInputElement>(null)
    const [showSearch, setShowSearch] = useState(false)
    const [query, setQuery]   = useState('')
    const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all')

    const handleClick = (conv: ChatConversation) => {
        setSelectedConversation({
            id:                   conv.id,
            name:                 conv.name,
            avatar:               conv.avatar,
            type:                 conv.type,
            members:              conv.members,
            created_by_member_id: conv.created_by_member_id,
        })
        markConversationRead(conv.id)
        setMobileSidebar(false)
    }

    const filtered = conversations.filter((c) => {
        const matchesQuery  = !query || c.name.toLowerCase().includes(query.toLowerCase())
        const matchesFilter = filter === 'all' || c.type === filter
        return matchesQuery && matchesFilter
    })

    return (
        <div className="flex flex-col justify-between h-full">
            <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                    {showSearch ? (
                        <input
                            ref={inputRef}
                            autoFocus
                            className="flex-1 h-full placeholder:text-gray-400 placeholder:text-base bg-transparent focus:outline-hidden heading-text font-bold"
                            placeholder="Search conversations..."
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    ) : (
                        <h4>Chat</h4>
                    )}
                    <button
                        className="close-button text-lg"
                        type="button"
                        onClick={() => { setShowSearch(!showSearch); setQuery('') }}
                    >
                        {showSearch ? <TbX /> : <TbSearch />}
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 mb-2">
                    {(['all', 'direct', 'group'] as const).map((tab) => (
                        <button
                            key={tab}
                            className={classNames(
                                'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                                filter === tab
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                            )}
                            onClick={() => setFilter(tab)}
                        >
                            {tab === 'all' ? 'All' : tab === 'direct' ? 'Direct' : 'Groups'}
                        </button>
                    ))}
                </div>
            </div>

            <ScrollBar className="h-[calc(100%-140px)] overflow-y-auto">
                <div className="flex flex-col gap-1 h-full">
                    {filtered.length === 0 && (
                        <p className="text-center text-gray-400 text-sm mt-8">No conversations yet</p>
                    )}
                    {filtered.map((conv) => (
                        <div
                            key={conv.id}
                            className={classNames(
                                'py-3 px-2 flex items-center gap-2 justify-between rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 relative cursor-pointer select-none',
                                selectedConversation.id === conv.id && 'bg-gray-100 dark:bg-gray-700',
                            )}
                            role="button"
                            onClick={() => handleClick(conv)}
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="relative">
                                    {conv.type === 'group' ? (
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <TbUsers className="text-xl" />
                                        </div>
                                    ) : (
                                        <Avatar src={conv.avatar ?? undefined}>
                                            {!conv.avatar ? (conv.name?.charAt(0)?.toUpperCase() ?? '?') : null}
                                        </Avatar>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold heading-text truncate">{conv.name}</div>
                                    <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                                        {conv.last_message?.body
                                            ? (conv.last_message.body.length > 35
                                                ? conv.last_message.body.slice(0, 35) + '…'
                                                : conv.last_message.body)
                                            : conv.last_message
                                            ? '📎 File'
                                            : 'No messages yet'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 items-end shrink-0">
                                {conv.last_message && (
                                    <small className="font-semibold text-gray-400">
                                        {dayjs(conv.last_message.created_at).format('HH:mm')}
                                    </small>
                                )}
                                {conv.unread_count > 0 && (
                                    <Badge
                                        className="bg-primary text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center rounded-full"
                                        content={conv.unread_count > 99 ? '99+' : String(conv.unread_count)}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollBar>

            <div className="mt-3">
                <NewChat onCreated={onConversationCreated} />
            </div>
        </div>
    )
}

export default ChatList
