import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useSWR, { mutate as globalMutate } from 'swr'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Dialog from '@/components/ui/Dialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { TbPrinter, TbEdit, TbPackageImport, TbX, TbRefresh, TbMail } from 'react-icons/tb'
import { useTranslation } from 'react-i18next'
import {
    apiGetPurchaseOrderById,
    apiReceivePurchaseOrder,
    apiUpdatePurchaseOrder,
    apiReopenPurchaseOrder,
    apiSendPoToSupplier,
} from '@/services/PurchasingService'
import { apiGetWarehousesList } from '@/services/InventoryService'
import type { PurchaseOrder, PurchaseOrderResponse } from '@/services/PurchasingService'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'

const PoDetailHeaderExtra = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const userAuthority = useSessionUser((s) => s.user.authority)
    const canEdit = useAuthority(userAuthority, ['purchasing.write', 'admin', 'manager'])

    const [receiveOpen, setReceiveOpen] = useState(false)
    const [warehouseId, setWarehouseId] = useState<number | null>(null)
    const [receiveQtys, setReceiveQtys] = useState<Record<number, string>>({})
    const [receiving, setReceiving]     = useState(false)
    const [cancelOpen, setCancelOpen]   = useState(false)
    const [cancelling, setCancelling]   = useState(false)
    const [reopenOpen, setReopenOpen]   = useState(false)
    const [reopening,  setReopening]    = useState(false)
    const [sending,    setSending]      = useState(false)

    const { data, mutate } = useSWR<PurchaseOrder>(
        id ? ['/purchasing/orders', id] : null,
        async () => {
            const res = await apiGetPurchaseOrderById(id!)
            return (res as PurchaseOrderResponse).data.purchase_order
        },
        { revalidateOnFocus: false },
    )

    const { data: warehousesData } = useSWR(
        '/inventory/warehouses-all',
        () => apiGetWarehousesList({ per_page: 100 }),
        { revalidateOnFocus: false },
    )

    const warehouseOptions = (
        (warehousesData as { data?: { warehouses?: { id: number; name: string }[] } })
            ?.data?.warehouses ?? []
    ).map((w) => ({ value: w.id, label: w.name }))

    const openReceive = () => {
        if (!data) return
        const qtys: Record<number, string> = {}
        data.lines.forEach((l) => { qtys[l.id] = String(l.qty_pending) })
        setReceiveQtys(qtys)
        setWarehouseId(null)
        setReceiveOpen(true)
    }

    const handleReceive = async () => {
        if (!warehouseId) {
            toast.push(<Notification type="warning">{t('purchasing.receive.selectWarehouseRequired')}</Notification>, { placement: 'top-center' })
            return
        }
        const lines = Object.entries(receiveQtys)
            .map(([lineId, qty]) => ({
                purchase_order_line_id: parseInt(lineId),
                qty_received: parseFloat(qty),
            }))
            .filter((l) => l.qty_received > 0)

        if (lines.length === 0) {
            toast.push(<Notification type="warning">{t('purchasing.receive.enterQtyRequired')}</Notification>, { placement: 'top-center' })
            return
        }
        setReceiving(true)
        try {
            await apiReceivePurchaseOrder(id!, { warehouse_id: warehouseId, lines })
            await mutate()
            await globalMutate((k) => Array.isArray(k) && k[0] === '/purchasing/orders')
            toast.push(<Notification type="success">{t('purchasing.receive.received')}</Notification>, { placement: 'top-center' })
            setReceiveOpen(false)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('purchasing.receive.receiveFailed')
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setReceiving(false)
        }
    }

    const handleCancel = async () => {
        setCancelling(true)
        try {
            await apiUpdatePurchaseOrder(id!, { status: 'cancelled' })
            await mutate()
            await globalMutate((k) => Array.isArray(k) && k[0] === '/purchasing/orders')
            toast.push(<Notification type="success">{t('purchasing.cancel.success')}</Notification>, { placement: 'top-center' })
            setCancelOpen(false)
        } catch {
            toast.push(<Notification type="danger">{t('purchasing.cancel.failed')}</Notification>, { placement: 'top-center' })
        } finally {
            setCancelling(false)
        }
    }

    const handleReopen = async () => {
        setReopening(true)
        try {
            await apiReopenPurchaseOrder(id!)
            await mutate()
            await globalMutate((k) => Array.isArray(k) && k[0] === '/purchasing/orders')
            toast.push(<Notification type="success">{t('purchasing.reopen.success')}</Notification>, { placement: 'top-center' })
            setReopenOpen(false)
        } catch {
            toast.push(<Notification type="danger">{t('purchasing.reopen.failed')}</Notification>, { placement: 'top-center' })
        } finally {
            setReopening(false)
        }
    }

    const handleSendToSupplier = async () => {
        setSending(true)
        try {
            await apiSendPoToSupplier(id!)
            toast.push(<Notification type="success">{t('purchasing.email.success')}</Notification>, { placement: 'top-center' })
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('purchasing.email.failed')
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setSending(false)
        }
    }

    const canReceive        = canEdit && data && ['ordered', 'partially_received'].includes(data.status)
    const canCancel         = canEdit && data && ['draft', 'ordered'].includes(data.status)
    const canReopen         = canEdit && data?.status === 'cancelled'
    const canSendToSupplier = canEdit && data?.status === 'ordered' && !!data?.supplier?.email

    return (
        <>
            <div className="flex items-center gap-2 print:hidden">
                {canCancel && (
                    <Button
                        icon={<TbX />}
                        customColorClass={() => 'border-red-500 ring-1 ring-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 bg-transparent'}
                        onClick={() => setCancelOpen(true)}
                    >
                        {t('common.cancel')}
                    </Button>
                )}
                {canReopen && (
                    <Button
                        icon={<TbRefresh />}
                        customColorClass={() => 'border-blue-500 ring-1 ring-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 bg-transparent'}
                        onClick={() => setReopenOpen(true)}
                    >
                        {t('common.reopen')}
                    </Button>
                )}
                {canReceive && (
                    <Button icon={<TbPackageImport />} onClick={openReceive}>
                        {t('purchasing.receive.title')}
                    </Button>
                )}
                {canSendToSupplier && (
                    <Button
                        icon={<TbMail />}
                        loading={sending}
                        onClick={handleSendToSupplier}
                    >
                        {t('purchasing.email.send')}
                    </Button>
                )}
                <Button icon={<TbPrinter />} onClick={() => window.print()}>
                    {t('common.print')}
                </Button>
                {canEdit && data?.status !== 'cancelled' && (
                    <Button
                        variant="solid"
                        icon={<TbEdit />}
                        onClick={() => navigate(`/concepts/purchasing/purchase-orders/edit/${id}`)}
                    >
                        {t('common.edit')}
                    </Button>
                )}
            </div>

            {/* Receive Items dialog */}
            <Dialog
                isOpen={receiveOpen}
                onClose={() => setReceiveOpen(false)}
                onRequestClose={() => setReceiveOpen(false)}
                width={600}
            >
                <h5 className="mb-4 font-semibold">{t('purchasing.receive.title')}</h5>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                        {t('purchasing.receive.warehouse')} <span className="text-red-500">*</span>
                    </label>
                    <Select
                        placeholder={t('purchasing.receive.selectWarehouse')}
                        options={warehouseOptions}
                        value={warehouseOptions.find((o) => o.value === warehouseId) ?? null}
                        onChange={(opt) => setWarehouseId(opt?.value ?? null)}
                    />
                </div>
                <div className="space-y-2">
                    {data?.lines.filter((l) => l.qty_pending > 0).map((l) => (
                        <div
                            key={l.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{l.item?.name}</p>
                                <p className="text-xs text-gray-400">
                                    {t('purchasing.receive.pending', { qty: l.qty_pending, unit: l.item?.unit ?? '' })}
                                </p>
                            </div>
                            <div className="w-28">
                                <Input
                                    type="number"
                                    min={0}
                                    max={l.qty_pending}
                                    step="0.001"
                                    value={receiveQtys[l.id] ?? '0'}
                                    onChange={(e) =>
                                        setReceiveQtys((prev) => ({ ...prev, [l.id]: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 mt-5">
                    <Button variant="plain" onClick={() => setReceiveOpen(false)} disabled={receiving}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="solid"
                        icon={<TbPackageImport />}
                        loading={receiving}
                        onClick={handleReceive}
                    >
                        {t('purchasing.receive.confirmReceipt')}
                    </Button>
                </div>
            </Dialog>

            {/* Cancel confirm dialog */}
            <Dialog
                isOpen={cancelOpen}
                onClose={() => setCancelOpen(false)}
                onRequestClose={() => setCancelOpen(false)}
            >
                <h5 className="mb-2 font-semibold">{t('purchasing.cancel.title')}</h5>
                <p className="text-sm text-gray-500 mb-6">
                    {t('purchasing.cancel.confirm', { code: data?.code ?? '' })}
                </p>
                <div className="flex justify-end gap-2">
                    <Button variant="plain" onClick={() => setCancelOpen(false)} disabled={cancelling}>
                        {t('common.no')}
                    </Button>
                    <Button
                        variant="solid"
                        customColorClass={() => 'border-red-500 ring-red-500 bg-red-500 hover:bg-red-600 text-white'}
                        loading={cancelling}
                        onClick={handleCancel}
                    >
                        {t('purchasing.cancel.yesCancel')}
                    </Button>
                </div>
            </Dialog>

            {/* Reopen confirm dialog */}
            <Dialog
                isOpen={reopenOpen}
                onClose={() => setReopenOpen(false)}
                onRequestClose={() => setReopenOpen(false)}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-500 text-2xl">
                        <TbRefresh />
                    </div>
                    <div>
                        <h5 className="font-semibold">{t('purchasing.reopen.title')}</h5>
                        <p className="text-sm text-gray-500">{t('purchasing.reopen.subtitle')}</p>
                    </div>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                    {t('purchasing.reopen.description', { code: data?.code ?? '' })}
                </p>
                <div className="flex justify-end gap-2">
                    <Button variant="plain" onClick={() => setReopenOpen(false)} disabled={reopening}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="solid"
                        icon={<TbRefresh />}
                        loading={reopening}
                        onClick={handleReopen}
                    >
                        {t('purchasing.reopen.yesReopen')}
                    </Button>
                </div>
            </Dialog>
        </>
    )
}

export default PoDetailHeaderExtra
