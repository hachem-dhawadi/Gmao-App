import { useState, useRef } from 'react'
import { TbSparkles, TbLoader2, TbCheck, TbX } from 'react-icons/tb'
import { apiFillWorkOrder } from '@/services/AiService'
import type { UseFormSetValue } from 'react-hook-form'
import type { WorkOrderFormSchema } from './types'

type Props = {
    setValue: UseFormSetValue<WorkOrderFormSchema>
}

const WorkOrderAiBar = ({ setValue }: Props) => {
    const [prompt, setPrompt]     = useState('')
    const [loading, setLoading]   = useState(false)
    const [filled, setFilled]     = useState(false)
    const [error, setError]       = useState<string | null>(null)
    const inputRef                = useRef<HTMLTextAreaElement>(null)

    const handleFill = async () => {
        const text = prompt.trim()
        if (!text || loading) return

        setLoading(true)
        setFilled(false)
        setError(null)

        try {
            const result = await apiFillWorkOrder(text)

            if (result.title)       setValue('title',       result.title,       { shouldDirty: true })
            if (result.description) setValue('description', result.description, { shouldDirty: true })
            if (result.priority)    setValue('priority',    result.priority,    { shouldDirty: true })
            if (result.due_at)      setValue('due_at',      result.due_at,      { shouldDirty: true })
            if (result.estimated_minutes) {
                setValue('estimated_minutes', String(result.estimated_minutes), { shouldDirty: true })
            }

            setFilled(true)
            setPrompt('')
        } catch {
            setError('Could not fill the form. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleFill()
        }
    }

    return (
        <div className={`rounded-xl border transition-all duration-200 overflow-hidden
            ${filled
                ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
                : 'border-indigo-100 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30'
            }
        `}>
            {/* Header row */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0">
                    <TbSparkles className="text-white text-xs" />
                </div>
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    Fill with AI
                </span>
                <span className="text-xs text-indigo-400 dark:text-indigo-500">
                    · Describe the work order in plain language
                </span>
            </div>

            {/* Input + button */}
            {!filled && (
                <div className="flex gap-2 px-3 pb-3 pt-1">
                    <textarea
                        ref={inputRef}
                        rows={2}
                        value={prompt}
                        onChange={(e) => { setPrompt(e.target.value); setError(null) }}
                        onKeyDown={handleKeyDown}
                        placeholder={'e.g. "Urgent HVAC repair in building A, need it done by Friday, about 2 hours of work"'}
                        disabled={loading}
                        className="flex-1 resize-none text-sm rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 leading-relaxed"
                    />
                    <button
                        type="button"
                        onClick={handleFill}
                        disabled={!prompt.trim() || loading}
                        className="self-end px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shrink-0"
                    >
                        {loading
                            ? <TbLoader2 className="text-base animate-spin" />
                            : <TbSparkles className="text-base" />
                        }
                        {loading ? 'Filling…' : 'Fill'}
                    </button>
                </div>
            )}

            {/* Success state */}
            {filled && (
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <TbCheck className="text-lg shrink-0" />
                        <span className="text-sm font-medium">Form filled — review the fields below and save</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFilled(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-4 shrink-0"
                        title="Fill again"
                    >
                        <TbX className="text-base" />
                    </button>
                </div>
            )}

            {/* Error */}
            {error && (
                <p className="text-xs text-red-500 px-4 pb-2">{error}</p>
            )}

            {/* Hint */}
            {!filled && !loading && (
                <p className="text-[11px] text-indigo-400 dark:text-indigo-500 px-4 pb-2">
                    Press Enter to fill · Shift+Enter for new line · Asset must be selected manually
                </p>
            )}
        </div>
    )
}

export default WorkOrderAiBar
