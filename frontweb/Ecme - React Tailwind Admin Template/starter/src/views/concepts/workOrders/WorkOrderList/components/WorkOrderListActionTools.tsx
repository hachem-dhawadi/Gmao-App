import Button from '@/components/ui/Button'
import { TbCloudDownload, TbPlus, TbLayoutKanban } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, MANAGER, TECHNICIAN } from '@/constants/roles.constant'
import { CSVLink } from 'react-csv'
import useWorkOrderList from '../hooks/useWorkOrderList'

const WorkOrderListActionTools = () => {
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, [ADMIN, MANAGER, TECHNICIAN])

    const { workOrderList } = useWorkOrderList()

    const csvData = workOrderList.map((wo) => ({
        Code: wo.code,
        Title: wo.title,
        Status: wo.status,
        Priority: wo.priority,
        Asset: wo.asset?.name ?? '',
        'Created By': wo.created_by?.name ?? '',
        'Due Date': wo.due_at ? new Date(wo.due_at).toLocaleDateString() : '',
        'Opened At': wo.opened_at ? new Date(wo.opened_at).toLocaleDateString() : '',
    }))

    return (
        <div className="flex flex-col md:flex-row gap-3">
            <CSVLink className="w-full" filename="work-orders.csv" data={csvData}>
                <Button
                    icon={<TbCloudDownload className="text-xl" />}
                    className="w-full"
                >
                    Download
                </Button>
            </CSVLink>
            <Button
                icon={<TbLayoutKanban className="text-xl" />}
                onClick={() =>
                    navigate('/concepts/work-orders/work-order-board')
                }
            >
                Board view
            </Button>
            {canCreate && (
                <Button
                    variant="solid"
                    icon={<TbPlus className="text-xl" />}
                    onClick={() =>
                        navigate('/concepts/work-orders/work-order-create')
                    }
                >
                    Add Work Order
                </Button>
            )}
        </div>
    )
}

export default WorkOrderListActionTools
