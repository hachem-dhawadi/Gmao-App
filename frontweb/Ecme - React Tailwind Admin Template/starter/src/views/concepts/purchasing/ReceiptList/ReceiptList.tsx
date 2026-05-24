import { useState, useMemo, type ChangeEvent } from 'react'
import useSWR from 'swr'
import { useNavigate } from 'react-router-dom'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import DataTable from '@/components/shared/DataTable'
import DebouceInput from '@/components/shared/DebouceInput'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import Drawer from '@/components/ui/Drawer'
import DatePicker from '@/components/ui/DatePicker'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Input from '@/components/ui/Input'
import { TbSearch, TbFilter, TbEye, TbCloudDownload, TbPackageImport } from 'react-icons/tb'
import { CSVLink } from 'react-csv'
import { NumericFormat } from 'react-number-format'
import { apiGetReceipts } from '@/services/PurchasingService'
import type { Receipt, ReceiptsResponse } from '@/services/PurchasingService'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import type { ColumnDef } from '@/components/shared/DataTable'

type FilterState = {
    dateRange: [Date | null, Date | null]
    minValue: string
    maxValue: string
}

const emptyFilter: FilterState = { dateRange: [null, null], minValue: '', maxValue: '' }

const ReceiptList = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()

    const [search,     setSearch]     = useState('')
    const [pageIndex,  setPageIndex]  = useState(1)
    const [pageSize,   setPageSize]   = useState(10)
    const [filterOpen, setFilterOpen] = useState(false)
    const [filter, setFilter] = useState<FilterState>(emptyFilter)
    const [draft,  setDraft]  = useState<FilterState>(emptyFilter)

    const { data, isLoading } = useSWR<ReceiptsResponse>(
        ['/purchasing/receipts', pageIndex, pageSize, search, filter.dateRange[0], filter.dateRange[1], filter.minValue, filter.maxValue],
        () => apiGetReceipts({
            per_page:   pageSize,
            page:       pageIndex,
            search:     search || undefined,
            date_from:  filter.dateRange[0] ? filter.dateRange[0].toISOString().substring(0, 10) : undefined,
            date_to:    filter.dateRange[1] ? filter.dateRange[1].toISOString().substring(0, 10) : undefined,
            min_value:  filter.minValue || undefined,
            max_value:  filter.maxValue || undefined,
        }),
        { revalidateOnFocus: false },
    )

    const receipts   = (data?.data?.receipts ?? []) as Receipt[]
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

    const csvData = receipts.map((r) => ({
        'Receipt #': `#${r.id}`,
        'PO Code':   r.po_code ?? '',
        Supplier:    r.supplier ?? '',
        Items:       r.lines.map((l) => `${l.item?.name ?? '?'} x${l.qty_received}`).join(', '),
        'Total Value': r.lines.reduce((acc, l) => acc + l.qty_received * l.unit_price, 0).toFixed(2),
        'Received At': r.received_at ? dayjs(r.received_at).format('DD/MM/YYYY HH:mm') : '',
    }))

    const columns: ColumnDef<Receipt>[] = useMemo(() => [
        {
            header: t('purchasing.columns.receipt'),
            accessorKey: 'id',
            cell: (props) => (
                <span className="font-bold heading-text font-mono">
                    #{String(props.row.original.id).padStart(4, '0')}
                </span>
            ),
        },
        {
            header: t('purchasing.columns.po'),
            accessorKey: 'po_code',
            cell: (props) => {
                const r = props.row.original
                return r.po_id ? (
                    <span
                        className="cursor-pointer font-bold heading-text hover:text-primary font-mono"
                        onClick={() => navigate(`/concepts/purchasing/purchase-orders/${r.po_id}`)}
                    >
                        #{r.po_code}
                    </span>
                ) : (
                    <span className="text-gray-400">—</span>
                )
            },
        },
        {
            header: t('purchasing.columns.supplier'),
            accessorKey: 'supplier',
            cell: (props) => {
                const name = props.row.original.supplier
                return name ? (
                    <div className="flex items-center gap-2">
                        <Avatar
                            shape="circle"
                            size={28}
                            className="bg-primary/10 text-primary font-bold text-xs"
                        >
                            {name.slice(0, 2).toUpperCase()}
                        </Avatar>
                        <span className="font-semibold">{name}</span>
                    </div>
                ) : (
                    <span className="text-gray-400">—</span>
                )
            },
        },
        {
            header: t('purchasing.columns.itemsReceived'),
            id: 'items',
            cell: (props) => {
                const lines = props.row.original.lines
                return (
                    <div className="space-y-0.5">
                        {lines.slice(0, 2).map((l, i) => (
                            <p key={i} className="text-sm text-gray-600 dark:text-gray-400">
                                {l.item?.name ?? '?'}{' '}
                                <span className="text-gray-400 font-mono">×{l.qty_received}</span>
                            </p>
                        ))}
                        {lines.length > 2 && (
                            <p className="text-xs text-gray-400">+{lines.length - 2} more</p>
                        )}
                    </div>
                )
            },
        },
        {
            header: t('purchasing.columns.totalValue'),
            id: 'total_value',
            cell: (props) => {
                const total = props.row.original.lines.reduce(
                    (acc, l) => acc + l.qty_received * l.unit_price,
                    0,
                )
                return (
                    <NumericFormat
                        className="heading-text font-bold"
                        displayType="text"
                        value={total.toFixed(2)}
                        prefix="$"
                        thousandSeparator
                        fixedDecimalScale
                        decimalScale={2}
                    />
                )
            },
        },
        {
            header: t('purchasing.columns.receivedAt'),
            accessorKey: 'received_at',
            cell: (props) => (
                <span className="font-semibold">
                    {props.row.original.received_at
                        ? dayjs(props.row.original.received_at).format('DD/MM/YYYY HH:mm')
                        : '—'}
                </span>
            ),
        },
        {
            header: '',
            id: 'action',
            cell: (props) => {
                const r = props.row.original
                return r.po_id ? (
                    <div className="flex justify-end text-lg">
                        <Tooltip wrapperClass="flex" title={t('purchasing.receipt.viewPO')}>
                            <span
                                className="cursor-pointer p-2 hover:text-primary"
                                onClick={() => navigate(`/concepts/purchasing/purchase-orders/${r.po_id}`)}
                            >
                                <TbEye />
                            </span>
                        </Tooltip>
                    </div>
                ) : null
            },
        },
    ], [navigate, t])

    const activeFilters = [
        filter.dateRange[0] !== null,
        filter.minValue !== '',
        filter.maxValue !== '',
    ].filter(Boolean).length

    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div className="flex items-center gap-3">
                                <TbPackageImport className="text-2xl text-primary" />
                                <h3>{t('purchasing.receiptsTitle')}</h3>
                            </div>
                            <CSVLink filename="receipts.csv" data={csvData} className="w-full md:w-auto">
                                <Button icon={<TbCloudDownload className="text-xl" />} className="w-full">
                                    {t('common.download')}
                                </Button>
                            </CSVLink>
                        </div>

                        {/* Toolbar */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <DebouceInput
                                placeholder={t('purchasing.searchReceipts')}
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
                            data={receipts}
                            noData={!isLoading && receipts.length === 0}
                            loading={isLoading}
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
                            <label className="block text-sm font-semibold mb-2">{t('purchasing.filterLabels.receivedDate')}</label>
                            <DatePicker.DatePickerRange
                                value={draft.dateRange as [Date, Date]}
                                onChange={(val) =>
                                    setDraft((f) => ({ ...f, dateRange: val as [Date | null, Date | null] }))
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">{t('purchasing.filterLabels.totalValue')}</label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="Min"
                                    value={draft.minValue}
                                    onChange={(e) => setDraft((f) => ({ ...f, minValue: e.target.value }))}
                                />
                                <span className="text-gray-400 shrink-0">—</span>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="Max"
                                    value={draft.maxValue}
                                    onChange={(e) => setDraft((f) => ({ ...f, maxValue: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            onClick={() => { setDraft(emptyFilter); setFilter(emptyFilter); setFilterOpen(false) }}
                        >
                            {t('common.reset')}
                        </Button>
                        <Button variant="solid" className="flex-1" onClick={handleApplyFilter}>
                            {t('common.apply')}
                        </Button>
                    </div>
                </div>
            </Drawer>
        </>
    )
}

export default ReceiptList
