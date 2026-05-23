import { useState } from 'react'
import Card from '@/components/ui/Card'
import Checkbox from '@/components/ui/Checkbox'
import { apiToggleChecklistItem } from '@/services/WorkOrdersService'
import dayjs from 'dayjs'
import { TbChecklist } from 'react-icons/tb'
import type { WoChecklistItem } from '@/services/WorkOrdersService'

type Props = {
    workOrderId: number
    initialItems: WoChecklistItem[]
    canEdit: boolean
}

const WoChecklist = ({ workOrderId, initialItems, canEdit }: Props) => {
    const [items, setItems] = useState<WoChecklistItem[]>(initialItems)
    const [toggling, setToggling] = useState<number | null>(null)

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
                        ? {
                              ...i,
                              is_completed: updated.is_completed,
                              completed_at: updated.completed_at,
                              completed_by: updated.completed_by,
                          }
                        : i,
                ),
            )
        } catch {
            // silently fail — state stays unchanged
        } finally {
            setToggling(null)
        }
    }

    if (items.length === 0) return null

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
                        progress === 100
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex flex-col gap-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
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
                            <p
                                className={`text-sm ${
                                    item.is_completed
                                        ? 'line-through text-gray-400'
                                        : 'text-gray-700 dark:text-gray-200'
                                }`}
                            >
                                {item.title}
                            </p>
                            {item.is_completed && item.completed_by && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {item.completed_by}
                                    {item.completed_at
                                        ? ` · ${dayjs(item.completed_at).format('DD MMM, HH:mm')}`
                                        : ''}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}

export default WoChecklist
