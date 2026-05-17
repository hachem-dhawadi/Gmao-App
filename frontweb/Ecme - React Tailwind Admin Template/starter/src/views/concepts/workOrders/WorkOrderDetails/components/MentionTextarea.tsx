import { useRef, useState } from 'react'
import useSWR from 'swr'
import ApiService from '@/services/ApiService'

type MentionMember = { id: number; name: string }

type Props = {
    value: string
    onChange: (val: string) => void
    onSubmit: () => void
    placeholder?: string
    rows?: number
    className?: string
    disabled?: boolean
}

const MentionTextarea = ({
    value,
    onChange,
    onSubmit,
    placeholder,
    rows = 3,
    className,
    disabled,
}: Props) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [mentionQuery, setMentionQuery] = useState<string | null>(null)
    const [mentionStart, setMentionStart] = useState(-1)
    const [selectedIdx, setSelectedIdx]   = useState(0)

    // Fetch company members once — any role can access this endpoint
    const { data } = useSWR<{ success: boolean; data: MentionMember[] }>(
        '/members/for-mention',
        () => ApiService.fetchDataWithAxios({ url: '/members/for-mention', method: 'get' }),
        { revalidateOnFocus: false, revalidateIfStale: false },
    )

    const allMembers: MentionMember[] = data?.data ?? []

    const filtered: MentionMember[] =
        mentionQuery !== null
            ? allMembers
                  .filter((m) =>
                      m.name.toLowerCase().includes(mentionQuery.toLowerCase()),
                  )
                  .slice(0, 6)
            : []

    // Detect @mention while typing
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text   = e.target.value
        const cursor = e.target.selectionStart ?? text.length

        onChange(text)

        const textBeforeCursor = text.slice(0, cursor)
        const match = textBeforeCursor.match(/@([\w\s]*)$/)

        if (match) {
            setMentionQuery(match[1])
            setMentionStart(cursor - match[0].length)
            setSelectedIdx(0)
        } else {
            setMentionQuery(null)
        }
    }

    // Insert @[Name] when a member is selected — brackets make it unambiguous
    const insertMention = (member: MentionMember) => {
        const cursor = textareaRef.current?.selectionStart ?? mentionStart
        const before = value.slice(0, mentionStart)
        const after  = value.slice(cursor)
        const token  = `@[${member.name}] `
        const newVal = `${before}${token}${after}`
        onChange(newVal)
        setMentionQuery(null)

        requestAnimationFrame(() => {
            if (textareaRef.current) {
                const pos = mentionStart + token.length
                textareaRef.current.focus()
                textareaRef.current.setSelectionRange(pos, pos)
            }
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (mentionQuery !== null && filtered.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1))
                return
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIdx((i) => Math.max(i - 1, 0))
                return
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault()
                insertMention(filtered[selectedIdx])
                return
            }
            if (e.key === 'Escape') {
                setMentionQuery(null)
                return
            }
        }

        // Ctrl/Cmd+Enter → submit
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            onSubmit()
        }
    }

    return (
        <div className="relative w-full">
            <textarea
                ref={textareaRef}
                rows={rows}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className={className}
            />

            {/* @mention dropdown */}
            {mentionQuery !== null && filtered.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 overflow-hidden">
                    {filtered.map((member, idx) => (
                        <button
                            key={member.id}
                            type="button"
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                                idx === selectedIdx
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                insertMention(member)
                            }}
                        >
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate font-medium">{member.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default MentionTextarea
