import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    TbSparkles,
    TbX,
    TbSend,
    TbArrowUpRight,
    TbLoader2,
} from 'react-icons/tb'
import { usGenerativeChatStore } from '@/views/concepts/ai/Chat/store/generativeChatStore'
import useChatSend from '@/views/concepts/ai/Chat/hooks/useChatSend'
import ChatCustomContent from '@/views/concepts/ai/Chat/components/ChatCustomContent'
import ChatActionCard from '@/views/concepts/ai/Chat/components/ChatActionCard'

type PageContext = {
    hint: string
    suggestions: string[]
}

type PageEntry = { match: string; label: string; context: PageContext }

const PAGE_CONTEXTS: PageEntry[] = [
    {
        match: '/pm/pm-plan-form',
        label: 'PM Plan Form',
        context: {
            hint: 'Pick an asset and I\'ll generate a full maintenance checklist automatically.',
            suggestions: ['Generate checklist for this asset', 'What PM tasks are standard for forklifts?'],
        },
    },
    {
        match: '/pm/pm-plans',
        label: 'PM Plans',
        context: {
            hint: 'Ask me about PM plans, overdue tasks, or equipment schedules.',
            suggestions: ['Show overdue PM plans', 'Which assets have no PM plan?'],
        },
    },
    {
        match: '/work-orders',
        label: 'Work Orders',
        context: {
            hint: 'I can help you create, analyze, or prioritize work orders.',
            suggestions: ['Show me overdue work orders', 'Which technician is least busy?'],
        },
    },
    {
        match: '/assets',
        label: 'Assets',
        context: {
            hint: 'Ask me about asset health, maintenance history, or spare parts.',
            suggestions: ['Which assets need attention?', 'Show critical equipment status'],
        },
    },
    {
        match: '/maintenance-requests',
        label: 'Maintenance Requests',
        context: {
            hint: 'I can help draft a maintenance request or check existing ones.',
            suggestions: ['Show open requests', 'Help me write a request'],
        },
    },
    {
        match: '/inventory',
        label: 'Inventory',
        context: {
            hint: 'Ask me about stock levels, low inventory alerts, or reorder suggestions.',
            suggestions: ['Which parts are running low?', 'Show critical inventory alerts'],
        },
    },
    {
        match: '/purchasing',
        label: 'Purchasing',
        context: {
            hint: 'I can help with purchase requests or vendor selection.',
            suggestions: ['Show pending purchase requests', 'What needs restocking?'],
        },
    },
]

const DEFAULT_ENTRY: PageEntry = {
    match: '',
    label: 'Dashboard',
    context: {
        hint: 'Ask me anything about maintenance, assets, or work orders.',
        suggestions: ['Show overdue work orders', 'Which assets need attention?'],
    },
}

function getPageEntry(pathname: string): PageEntry {
    return PAGE_CONTEXTS.find((p) => pathname.includes(p.match)) ?? DEFAULT_ENTRY
}

const TypingDots = () => (
    <div className="flex gap-1 py-1">
        {[0, 150, 300].map((delay) => (
            <div
                key={delay}
                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
            />
        ))}
    </div>
)

const AiFloatingBubble = () => {
    const [open, setOpen] = useState(false)
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { handleSend } = useChatSend()

    const { selectedConversation, chatHistory, isTyping, disabledChatFresh } =
        usGenerativeChatStore()

    const pageEntry = getPageEntry(pathname)
    const pageContext = pageEntry.context

    const messages =
        chatHistory.find((c) => c.id === selectedConversation)?.conversation ?? []

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (open) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages.length, isTyping, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const text = input.trim()
        if (!text || isTyping) return
        setInput('')
        await handleSend(text, undefined, pageEntry.label)
    }

    const handleSuggestion = async (text: string) => {
        await handleSend(text, undefined, pageEntry.label)
    }

    const goToFullChat = () => {
        setOpen(false)
        navigate('/concepts/ai/chat')
    }

    // Detect if we're already on the AI chat page — hide bubble there
    if (pathname.includes('/ai/chat')) return null

    return (
        <>
            {/* ── Mini panel ── */}
            {open && (
                <div className="fixed bottom-36 right-6 z-[9999] w-[340px] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
                    style={{ height: '480px' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 shrink-0">
                        <div className="flex items-center gap-2">
                            <TbSparkles className="text-white text-lg" />
                            <span className="text-white font-semibold text-sm">AI Assistant</span>
                            <span className="text-indigo-200 text-xs">· {pageEntry.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={goToFullChat}
                                title="Open full chat"
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <TbArrowUpRight className="text-sm" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <TbX className="text-sm" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth">
                        {/* Empty state */}
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center text-center pt-4 pb-2 gap-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow">
                                    <TbSparkles className="text-white text-lg" />
                                </div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    How can I help you?
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed px-4">
                                    {pageContext.hint}
                                </p>
                                {/* Quick suggestion chips */}
                                <div className="flex flex-col gap-1.5 w-full mt-1">
                                    {pageContext.suggestions.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => handleSuggestion(s)}
                                            disabled={isTyping}
                                            className="text-xs text-left px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Message list */}
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.isMyMessage ? 'justify-end' : 'justify-start'}`}
                            >
                                {/* Avatar for AI */}
                                {!msg.isMyMessage && (
                                    <img
                                        src="/ailogo.jpg"
                                        alt="AI"
                                        className="w-6 h-6 rounded-full object-cover shrink-0 mt-1 mr-2"
                                    />
                                )}

                                <div
                                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                        msg.isMyMessage
                                            ? 'bg-indigo-600 text-white rounded-br-sm'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                                    }`}
                                >
                                    {msg.isMyMessage ? (
                                        <span>{msg.content as string}</span>
                                    ) : (
                                        <>
                                            <ChatCustomContent
                                                content={msg.content as string}
                                                triggerTyping={msg.fresh ?? false}
                                                onFinish={() => disabledChatFresh(msg.id)}
                                            />
                                            {msg.actionData && (
                                                <div className="mt-2">
                                                    <ChatActionCard actionData={msg.actionData} messageId={msg.id} />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="flex justify-start">
                                <img
                                    src="/ailogo.jpg"
                                    alt="AI"
                                    className="w-6 h-6 rounded-full object-cover shrink-0 mt-1 mr-2"
                                />
                                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-2xl rounded-bl-sm">
                                    <TypingDots />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form
                        onSubmit={handleSubmit}
                        className="shrink-0 border-t border-gray-100 dark:border-gray-700 p-3 flex gap-2 items-center"
                    >
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask anything about maintenance…"
                            className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 dark:text-gray-100 dark:placeholder-gray-400"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                        >
                            {isTyping ? (
                                <TbLoader2 className="text-sm animate-spin" />
                            ) : (
                                <TbSend className="text-sm" />
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* ── Floating bubble button ── */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                title="AI Assistant"
                className={`fixed bottom-20 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200
                    bg-gradient-to-br from-indigo-600 to-violet-600 text-white
                    hover:shadow-[0_0_20px_4px_rgba(99,102,241,0.45)] hover:scale-105 active:scale-95
                    ${!open ? 'animate-pulse-glow' : ''}
                `}
            >
                {open ? (
                    <TbX className="text-xl" />
                ) : (
                    <TbSparkles className="text-xl" />
                )}
            </button>
        </>
    )
}

export default AiFloatingBubble
