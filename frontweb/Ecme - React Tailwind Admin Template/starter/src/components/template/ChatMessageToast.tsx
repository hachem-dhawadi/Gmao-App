import type { MouseEvent } from 'react'
import Notification from '@/components/ui/Notification'

interface Props {
    senderName:       string | null
    senderAvatar:     string | null
    conversationName: string
    conversationType: 'direct' | 'group'
    preview:          string
    onClick?:         () => void
    onClose?:         (e: MouseEvent) => void
}

function avatarBg(name: string) {
    const hue = Math.abs(name.split('').reduce((h, c) => h + c.charCodeAt(0), 0)) % 360
    return `hsl(${hue}, 58%, 50%)`
}

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function nowTime() {
    return new Date().toLocaleTimeString('en-US', {
        hour:   '2-digit',
        minute: '2-digit',
        hour12: false,
    })
}

const ChatMessageToast = ({
    senderName,
    senderAvatar,
    conversationName,
    conversationType,
    preview,
    onClick,
    onClose,
}: Props) => {
    const handleClick = (e: MouseEvent) => {
        onClick?.()
        onClose?.(e)
    }
    const displayName = conversationType === 'direct'
        ? conversationName
        : (senderName ?? conversationName)

    const badge = conversationType === 'group'
        ? `${senderName ?? 'Someone'} · ${conversationName}`
        : 'Direct message'

    const avatarName = senderName ?? conversationName

    const avatar = (
        <div className="relative flex-shrink-0">
            {senderAvatar ? (
                <img
                    src={senderAvatar}
                    alt={avatarName}
                    className="w-10 h-10 rounded-full object-cover"
                />
            ) : (
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold select-none"
                    style={{ backgroundColor: avatarBg(avatarName) }}
                >
                    {initials(avatarName)}
                </div>
            )}
            {/* chat bubble badge */}
            <span className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] bg-violet-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="white">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
            </span>
        </div>
    )

    return (
        <Notification
            customIcon={avatar}
            duration={4000}
            triggerByToast
            width={360}
            onClose={onClose}
            onClick={handleClick}
            className="cursor-pointer hover:brightness-95 active:brightness-90 transition-[filter] select-none"
        >
            <div className="flex flex-col gap-0.5 min-w-0">
                {/* name + time */}
                <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate leading-tight">
                        {displayName}
                    </span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 tabular-nums">
                        {nowTime()}
                    </span>
                </div>

                {/* badge */}
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-500 leading-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                    {badge}
                </span>

                {/* preview */}
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug mt-1 line-clamp-2">
                    {preview}
                </p>
            </div>
        </Notification>
    )
}

export default ChatMessageToast
