import { useState } from 'react'
import { useFieldArray } from 'react-hook-form'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import {
    TbPlus,
    TbTrash,
    TbArrowUp,
    TbArrowDown,
    TbChecklist,
} from 'react-icons/tb'
import type { Control } from 'react-hook-form'
import type { PmPlanFormSchema } from './types'

type Props = {
    control: Control<PmPlanFormSchema>
}

const PmTasksSection = ({ control }: Props) => {
    const [newTitle, setNewTitle] = useState('')

    const { fields, append, remove, move, update } = useFieldArray({
        control,
        name: 'tasks',
    })

    const handleAdd = () => {
        const trimmed = newTitle.trim()
        if (!trimmed) return
        append({ title: trimmed })
        setNewTitle('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAdd()
        }
    }

    return (
        <Card>
            <h5 className="mb-1 flex items-center gap-2">
                <TbChecklist className="text-blue-500 text-lg" />
                Checklist Tasks
            </h5>
            <p className="text-xs text-gray-400 mb-4">
                Tasks will appear as a checklist on every work order generated from this PM plan.
            </p>

            {fields.length > 0 && (
                <div className="flex flex-col gap-1 mb-4">
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group"
                        >
                            <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 text-xs flex items-center justify-center text-gray-500 shrink-0 font-semibold">
                                {index + 1}
                            </span>
                            <Input
                                size="sm"
                                className="flex-1 bg-transparent border-0 shadow-none focus:ring-0 px-0"
                                value={field.title}
                                onChange={(e) =>
                                    update(index, {
                                        ...field,
                                        title: e.target.value,
                                    })
                                }
                            />
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<TbArrowUp />}
                                    disabled={index === 0}
                                    onClick={() => move(index, index - 1)}
                                    type="button"
                                />
                                <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<TbArrowDown />}
                                    disabled={index === fields.length - 1}
                                    onClick={() => move(index, index + 1)}
                                    type="button"
                                />
                                <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<TbTrash />}
                                    customColorClass={() =>
                                        'text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
                                    }
                                    onClick={() => remove(index)}
                                    type="button"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2">
                <Input
                    size="sm"
                    placeholder="Add a task (e.g. Check oil level)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                />
                <Button
                    size="sm"
                    variant="solid"
                    icon={<TbPlus />}
                    onClick={handleAdd}
                    type="button"
                    disabled={!newTitle.trim()}
                >
                    Add
                </Button>
            </div>

            {fields.length === 0 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                    No tasks yet. Add steps the technician should complete.
                </p>
            )}
        </Card>
    )
}

export default PmTasksSection
