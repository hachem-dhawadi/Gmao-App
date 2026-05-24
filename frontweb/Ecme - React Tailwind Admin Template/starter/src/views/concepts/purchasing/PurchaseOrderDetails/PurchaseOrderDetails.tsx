import { useState, type ReactElement } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useSWR, { mutate as globalMutate } from 'swr'
import Loading from '@/components/shared/Loading'
import IconText from '@/components/shared/IconText'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Timeline from '@/components/ui/Timeline'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import { NumericFormat } from 'react-number-format'
import { TbMail, TbPhone, TbUser, TbBuilding, TbFileInvoice, TbCircleCheck, TbAlertTriangle, TbBuildingBank, TbCreditCard, TbCash, TbReceipt2, TbWorldWww, TbDownload, TbPaperclip } from 'react-icons/tb'
import {
    apiGetPurchaseOrderById,
    apiRecordInvoice,
    apiMarkAsPaid,
    apiDisputeInvoice,
    apiDownloadPaymentProof,
} from '@/services/PurchasingService'
import type { PurchaseOrder, PurchaseOrderResponse } from '@/services/PurchasingService'
import dayjs from 'dayjs'

// ── Status configs ─────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
    draft:              { label: 'Draft',     bgClass: 'bg-gray-100 dark:bg-gray-700',          textClass: 'text-gray-500'                          },
    ordered:            { label: 'Ordered',   bgClass: 'bg-blue-100 dark:bg-blue-500/20',       textClass: 'text-blue-600 dark:text-blue-400'       },
    partially_received: { label: 'Partial',   bgClass: 'bg-amber-100 dark:bg-amber-500/20',     textClass: 'text-amber-600 dark:text-amber-400'     },
    received:           { label: 'Received',  bgClass: 'bg-emerald-100 dark:bg-emerald-500/20', textClass: 'text-emerald-600 dark:text-emerald-400' },
    cancelled:          { label: 'Cancelled', bgClass: 'bg-red-100 dark:bg-red-500/20',         textClass: 'text-red-500'                           },
}

const PAYMENT_METHODS = [
    { value: 'bank_transfer', label: 'Bank Transfer', icon: <TbBuildingBank />, refLabel: 'Bank reference number'         },
    { value: 'paypal',        label: 'PayPal',         icon: <TbWorldWww />,    refLabel: 'PayPal email / transaction ID'  },
    { value: 'check',         label: 'Check',          icon: <TbReceipt2 />,    refLabel: 'Check number'                   },
    { value: 'cash',          label: 'Cash',           icon: <TbCash />,        refLabel: null                             },
    { value: 'credit_card',   label: 'Credit Card',    icon: <TbCreditCard />,  refLabel: 'Card reference / last 4 digits' },
] as const

const paymentMethodConfig: Record<string, { label: string; icon: ReactElement }> = {
    bank_transfer: { label: 'Bank Transfer', icon: <TbBuildingBank /> },
    paypal:        { label: 'PayPal',         icon: <TbWorldWww />    },
    check:         { label: 'Check',          icon: <TbReceipt2 />    },
    cash:          { label: 'Cash',           icon: <TbCash />        },
    credit_card:   { label: 'Credit Card',    icon: <TbCreditCard />  },
}

const paymentConfig: Record<string, { label: string; bgClass: string; textClass: string; dot: string }> = {
    pending:  { label: 'Pending',  bgClass: 'bg-amber-100 dark:bg-amber-500/20',     textClass: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500'   },
    paid:     { label: 'Paid',     bgClass: 'bg-emerald-100 dark:bg-emerald-500/20', textClass: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    disputed: { label: 'Disputed', bgClass: 'bg-red-100 dark:bg-red-500/20',         textClass: 'text-red-500',                           dot: 'bg-red-500'     },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SupplierAvatar = ({ name }: { name: string }) => {
    const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    return (
        <Avatar shape="circle" className="bg-primary text-white font-bold">
            {initials}
        </Avatar>
    )
}

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="flex items-center justify-between">
        <span className="text-gray-500 font-semibold">{label}</span>
        <span className="font-semibold">{value}</span>
    </div>
)

// ── Main component ────────────────────────────────────────────────────────────

const PurchaseOrderDetails = () => {
    const { id } = useParams()
    const { t } = useTranslation()

    const { data, isLoading } = useSWR<PurchaseOrder>(
        id ? ['/purchasing/orders', id] : null,
        async () => {
            const res = await apiGetPurchaseOrderById(id!)
            return (res as PurchaseOrderResponse).data.purchase_order
        },
        { revalidateOnFocus: false },
    )

    // ── Invoice dialog state ──────────────────────────────────────────────────
    const [invoiceOpen,     setInvoiceOpen]     = useState(false)
    const [isEditingInvoice, setIsEditingInvoice] = useState(false)
    const [invNumber,       setInvNumber]       = useState('')
    const [invDate,         setInvDate]         = useState('')
    const [invAmount,       setInvAmount]       = useState('')
    const [savingInvoice,   setSavingInvoice]   = useState(false)

    // ── Pay dialog state ──────────────────────────────────────────────────────
    const [payOpen,    setPayOpen]    = useState(false)
    const [payMethod,  setPayMethod]  = useState('bank_transfer')
    const [payRef,     setPayRef]     = useState('')
    const [payNote,    setPayNote]    = useState('')
    const [proofFile,  setProofFile]  = useState<File | null>(null)
    const [savingPay,  setSavingPay]  = useState(false)

    // ── Dispute dialog state ──────────────────────────────────────────────────
    const [disputeOpen,   setDisputeOpen]   = useState(false)
    const [disputeNote,   setDisputeNote]   = useState('')
    const [savingDispute, setSavingDispute] = useState(false)

    const refresh = () => globalMutate((k) => Array.isArray(k) && k[0] === '/purchasing/orders')

    const openNewInvoice = () => {
        setIsEditingInvoice(false)
        setInvNumber(''); setInvDate(''); setInvAmount('')
        setInvoiceOpen(true)
    }

    const openEditInvoice = () => {
        setIsEditingInvoice(true)
        setInvNumber(data!.invoice_number ?? '')
        setInvDate(data!.invoice_date ?? '')
        setInvAmount(data!.invoice_amount != null ? String(data!.invoice_amount) : '')
        setInvoiceOpen(true)
    }

    const handleRecordInvoice = async () => {
        if (!invNumber.trim() || !invDate || !invAmount) return
        setSavingInvoice(true)
        try {
            await apiRecordInvoice(id!, {
                invoice_number: invNumber.trim(),
                invoice_date:   invDate,
                invoice_amount: parseFloat(invAmount),
            })
            await refresh()
            toast.push(<Notification type="success">{t('purchasing.details.invoiceRecorded')}</Notification>, { placement: 'top-center' })
            setInvoiceOpen(false)
            setInvNumber(''); setInvDate(''); setInvAmount('')
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to record invoice.'
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setSavingInvoice(false)
        }
    }

    const handleMarkAsPaid = async () => {
        setSavingPay(true)
        try {
            await apiMarkAsPaid(id!, {
                payment_method:    payMethod,
                payment_reference: payRef || null,
                payment_note:      payNote || null,
                proof_file:        proofFile,
            })
            await refresh()
            toast.push(<Notification type="success">{t('purchasing.details.markedAsPaid')}</Notification>, { placement: 'top-center' })
            setPayOpen(false)
            setPayMethod('bank_transfer'); setPayRef(''); setPayNote(''); setProofFile(null)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed.'
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setSavingPay(false)
        }
    }

    const handleDownloadProof = async () => {
        try {
            const blob = await apiDownloadPaymentProof(id!)
            const url = URL.createObjectURL(blob as unknown as Blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `payment-proof-${data?.code ?? id}`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            toast.push(<Notification type="danger">{t('purchasing.details.downloadFailed')}</Notification>, { placement: 'top-center' })
        }
    }

    const handleDispute = async () => {
        if (!disputeNote.trim()) return
        setSavingDispute(true)
        try {
            await apiDisputeInvoice(id!, { payment_note: disputeNote.trim() })
            await refresh()
            toast.push(<Notification type="warning">{t('purchasing.details.disputed')}</Notification>, { placement: 'top-center' })
            setDisputeOpen(false)
            setDisputeNote('')
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed.'
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setSavingDispute(false)
        }
    }

    const cfg = data ? (statusConfig[data.status] ?? statusConfig.draft) : null
    const canRecordInvoice = data && ['ordered', 'partially_received', 'received'].includes(data.status) && !data.invoice_number
    const canEditInvoice   = data && data.payment_status === 'pending'
    const notYetReceived   = data && !['partially_received', 'received'].includes(data.status)
    const hasOvercharge    = data?.invoice_amount != null && data.invoice_amount - data.total_amount > 0.001
    const hasUndercharge   = data?.invoice_amount != null && data.total_amount - data.invoice_amount > 0.001

    return (
        <Loading loading={isLoading}>
            {data && cfg && (
                <div className="flex flex-col lg:flex-row gap-4">

                    {/* ── Left column ── */}
                    <div className="gap-4 flex flex-col flex-auto">

                        {/* Line Items */}
                        <Card>
                            <h4 className="mb-4">Line Items</h4>
                            <div className="flex flex-col gap-4">
                                {data.lines.map((l) => (
                                    <div key={l.id} className="rounded-xl bg-gray-50 dark:bg-gray-700 p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar shape="round" size={60} className="bg-primary/10 text-primary font-bold text-sm">
                                                    {(l.item?.code ?? '?').slice(0, 3).toUpperCase()}
                                                </Avatar>
                                                <div>
                                                    <div className="heading-text font-bold">{l.item?.name}</div>
                                                    <div className="text-sm text-gray-500 font-mono">ID: {l.item?.code}</div>
                                                </div>
                                            </div>
                                            <div className="ltr:text-right rtl:text-left">
                                                <div className="heading-text font-bold">
                                                    <NumericFormat fixedDecimalScale prefix="$" displayType="text" value={l.line_total} decimalScale={2} thousandSeparator />
                                                </div>
                                                <div>Qty: {l.qty_ordered} {l.item?.unit}</div>
                                                <div className="flex gap-3 justify-end text-xs mt-1">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ {l.qty_received} received</span>
                                                    {l.qty_pending > 0 && (
                                                        <span className="text-amber-600 dark:text-amber-400 font-semibold">⏳ {l.qty_pending} pending</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Invoice & Payment card */}
                        <Card>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <h4>Invoice & Payment</h4>
                                    {data.payment_status && (() => {
                                        const pc = paymentConfig[data.payment_status]
                                        return (
                                            <Tag className={`border-0 ${pc.bgClass}`}>
                                                <span className={`font-semibold ${pc.textClass}`}>{pc.label}</span>
                                            </Tag>
                                        )
                                    })()}
                                </div>
                                {canRecordInvoice && (
                                    <Button size="sm" variant="solid" icon={<TbFileInvoice />} onClick={openNewInvoice}>
                                        Record Invoice
                                    </Button>
                                )}
                                {canEditInvoice && (
                                    <Button size="sm" variant="plain" icon={<TbFileInvoice />} onClick={openEditInvoice}>
                                        Edit Invoice
                                    </Button>
                                )}
                            </div>

                            {!data.invoice_number ? (
                                /* No invoice yet */
                                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-3">
                                    <TbFileInvoice className="text-5xl opacity-40" />
                                    <p className="font-semibold">No invoice recorded yet</p>
                                    <p className="text-sm text-center max-w-xs">
                                        Once goods are received, record the supplier's invoice to track payment.
                                    </p>
                                </div>
                            ) : (
                                /* Invoice recorded */
                                <div className="flex flex-col gap-5 text-sm">
                                    {/* Overcharge warning (invoice > PO) */}
                                    {hasOvercharge && data.payment_status !== 'paid' && (
                                        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                                            <TbAlertTriangle className="text-xl mt-0.5 shrink-0" />
                                            <div>
                                                <p className="font-bold">Supplier is overcharging</p>
                                                <p className="text-xs mt-0.5">
                                                    Invoice amount{' '}
                                                    <strong><NumericFormat displayType="text" value={data.invoice_amount!} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator /></strong>
                                                    {' '}is higher than PO total{' '}
                                                    <strong><NumericFormat displayType="text" value={data.total_amount} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator /></strong>
                                                    {' '}(+<NumericFormat displayType="text" value={data.invoice_amount! - data.total_amount} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator />).
                                                    Dispute the invoice or contact the supplier.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Under-invoice notice (invoice < PO) */}
                                    {hasUndercharge && data.payment_status !== 'paid' && (
                                        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                            <TbAlertTriangle className="text-xl mt-0.5 shrink-0" />
                                            <div>
                                                <p className="font-bold">Invoice is lower than PO total</p>
                                                <p className="text-xs mt-0.5">
                                                    Invoice amount{' '}
                                                    <strong><NumericFormat displayType="text" value={data.invoice_amount!} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator /></strong>
                                                    {' '}is less than PO total{' '}
                                                    <strong><NumericFormat displayType="text" value={data.total_amount} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator /></strong>
                                                    {' '}(−<NumericFormat displayType="text" value={data.total_amount - data.invoice_amount!} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator />).
                                                    This may be a partial invoice or a discount — verify with the supplier.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <InfoRow label="Invoice Number" value={<span className="font-mono">{data.invoice_number}</span>} />
                                    <InfoRow label="Invoice Date" value={data.invoice_date ? dayjs(data.invoice_date).format('DD/MM/YYYY') : '—'} />
                                    <InfoRow
                                        label="Invoice Amount"
                                        value={
                                            <NumericFormat
                                                className={`heading-text font-bold ${hasOvercharge && data.payment_status !== 'paid' ? 'text-red-500' : hasUndercharge && data.payment_status !== 'paid' ? 'text-amber-600 dark:text-amber-400' : ''}`}
                                                displayType="text" value={data.invoice_amount!} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator
                                            />
                                        }
                                    />
                                    <InfoRow
                                        label="PO Total"
                                        value={
                                            <NumericFormat className="heading-text font-bold" displayType="text" value={data.total_amount} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator />
                                        }
                                    />

                                    {data.payment_status === 'paid' && (
                                        <>
                                            <hr />
                                            <InfoRow
                                                label="Paid on"
                                                value={
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                        {data.paid_at ? dayjs(data.paid_at).format('DD/MM/YYYY HH:mm') : '—'}
                                                    </span>
                                                }
                                            />
                                            {data.payment_method && paymentMethodConfig[data.payment_method] && (
                                                <InfoRow
                                                    label="Payment method"
                                                    value={
                                                        <span className="flex items-center gap-1.5 font-semibold">
                                                            {paymentMethodConfig[data.payment_method].icon}
                                                            {paymentMethodConfig[data.payment_method].label}
                                                        </span>
                                                    }
                                                />
                                            )}
                                            {data.payment_reference && (
                                                <InfoRow label="Reference" value={<span className="font-mono text-sm">{data.payment_reference}</span>} />
                                            )}
                                            {data.payment_note && (
                                                <InfoRow label="Note" value={<span className="text-gray-500 italic">{data.payment_note}</span>} />
                                            )}
                                            {data.has_payment_proof && (
                                                <div className="flex justify-end pt-1">
                                                    <Button
                                                        size="sm"
                                                        variant="plain"
                                                        icon={<TbDownload />}
                                                        onClick={handleDownloadProof}
                                                    >
                                                        Download Proof
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {data.payment_status === 'disputed' && data.payment_note && (
                                        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                                            <p className="font-bold mb-1">Dispute reason</p>
                                            <p>{data.payment_note}</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {(data.payment_status === 'pending' || data.payment_status === 'disputed') && (
                                        <div className="flex gap-2 pt-2">
                                            {data.payment_status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    customColorClass={() => 'border-red-400 ring-1 ring-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 bg-transparent'}
                                                    icon={<TbAlertTriangle />}
                                                    onClick={() => setDisputeOpen(true)}
                                                >
                                                    Dispute
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="solid"
                                                icon={<TbCircleCheck />}
                                                onClick={() => setPayOpen(true)}
                                            >
                                                Mark as Paid
                                            </Button>
                                        </div>
                                    )}

                                    {data.payment_status === 'paid' && (
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold pt-2">
                                            <TbCircleCheck className="text-xl" />
                                            <span>Payment confirmed</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>

                        {/* Activity timeline */}
                        <Card>
                            <div className="flex items-center gap-2 mb-4">
                                <h5>Activity</h5>
                                <Tag className={`border-0 rounded-md ${cfg.bgClass}`}>
                                    <span className={`font-semibold ${cfg.textClass}`}>{cfg.label}</span>
                                </Tag>
                            </div>
                            <Timeline>
                                <Timeline.Item media={<div className="flex mt-1"><Badge innerClass="bg-blue-500" /></div>}>
                                    <div className="font-bold mb-1 heading-text">Order Created</div>
                                    <div className="text-sm text-gray-500">
                                        {data.created_by?.name ?? 'System'} &middot;{' '}
                                        {data.created_at ? dayjs(data.created_at).format('DD MMM YYYY, HH:mm') : '—'}
                                    </div>
                                </Timeline.Item>

                                {data.status !== 'draft' && (
                                    <Timeline.Item media={<div className="flex mt-1"><Badge innerClass="bg-blue-600" /></div>}>
                                        <div className="font-bold mb-1 heading-text">Order Placed</div>
                                        <div className="text-sm text-gray-500">Status changed to Ordered</div>
                                    </Timeline.Item>
                                )}

                                {['partially_received', 'received'].includes(data.status) && (
                                    <Timeline.Item media={<div className="flex mt-1"><Badge innerClass="bg-emerald-500" /></div>}>
                                        <div className="font-bold mb-1 heading-text text-emerald-500">Items Received</div>
                                        <div className="text-sm text-gray-500">
                                            {data.receipts_count} receipt(s) &middot; Stock updated
                                        </div>
                                    </Timeline.Item>
                                )}

                                {data.invoice_number && (
                                    <Timeline.Item media={<div className="flex mt-1"><Badge innerClass="bg-violet-500" /></div>}>
                                        <div className="font-bold mb-1 heading-text text-violet-600 dark:text-violet-400">Invoice Recorded</div>
                                        <div className="text-sm text-gray-500">
                                            {data.invoice_number} &middot;{' '}
                                            <NumericFormat displayType="text" value={data.invoice_amount!} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator />
                                        </div>
                                    </Timeline.Item>
                                )}

                                {data.payment_status === 'disputed' && (
                                    <Timeline.Item media={<div className="flex mt-1"><Badge innerClass="bg-red-500" /></div>}>
                                        <div className="font-bold mb-1 heading-text text-red-500">Invoice Disputed</div>
                                        <div className="text-sm text-gray-500">{data.payment_note}</div>
                                    </Timeline.Item>
                                )}

                                {data.payment_status === 'paid' && (
                                    <Timeline.Item media={<div className="flex mt-1"><Badge innerClass="bg-emerald-600" /></div>}>
                                        <div className="font-bold mb-1 heading-text text-emerald-600 dark:text-emerald-400">Payment Confirmed</div>
                                        <div className="text-sm text-gray-500">
                                            {data.paid_at ? dayjs(data.paid_at).format('DD MMM YYYY, HH:mm') : '—'}
                                            {data.payment_note && <span> &middot; {data.payment_note}</span>}
                                        </div>
                                    </Timeline.Item>
                                )}

                                {data.status === 'cancelled' && (
                                    <Timeline.Item media={<div className="flex mt-1"><Badge innerClass="bg-red-500" /></div>}>
                                        <div className="font-bold mb-1 heading-text text-red-500">Order Cancelled</div>
                                        <div className="text-sm text-gray-500">This order was cancelled</div>
                                    </Timeline.Item>
                                )}
                            </Timeline>
                        </Card>
                    </div>

                    {/* ── Right column ── */}
                    <div className="lg:w-[320px] xl:w-[420px] gap-4 flex flex-col">

                        {/* Supplier */}
                        <Card>
                            <h4 className="mb-4">Supplier</h4>
                            <div className="flex items-center gap-2">
                                <SupplierAvatar name={data.supplier?.name ?? 'S'} />
                                <div>
                                    <div className="font-bold heading-text">{data.supplier?.name}</div>
                                    <span className="text-sm text-gray-500">
                                        <span className="font-semibold">{data.receipts_count}</span> receipt(s)
                                    </span>
                                </div>
                            </div>
                            <hr className="my-5" />
                            {data.supplier?.email && (
                                <IconText className="mb-4" icon={<TbMail className="text-xl opacity-70" />}>
                                    <span>{data.supplier.email}</span>
                                </IconText>
                            )}
                            {data.supplier?.phone && (
                                <IconText className="mb-4" icon={<TbPhone className="text-xl opacity-70" />}>
                                    <span>{data.supplier.phone}</span>
                                </IconText>
                            )}
                            {data.supplier?.contact_name && (
                                <IconText className="mb-4" icon={<TbUser className="text-xl opacity-70" />}>
                                    <span>{data.supplier.contact_name}</span>
                                </IconText>
                            )}
                            {data.supplier?.address && (
                                <>
                                    <hr className="my-5" />
                                    <h6 className="mb-4 font-bold">Address</h6>
                                    <IconText icon={<TbBuilding className="text-xl opacity-70" />}>
                                        <address className="not-italic text-sm">{data.supplier.address}</address>
                                    </IconText>
                                </>
                            )}
                        </Card>

                        {/* Order Info */}
                        <Card>
                            <h4 className="mb-4">Order Info</h4>
                            <div className="flex flex-col gap-4 text-sm">
                                {data.supplier_reference && (
                                    <InfoRow label="Supplier Ref." value={<span className="font-mono">{data.supplier_reference}</span>} />
                                )}
                                <InfoRow label="Created by" value={data.created_by?.name ?? '—'} />
                                <InfoRow label="Created" value={data.created_at ? dayjs(data.created_at).format('DD/MM/YYYY') : '—'} />
                                {data.expected_delivery_at && (
                                    <InfoRow label="Expected delivery" value={dayjs(data.expected_delivery_at).format('DD/MM/YYYY')} />
                                )}
                                <InfoRow label="Receipts" value={data.receipts_count} />
                                <InfoRow label="Lines" value={data.lines.length} />
                                <hr />
                                <InfoRow
                                    label="PO Total"
                                    value={
                                        <NumericFormat className="heading-text font-bold" displayType="text" value={data.total_amount} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator />
                                    }
                                />
                                {data.payment_status && (
                                    <InfoRow
                                        label="Payment"
                                        value={(() => {
                                            const pc = paymentConfig[data.payment_status]
                                            return (
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`inline-block w-2 h-2 rounded-full ${pc.dot}`} />
                                                    <span className={`font-semibold ${pc.textClass}`}>{pc.label}</span>
                                                </div>
                                            )
                                        })()}
                                    />
                                )}
                            </div>
                        </Card>

                        {/* Note */}
                        {data.supplier_note && (
                            <Card>
                                <h4 className="mb-4">Note</h4>
                                <div className="rounded-xl p-4 bg-gray-50 dark:bg-gray-700 text-sm">
                                    {data.supplier_note}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* ── Record Invoice dialog ──────────────────────────────────────── */}
            <Dialog isOpen={invoiceOpen} onClose={() => setInvoiceOpen(false)} onRequestClose={() => setInvoiceOpen(false)}>
                <h5 className="mb-1 font-semibold">{isEditingInvoice ? 'Edit Invoice' : 'Record Invoice'}</h5>
                <p className="text-sm text-gray-500 mb-5">
                    {isEditingInvoice
                        ? 'Correct the invoice details. The payment status will remain pending.'
                        : "Enter the supplier's invoice details to start payment tracking."}
                </p>
                <div className="flex flex-col gap-4">
                    <FormItem label="Invoice Number">
                        <Input
                            placeholder="e.g. INV-4521"
                            value={invNumber}
                            onChange={(e) => setInvNumber(e.target.value)}
                        />
                    </FormItem>
                    <FormItem label="Invoice Date">
                        <DatePicker
                            placeholder="Pick invoice date"
                            value={invDate ? new Date(invDate) : null}
                            onChange={(date) => setInvDate(date ? dayjs(date).format('YYYY-MM-DD') : '')}
                        />
                    </FormItem>
                    <FormItem label="Invoice Amount">
                        <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            prefix="$"
                            value={invAmount}
                            onChange={(e) => setInvAmount(e.target.value)}
                        />
                    </FormItem>
                    {invAmount && data && parseFloat(invAmount) - data.total_amount > 0.001 && (
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10">
                            <TbAlertTriangle className="shrink-0" />
                            <span>
                                Invoice is higher than PO total (
                                <NumericFormat displayType="text" value={data.total_amount} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator />
                                ). Consider disputing after saving.
                            </span>
                        </div>
                    )}
                    {invAmount && data && data.total_amount - parseFloat(invAmount) > 0.001 && (
                        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                            <TbAlertTriangle className="shrink-0" />
                            <span>
                                Invoice is lower than PO total (
                                <NumericFormat displayType="text" value={data.total_amount} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator />
                                ). This may be a partial invoice or a discount.
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={() => setInvoiceOpen(false)} disabled={savingInvoice}>Cancel</Button>
                    <Button
                        variant="solid"
                        loading={savingInvoice}
                        disabled={!invNumber.trim() || !invDate || !invAmount}
                        onClick={handleRecordInvoice}
                    >
                        Save Invoice
                    </Button>
                </div>
            </Dialog>

            {/* ── Mark as Paid dialog ───────────────────────────────────────── */}
            <Dialog isOpen={payOpen} onClose={() => setPayOpen(false)} onRequestClose={() => setPayOpen(false)}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl">
                        <TbCircleCheck />
                    </div>
                    <div>
                        <h5 className="font-semibold">Mark as Paid</h5>
                        <p className="text-sm text-gray-500">This confirms payment was made outside the system.</p>
                    </div>
                </div>
                {notYetReceived && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4 text-sm">
                        <TbAlertTriangle className="text-xl mt-0.5 shrink-0" />
                        <div>
                            <p className="font-bold">Goods not yet received</p>
                            <p className="mt-0.5">This order has not been received yet. Paying before delivery is unusual — make sure this is intentional.</p>
                        </div>
                    </div>
                )}
                {data && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm flex justify-between">
                        <span className="text-gray-500 font-semibold">Amount to pay</span>
                        <span className="heading-text font-bold">
                            <NumericFormat displayType="text" value={data.invoice_amount ?? data.total_amount} prefix="$" decimalScale={2} fixedDecimalScale thousandSeparator />
                        </span>
                    </div>
                )}
                <div className="flex flex-col gap-4">
                    <FormItem label="Payment method">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {PAYMENT_METHODS.map((m) => (
                                <button
                                    key={m.value}
                                    type="button"
                                    onClick={() => { setPayMethod(m.value); setPayRef('') }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                                        payMethod === m.value
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                                    }`}
                                >
                                    <span className="text-base">{m.icon}</span>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </FormItem>
                    {PAYMENT_METHODS.find((m) => m.value === payMethod)?.refLabel && (
                        <FormItem label={PAYMENT_METHODS.find((m) => m.value === payMethod)!.refLabel!}>
                            <Input
                                placeholder={PAYMENT_METHODS.find((m) => m.value === payMethod)!.refLabel!}
                                value={payRef}
                                onChange={(e) => setPayRef(e.target.value)}
                            />
                        </FormItem>
                    )}
                    <FormItem label="Proof of payment (optional)">
                        <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                            proofFile ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-600 hover:border-primary/50'
                        }`}>
                            <TbPaperclip className="text-xl text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-500 truncate">
                                {proofFile ? proofFile.name : 'Attach receipt (PDF, JPG, PNG — max 5 MB)'}
                            </span>
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                            />
                        </label>
                        {proofFile && (
                            <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-500 mt-1"
                                onClick={() => setProofFile(null)}
                            >
                                Remove file
                            </button>
                        )}
                    </FormItem>
                    <FormItem label="Note (optional)">
                        <Input
                            textArea
                            rows={2}
                            placeholder="Any additional payment details..."
                            value={payNote}
                            onChange={(e) => setPayNote(e.target.value)}
                        />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="plain" onClick={() => setPayOpen(false)} disabled={savingPay}>Cancel</Button>
                    <Button variant="solid" loading={savingPay} onClick={handleMarkAsPaid}>Confirm Payment</Button>
                </div>
            </Dialog>

            {/* ── Dispute dialog ────────────────────────────────────────────── */}
            <Dialog isOpen={disputeOpen} onClose={() => setDisputeOpen(false)} onRequestClose={() => setDisputeOpen(false)}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-500 text-2xl">
                        <TbAlertTriangle />
                    </div>
                    <div>
                        <h5 className="font-semibold">Dispute Invoice</h5>
                        <p className="text-sm text-gray-500">Flag this invoice as incorrect or contested.</p>
                    </div>
                </div>
                <FormItem label="Reason for dispute">
                    <Input
                        textArea
                        rows={3}
                        placeholder="e.g. Invoice amount does not match PO — charged $50 extra"
                        value={disputeNote}
                        onChange={(e) => setDisputeNote(e.target.value)}
                    />
                </FormItem>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="plain" onClick={() => setDisputeOpen(false)} disabled={savingDispute}>Cancel</Button>
                    <Button
                        customColorClass={() => 'border-red-500 ring-1 ring-red-500 bg-red-500 hover:bg-red-600 text-white'}
                        loading={savingDispute}
                        disabled={!disputeNote.trim()}
                        onClick={handleDispute}
                    >
                        Dispute Invoice
                    </Button>
                </div>
            </Dialog>
        </Loading>
    )
}

export default PurchaseOrderDetails
