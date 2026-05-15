import { Droppable, Draggable } from '@hello-pangea/dnd'
import WoBoardCard from './WoBoardCard'
import { STATUS_LABELS } from '../store/workOrderBoardStore'
import type { WorkOrder } from '@/services/WorkOrdersService'

const statusDotClass: Record<string, string> = {
    open: 'bg-blue-500',
    in_progress: 'bg-amber-500',
    on_hold: 'bg-gray-400',
    completed: 'bg-emerald-500',
    cancelled: 'bg-red-500',
}

type Props = {
    status: string
    cards: WorkOrder[]
}

const WoBoardColumn = ({ status, cards }: Props) => {
    return (
        <div className="board-column flex flex-col mb-3 min-w-[300px] w-[300px] max-w-[300px] bg-gray-50 dark:bg-gray-900 rounded-2xl">
            <div className="flex items-center gap-2 px-5 py-4">
                <span
                    className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDotClass[status]}`}
                />
                <h6 className="font-semibold text-sm">
                    {STATUS_LABELS[status]}
                </h6>
                <span className="text-xs text-gray-400 font-medium">
                    ({cards.length})
                </span>
            </div>

            <Droppable droppableId={status} type="CARD">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        className={`board-dropzone flex-auto px-5 pb-5 min-h-[120px] rounded-b-2xl transition-colors ${
                            snapshot.isDraggingOver
                                ? 'bg-gray-100 dark:bg-gray-700/50'
                                : ''
                        }`}
                        {...provided.droppableProps}
                    >
                        {cards.map((card, index) => (
                            <Draggable
                                key={card.id}
                                draggableId={String(card.id)}
                                index={index}
                            >
                                {(dragProvided, dragSnapshot) => (
                                    <WoBoardCard
                                        ref={dragProvided.innerRef}
                                        data={card}
                                        style={{
                                            opacity: dragSnapshot.isDragging
                                                ? 0.85
                                                : 1,
                                        }}
                                        {...dragProvided.draggableProps}
                                        {...dragProvided.dragHandleProps}
                                    />
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}

                        {cards.length === 0 && !snapshot.isDraggingOver && (
                            <div className="text-center text-xs text-gray-300 dark:text-gray-600 py-8">
                                No work orders
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </div>
    )
}

export default WoBoardColumn
