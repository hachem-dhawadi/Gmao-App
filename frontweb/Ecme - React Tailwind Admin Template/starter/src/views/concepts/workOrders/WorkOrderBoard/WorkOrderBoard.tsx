import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import WoBoardColumn from './components/WoBoardColumn'
import {
    useWorkOrderBoardStore,
    BOARD_STATUSES,
} from './store/workOrderBoardStore'
import {
    apiGetWorkOrdersList,
    apiUpdateWorkOrder,
} from '@/services/WorkOrdersService'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER, TECHNICIAN } from '@/constants/roles.constant'
import useSWR from 'swr'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { TbPlus, TbList } from 'react-icons/tb'
import type { DropResult } from '@hello-pangea/dnd'
import type { WorkOrdersListResponse } from '@/services/WorkOrdersService'

const WorkOrderBoard = () => {
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, [ADMIN, MANAGER, TECHNICIAN])

    const { columns, setColumns, moveCard } = useWorkOrderBoardStore()

    useSWR(
        ['/work-orders-board'],
        () => apiGetWorkOrdersList<WorkOrdersListResponse>({ per_page: 100 }),
        {
            revalidateOnFocus: false,
            onSuccess: (data) => {
                const all = data?.data?.work_orders || []
                const grouped = Object.fromEntries(
                    BOARD_STATUSES.map((s) => [
                        s,
                        all.filter((wo) => wo.status === s),
                    ]),
                )
                setColumns(grouped)
            },
        },
    )

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result
        if (!destination) return
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        )
            return

        const woId = parseInt(draggableId, 10)
        const fromStatus = source.droppableId
        const toStatus = destination.droppableId

        moveCard(woId, fromStatus, toStatus, destination.index)

        try {
            await apiUpdateWorkOrder(woId, { status: toStatus })
        } catch {
            moveCard(woId, toStatus, fromStatus, source.index)
            toast.push(
                <Notification type="danger">
                    Failed to update status.
                </Notification>,
                { placement: 'top-center' },
            )
        }
    }

    return (
        <AdaptiveCard className="h-full" bodyClass="h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h3>Work Orders</h3>
                    <p className="font-semibold text-gray-500">Kanban Board</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        icon={<TbList />}
                        onClick={() =>
                            navigate('/concepts/work-orders/work-order-list')
                        }
                    >
                        List view
                    </Button>
                    {canCreate && (
                        <Button
                            size="sm"
                            variant="solid"
                            icon={<TbPlus />}
                            onClick={() =>
                                navigate(
                                    '/concepts/work-orders/work-order-create',
                                )
                            }
                        >
                            New Work Order
                        </Button>
                    )}
                </div>
            </div>

            {/* Board */}
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable
                    droppableId="board"
                    type="COLUMN"
                    direction="horizontal"
                >
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            className="scrumboard flex flex-col flex-auto w-full"
                            {...provided.droppableProps}
                        >
                            <div className="scrumboard-body flex max-w-full overflow-x-auto h-full gap-4">
                                {BOARD_STATUSES.map((status) => (
                                    <WoBoardColumn
                                        key={status}
                                        status={status}
                                        cards={columns[status] || []}
                                    />
                                ))}
                                {provided.placeholder}
                            </div>
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </AdaptiveCard>
    )
}

export default WorkOrderBoard
