import { useState, useRef } from 'react'
import Card from '@/components/ui/Card'
import Checkbox from '@/components/ui/Checkbox'
import Button from '@/components/ui/Button'
import {
    apiToggleChecklistItem,
    apiAddChecklistItem,
    apiDeleteChecklistItem,
} from '@/services/WorkOrdersService'
import dayjs from 'dayjs'
import { TbChecklist, TbPlus, TbTrash } from 'react-icons/tb'
import type { WoChecklistItem } from '@/services/WorkOrdersService'

type Props = {
    workOrderId: number
    initialItems: WoChecklistItem[]
    canEdit: boolean
}

const WoChecklist = ({ workOrderId, initialItems, canEdit }: Props) => {
    const [items, setItems] = useState<WoChecklistItem[]>(initialItems)
    const [toggling, setToggling] = useState<number | null>(null)
    const [deleting, setDeleting] = useState<number | null>(null)
    const [newTitle, setNewTitle] = useState('')
    const [adding, setAdding] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const completed = items.filter((i) => i.is_completed).length
    const total = items.length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    const handleToggle = async (item: WoChecklistItem) => {
        if (!canEdit || toggling !== null) return
        setToggling(item.id)
        try {
            const resp = await apiToggleChecklistItem(workOrderId, item.id)
            const updated = resp.data.item
            setItems((prev) =>
                prev.map((i) =>
                    i.id === item.id
                        ? { ...i, is_completed: updated.is_completed, completed_at: updated.completed_at, completed_by: updated.completed_by }
                        : i,
                ),
            )
        } catch {
            // silently fail
        } finally {
            setToggling(null)
        }
    }

    const handleAdd = async () => {
        const title = newTitle.trim()
        if (!title || adding) return
        setAdding(true)
        try {
            const resp = await apiAddChecklistItem(workOrderId, title)
            setItems((prev) => [...prev, resp.data.item])
            setNewTitle('')
            inputRef.current?.focus()
        } catch {
            // silently fail
        } finally {
            setAdding(false)
        }
    }

    const handleDelete = async (item: WoChecklistItem) => {
        if (deleting !== null) return
        setDeleting(item.id)
        try {
            await apiDeleteChecklistItem(workOrderId, item.id)
            setItems((prev) => prev.filter((i) => i.id !== item.id))
        } catch {
            // silently fail
        } finally {
            setDeleting(null)
        }
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-3">
                <h6 className="flex items-center gap-2 text-sm font-semibold">
                    <TbChecklist className="text-blue-500 text-base" />
                    Checklist
                </h6>
                <span className="text-xs font-semibold text-gray-500">
                    {completed}/{total} completed
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <div
                    className={`h-full rounded-full transition-all ${
                        progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Items */}
            <div className="flex flex-col gap-2 mb-3">
                {items.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">No tasks yet — add one below</p>
                )}
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`flex items-start gap-3 p-2 rounded-lg group transition-colors ${
                            item.is_completed
                                ? 'bg-emerald-50 dark:bg-emerald-500/10'
                                : 'bg-gray-50 dark:bg-gray-700/40'
                        }`}
                    >
                        <Checkbox
                            checked={item.is_completed}
                            onChange={() => handleToggle(item)}
                            disabled={!canEdit || toggling === item.id}
                            className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                {item.title}
                            </p>
                            {item.is_completed && item.completed_by && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {item.completed_by}
                                    {item.completed_at ? ` · ${dayjs(item.completed_at).format('DD MMM, HH:mm')}` : ''}
                                </p>
                            )}
                        </div>
                        {canEdit && !item.is_completed && (
                            <button
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all shrink-0 mt-0.5"
                                onClick={() => handleDelete(item)}
                                disabled={deleting === item.id}
                            >
                                <TbTrash className="text-base" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Add new item */}
            {canEdit && (
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Add a task…"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <Button
                        size="sm"
                        variant="solid"
                        icon={<TbPlus />}
                        loading={adding}
                        disabled={!newTitle.trim()}
                        onClick={handleAdd}
                    >
                        Add
                    </Button>
                </div>
            )}
        </Card>
    )
}

export default WoChecklist
