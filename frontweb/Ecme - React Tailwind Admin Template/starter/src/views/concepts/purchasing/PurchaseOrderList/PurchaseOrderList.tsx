import { useState, useMemo, useCallback, type ChangeEvent } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { useNavigate } from 'react-router-dom'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import DataTable from '@/components/shared/DataTable'
import DebouceInput from '@/components/shared/DebouceInput'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import Drawer from '@/components/ui/Drawer'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import Badge from '@/components/ui/Badge'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { TbPlus, TbSearch, TbFilter, TbEye, TbTrash, TbCloudDownload } from 'react-icons/tb'
import { CSVLink } from 'react-csv'
import { NumericFormat } from 'react-number-format'
import { apiGetPurchaseOrders, apiDeletePurchaseOrder } from '@/services/PurchasingService'
import type { PurchaseOrder, PurchaseOrdersResponse } from '@/services/PurchasingService'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import type { ColumnDef } from '@/components/shared/DataTable'

const orderStatusColor: Record<string, { bgClass: string; textClass: string; dot: string }> = {
    draft:              { bgClass: 'bg-gray-100 dark:bg-gray-700',          textClass: 'text-gray-500',                          dot: 'bg-gray-400'    },
    ordered:            { bgClass: 'bg-blue-100 dark:bg-blue-500/20',       textClass: 'text-blue-600 dark:text-blue-400',       dot: 'bg-blue-500'    },
    partially_received: { bgClass: 'bg-amber-100 dark:bg-amber-500/20',     textClass: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500'   },
    received:           { bgClass: 'bg-emerald-100 dark:bg-emerald-500/20', textClass: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    cancelled:          { bgClass: 'bg-red-100 dark:bg-red-500/20',         textClass: 'text-red-500',                           dot: 'bg-red-500'     },
}

const paymentStatusColor: Record<string, { bgClass: string; textClass: string }> = {
    pending:  { bgClass: 'bg-amber-100 dark:bg-amber-500/20',     textClass: 'text-amber-600 dark:text-amber-400'     },
    paid:     { bgClass: 'bg-emerald-100 dark:bg-emerald-500/20', textClass: 'text-emerald-600 dark:text-emerald-400' },
    disputed: { bgClass: 'bg-red-100 dark:bg-red-500/20',         textClass: 'text-red-500'                           },
}

type FilterState = { status: string; paymentStatus: string; dateRange: [Date | null, Date | null] }

const OrderCodeCell = ({ row }: { row: PurchaseOrder }) => {
    const navigate = useNavigate()
    return (
        <span
            className="cursor-pointer font-bold heading-text hover:text-primary font-mono"
            onClick={() => navigate(`/concepts/purchasing/purchase-orders/${row.id}`)}
        >
            #{row.code}
        </span>
    )
}

const OrderStatusBadge = ({ status }: { status: string }) => {
    const { t } = useTranslation()
    const cfg = orderStatusColor[status] ?? orderStatusColor.draft
    return (
        <Tag className={`border-0 ${cfg.bgClass}`}>
            <span className={`capitalize font-semibold ${cfg.textClass}`}>
                {t(`purchasing.orderStatuses.${status}`)}
            </span>
        </Tag>
    )
}

const PaymentStatusBadge = ({ status }: { status: string | null }) => {
    const { t } = useTranslation()
    if (!status) return <span className="text-gray-400 text-sm">—</span>
    const pc = paymentStatusColor[status]
    if (!pc) return <span className="text-gray-400 text-sm">{status}</span>
    return (
        <Tag className={`border-0 ${pc.bgClass}`}>
            <span className={`capitalize font-semibold ${pc.textClass}`}>
                {t(`purchasing.paymentStatuses.${status}`)}
            </span>
        </Tag>
    )
}

const ActionCell = ({
    row,
    canDelete,
    onDeleteClick,
}: {
    row: PurchaseOrder
    canDelete: boolean
    onDeleteClick: (order: PurchaseOrder) => void
}) => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    return (
        <div className="flex justify-end text-lg gap-1" onClick={(e) => e.stopPropagation()}>
            <Tooltip wrapperClass="flex" title={t('common.view')}>
                <span
                    className="cursor-pointer p-2 hover:text-primary"
                    onClick={() => navigate(`/concepts/purchasing/purchase-orders/${row.id}`)}
                >
                    <TbEye />
                </span>
            </Tooltip>
            {canDelete && (
                <Tooltip wrapperClass="flex" title={t('common.delete')}>
                    <span
                        className="cursor-pointer p-2 hover:text-red-500"
                        onClick={() => onDeleteClick(row)}
                    >
                        <TbTrash />
                    </span>
                </Tooltip>
            )}
        </div>
    )
}

const PurchaseOrderList = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const userAuthority = useSessionUser((s) => s.user.authority)
    const canEdit = useAuthority(userAuthority, ['purchasing.write', 'admin', 'manager'])
    const canDelete = useAuthority(userAuthority, ['purchasing.delete', 'admin', 'manager'])

    const [search, setSearch]               = useState('')
    const [pageIndex, setPageIndex]         = useState(1)
    const [pageSize, setPageSize]           = useState(10)
    const [filterOpen, setFilterOpen]       = useState(false)
    const [filter, setFilter]               = useState<FilterState>({ status: 'all', paymentStatus: 'all', dateRange: [null, null] })
    const [draft, setDraft]                 = useState<FilterState>({ status: 'all', paymentStatus: 'all', dateRange: [null, null] })
    const [deleteTarget, setDeleteTarget]   = useState<PurchaseOrder | null>(null)
    const [deleting, setDeleting]           = useState(false)

    const statusFilterOptions = [
        { value: 'all',                label: t('purchasing.orderStatuses.all'),               dot: 'bg-gray-400'    },
        { value: 'draft',              label: t('purchasing.orderStatuses.draft'),              dot: 'bg-gray-400'    },
        { value: 'ordered',            label: t('purchasing.orderStatuses.ordered'),            dot: 'bg-blue-500'    },
        { value: 'partially_received', label: t('purchasing.orderStatuses.partially_received'), dot: 'bg-amber-500'   },
        { value: 'received',           label: t('purchasing.orderStatuses.received'),           dot: 'bg-emerald-500' },
        { value: 'cancelled',          label: t('purchasing.orderStatuses.cancelled'),          dot: 'bg-red-500'     },
    ]

    const paymentFilterOptions = [
        { value: 'all',      label: t('purchasing.paymentStatuses.all'),     dot: 'bg-gray-400'    },
        { value: 'none',     label: t('purchasing.paymentStatuses.none'),    dot: 'bg-gray-300'    },
        { value: 'pending',  label: t('purchasing.paymentStatuses.pending'), dot: 'bg-amber-500'   },
        { value: 'paid',     label: t('purchasing.paymentStatuses.paid'),    dot: 'bg-emerald-500' },
        { value: 'disputed', label: t('purchasing.paymentStatuses.disputed'),dot: 'bg-red-500'     },
    ]

    const { data, isLoading } = useSWR<PurchaseOrdersResponse>(
        ['/purchasing/orders', pageIndex, pageSize, filter.status, filter.paymentStatus, search],
        () => apiGetPurchaseOrders({
            per_page:       pageSize,
            page:           pageIndex,
            status:         filter.status !== 'all'        ? filter.status        : undefined,
            payment_status: filter.paymentStatus !== 'all' ? filter.paymentStatus : undefined,
            search:         search || undefined,
        }),
        { revalidateOnFocus: false },
    )

    const orders     = (data?.data?.purchase_orders ?? []) as PurchaseOrder[]
    const pagination = data?.data?.pagination

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
        setPageIndex(1)
    }

    const handleApplyFilter = () => {
        setFilter(draft)
        setPageIndex(1)
        setFilterOpen(false)
    }

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await apiDeletePurchaseOrder(String(deleteTarget.id))
            await globalMutate((k) => Array.isArray(k) && k[0] === '/purchasing/orders')
            toast.push(<Notification type="success">{t('purchasing.order.deleted')}</Notification>, { placement: 'top-center' })
            setDeleteTarget(null)
        } catch {
            toast.push(<Notification type="danger">{t('purchasing.order.deleteOnlyDraft')}</Notification>, { placement: 'top-center' })
        } finally {
            setDeleting(false)
        }
    }

    const handleDeleteClick = useCallback((order: PurchaseOrder) => {
        setDeleteTarget(order)
    }, [])

    const csvData = orders.map((o) => ({
        Code: o.code,
        Date: o.created_at ? dayjs(o.created_at).format('DD/MM/YYYY') : '',
        Supplier: o.supplier?.name ?? '',
        Status: o.status,
        'Expected Delivery': o.expected_delivery_at ? dayjs(o.expected_delivery_at).format('DD/MM/YYYY') : '',
        Total: o.total_amount.toFixed(2),
    }))

    const columns: ColumnDef<PurchaseOrder>[] = useMemo(() => [
        {
            header: t('purchasing.columns.order'),
            accessorKey: 'code',
            cell: (props) => <OrderCodeCell row={props.row.original} />,
        },
        {
            header: t('purchasing.columns.date'),
            accessorKey: 'created_at',
            cell: (props) => (
                <span className="font-semibold">
                    {props.row.original.created_at
                        ? dayjs(props.row.original.created_at).format('DD/MM/YYYY')
                        : '—'}
                </span>
            ),
        },
        {
            header: t('purchasing.columns.supplier'),
            accessorKey: 'supplier',
            cell: (props) => (
                <span className="font-semibold">{props.row.original.supplier?.name ?? '—'}</span>
            ),
        },
        {
            header: t('purchasing.columns.status'),
            accessorKey: 'status',
            cell: (props) => <OrderStatusBadge status={props.row.original.status} />,
        },
        {
            header: t('purchasing.columns.expectedDelivery'),
            accessorKey: 'expected_delivery_at',
            cell: (props) => (
                <span className="font-semibold">
                    {props.row.original.expected_delivery_at
                        ? dayjs(props.row.original.expected_delivery_at).format('DD/MM/YYYY')
                        : '—'}
                </span>
            ),
        },
        {
            header: t('purchasing.columns.total'),
            accessorKey: 'total_amount',
            cell: (props) => (
                <NumericFormat
                    className="heading-text font-bold"
                    displayType="text"
                    value={(Math.round(props.row.original.total_amount * 100) / 100).toFixed(2)}
                    prefix="$"
                    thousandSeparator
                />
            ),
        },
        {
            header: t('purchasing.columns.payment'),
            id: 'payment_status',
            cell: (props) => <PaymentStatusBadge status={props.row.original.payment_status} />,
        },
        {
            header: '',
            id: 'action',
            cell: (props) => (
                <ActionCell
                    row={props.row.original}
                    canDelete={canDelete}
                    onDeleteClick={handleDeleteClick}
                />
            ),
        },
    ], [canDelete, handleDeleteClick, t])

    const activeFilters = [
        filter.status !== 'all',
        filter.paymentStatus !== 'all',
        filter.dateRange[0] !== null,
    ].filter(Boolean).length

    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3>{t('purchasing.ordersTitle')}</h3>
                            <div className="flex flex-col md:flex-row gap-3">
                                <CSVLink filename="purchase-orders.csv" data={csvData} className="w-full">
                                    <Button icon={<TbCloudDownload className="text-xl" />} className="w-full">
                                        {t('common.download')}
                                    </Button>
                                </CSVLink>
                                {canEdit && (
                                    <Button
                                        variant="solid"
                                        icon={<TbPlus className="text-xl" />}
                                        onClick={() => navigate('/concepts/purchasing/purchase-orders/create')}
                                    >
                                        {t('purchasing.new')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <DebouceInput
                                placeholder={t('purchasing.searchOrders')}
                                suffix={<TbSearch className="text-lg" />}
                                onChange={handleSearchChange}
                            />
                            <div className="relative inline-flex">
                                <Button
                                    icon={<TbFilter />}
                                    onClick={() => { setDraft(filter); setFilterOpen(true) }}
                                >
                                    {t('common.filter')}{activeFilters > 0 ? ` (${activeFilters})` : ''}
                                </Button>
                                {activeFilters > 0 && (
                                    <Badge
                                        className="absolute -top-1.5 -right-1.5"
                                        content={activeFilters}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Table */}
                        <DataTable
                            columns={columns}
                            data={orders}
                            noData={!isLoading && orders.length === 0}
                            loading={isLoading}
                            onRowClick={(row) => navigate(`/concepts/purchasing/purchase-orders/${row.id}`)}
                            pagingData={{
                                total: pagination?.total ?? 0,
                                pageIndex,
                                pageSize,
                            }}
                            onPaginationChange={setPageIndex}
                            onSelectChange={(size) => { setPageSize(size); setPageIndex(1) }}
                        />
                    </div>
                </AdaptiveCard>
            </Container>

            {/* Filter drawer */}
            <Drawer
                title={t('common.filter')}
                isOpen={filterOpen}
                onClose={() => setFilterOpen(false)}
                onRequestClose={() => setFilterOpen(false)}
            >
                <div className="flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-6 p-1">
                        <div>
                            <label className="block text-sm font-semibold mb-2">{t('purchasing.filterLabels.orderDate')}</label>
                            <DatePicker.DatePickerRange
                                value={draft.dateRange as [Date, Date]}
                                onChange={(val) =>
                                    setDraft((f) => ({ ...f, dateRange: val as [Date | null, Date | null] }))
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">{t('purchasing.filterLabels.orderStatus')}</label>
                            <Select
                                options={statusFilterOptions}
                                value={statusFilterOptions.find((o) => o.value === draft.status)}
                                formatOptionLabel={(opt) => (
                                    <span className="flex items-center gap-2">
                                        <span className={`inline-block w-2 h-2 rounded-full ${opt.dot}`} />
                                        {opt.label}
                                    </span>
                                )}
                                onChange={(opt) => setDraft((f) => ({ ...f, status: opt?.value ?? 'all' }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">{t('purchasing.filterLabels.paymentStatus')}</label>
                            <Select
                                options={paymentFilterOptions}
                                value={paymentFilterOptions.find((o) => o.value === draft.paymentStatus)}
                                formatOptionLabel={(opt) => (
                                    <span className="flex items-center gap-2">
                                        <span className={`inline-block w-2 h-2 rounded-full ${opt.dot}`} />
                                        {opt.label}
                                    </span>
                                )}
                                onChange={(opt) => setDraft((f) => ({ ...f, paymentStatus: opt?.value ?? 'all' }))}
                            />
                        </div>
                    </div>
                    <Button variant="solid" onClick={handleApplyFilter}>
                        {t('common.apply')}
                    </Button>
                </div>
            </Drawer>

            <ConfirmDialog
                isOpen={deleteTarget !== null}
                type="danger"
                title={t('purchasing.order.deleteTitle')}
                confirmButtonProps={{ loading: deleting }}
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            >
                <p>{t('purchasing.order.deleteConfirm', { code: deleteTarget?.code })}</p>
            </ConfirmDialog>
        </>
    )
}

export default PurchaseOrderList
