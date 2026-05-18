import { useParams } from 'react-router-dom'
import useSWR from 'swr'
import Tag from '@/components/ui/Tag'
import { apiGetPurchaseOrderById } from '@/services/PurchasingService'
import type { PurchaseOrder, PurchaseOrderResponse } from '@/services/PurchasingService'

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
    draft:              { label: 'Draft',     bgClass: 'bg-gray-100 dark:bg-gray-700',          textClass: 'text-gray-500'                          },
    ordered:            { label: 'Ordered',   bgClass: 'bg-blue-100 dark:bg-blue-500/20',       textClass: 'text-blue-600 dark:text-blue-400'       },
    partially_received: { label: 'Partial',   bgClass: 'bg-amber-100 dark:bg-amber-500/20',     textClass: 'text-amber-600 dark:text-amber-400'     },
    received:           { label: 'Received',  bgClass: 'bg-emerald-100 dark:bg-emerald-500/20', textClass: 'text-emerald-600 dark:text-emerald-400' },
    cancelled:          { label: 'Cancelled', bgClass: 'bg-red-100 dark:bg-red-500/20',         textClass: 'text-red-500'                           },
}

const PoDetailHeader = () => {
    const { id } = useParams()

    const { data } = useSWR<PurchaseOrder>(
        id ? ['/purchasing/orders', id] : null,
        async () => {
            const res = await apiGetPurchaseOrderById(id!)
            return (res as PurchaseOrderResponse).data.purchase_order
        },
        { revalidateOnFocus: false },
    )

    if (!data) return <h3>Purchase Order</h3>

    const cfg = statusConfig[data.status] ?? statusConfig.draft

    return (
        <div className="flex items-center gap-3">
            <h3 className="mb-0">#{data.code}</h3>
            <Tag className={`border-0 ${cfg.bgClass}`}>
                <span className={`capitalize font-semibold ${cfg.textClass}`}>
                    {cfg.label}
                </span>
            </Tag>
        </div>
    )
}

export default PoDetailHeader
