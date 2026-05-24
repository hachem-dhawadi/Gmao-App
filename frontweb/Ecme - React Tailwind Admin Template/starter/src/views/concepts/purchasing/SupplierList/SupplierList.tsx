import { useState, useMemo, useCallback, type ChangeEvent } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import DataTable from '@/components/shared/DataTable'
import DebouceInput from '@/components/shared/DebouceInput'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Tooltip from '@/components/ui/Tooltip'
import Drawer from '@/components/ui/Drawer'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { TbPlus, TbPencil, TbTrash, TbSearch, TbFilter, TbCloudDownload, TbMail, TbPhone } from 'react-icons/tb'
import { CSVLink } from 'react-csv'
import {
    apiGetSuppliers,
    apiCreateSupplier,
    apiUpdateSupplier,
    apiDeleteSupplier,
} from '@/services/PurchasingService'
import type { Supplier, SuppliersResponse } from '@/services/PurchasingService'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@/components/shared/DataTable'

type FilterState = { hasEmail: string; hasPhone: string }
const emptyFilter: FilterState = { hasEmail: 'all', hasPhone: 'all' }
const EMPTY_FORM = { name: '', email: '', phone: '', address: '', contact_name: '', tax_number: '' }

const SupplierList = () => {
    const { t } = useTranslation()
    const userAuthority = useSessionUser((s) => s.user.authority)
    const canEdit = useAuthority(userAuthority, ['purchasing.write', 'admin', 'manager'])
    const canDelete = useAuthority(userAuthority, ['purchasing.delete', 'admin', 'manager'])

    const [search,      setSearch]      = useState('')
    const [pageIndex,   setPageIndex]   = useState(1)
    const [pageSize,    setPageSize]    = useState(10)
    const [filterOpen,  setFilterOpen]  = useState(false)
    const [filter,      setFilter]      = useState<FilterState>(emptyFilter)
    const [draft,       setDraft]       = useState<FilterState>(emptyFilter)
    const [dialogOpen,  setDialogOpen]  = useState(false)
    const [editing,     setEditing]     = useState<Supplier | null>(null)
    const [form,        setForm]        = useState(EMPTY_FORM)
    const [saving,      setSaving]      = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
    const [deleting,    setDeleting]    = useState(false)

    const hasOptions = [
        { value: 'all', label: t('purchasing.yesNo.all') },
        { value: 'yes', label: t('purchasing.yesNo.yes') },
        { value: 'no',  label: t('purchasing.yesNo.no')  },
    ]

    const { data, isLoading } = useSWR<SuppliersResponse>(
        ['/purchasing/suppliers', pageIndex, pageSize, search, filter.hasEmail, filter.hasPhone],
        () => apiGetSuppliers({
            per_page:  pageSize,
            page:      pageIndex,
            search:    search || undefined,
            has_email: filter.hasEmail !== 'all' ? filter.hasEmail : undefined,
            has_phone: filter.hasPhone !== 'all' ? filter.hasPhone : undefined,
        }),
        { revalidateOnFocus: false },
    )

    const suppliers  = (data?.data?.suppliers ?? []) as Supplier[]
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

    const openCreate = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setDialogOpen(true)
    }

    const openEdit = useCallback((s: Supplier) => {
        setEditing(s)
        setForm({
            name:         s.name,
            email:        s.email         ?? '',
            phone:        s.phone         ?? '',
            address:      s.address       ?? '',
            contact_name: s.contact_name  ?? '',
            tax_number:   s.tax_number    ?? '',
        })
        setDialogOpen(true)
    }, [])

    const handleSave = async () => {
        if (!form.name.trim()) return
        setSaving(true)
        try {
            if (editing) {
                await apiUpdateSupplier(editing.id, form)
            } else {
                await apiCreateSupplier(form)
            }
            await globalMutate((k) => Array.isArray(k) && k[0] === '/purchasing/suppliers')
            toast.push(
                <Notification type="success">
                    {editing ? t('purchasing.supplier.updated') : t('purchasing.supplier.created')}
                </Notification>,
                { placement: 'top-center' },
            )
            setDialogOpen(false)
        } catch {
            toast.push(<Notification type="danger">{t('purchasing.supplier.saveFailed')}</Notification>, { placement: 'top-center' })
        } finally {
            setSaving(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await apiDeleteSupplier(deleteTarget.id)
            await globalMutate((k) => Array.isArray(k) && k[0] === '/purchasing/suppliers')
            toast.push(<Notification type="success">{t('purchasing.supplier.deleted')}</Notification>, { placement: 'top-center' })
            setDeleteTarget(null)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('purchasing.supplier.saveFailed')
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setDeleting(false)
        }
    }

    const handleDeleteClick = useCallback((s: Supplier) => setDeleteTarget(s), [])

    const csvData = suppliers.map((s) => ({
        Name:           s.name,
        'Contact Person': s.contact_name ?? '',
        Email:          s.email          ?? '',
        Phone:          s.phone          ?? '',
        Address:        s.address        ?? '',
        'Tax Number':   s.tax_number     ?? '',
    }))

    const columns: ColumnDef<Supplier>[] = useMemo(() => [
        {
            header: t('purchasing.suppliersTitle'),
            accessorKey: 'name',
            cell: (props) => {
                const s = props.row.original
                return (
                    <div className="flex items-center gap-3">
                        <Avatar
                            shape="circle"
                            className="bg-primary/10 text-primary font-bold text-sm"
                        >
                            {s.name.slice(0, 2).toUpperCase()}
                        </Avatar>
                        <div>
                            <div className="heading-text font-bold">{s.name}</div>
                            {s.contact_name && (
                                <div className="text-sm text-gray-500">{s.contact_name}</div>
                            )}
                        </div>
                    </div>
                )
            },
        },
        {
            header: t('purchasing.columns.email'),
            accessorKey: 'email',
            cell: (props) => {
                const email = props.row.original.email
                return email ? (
                    <div className="flex items-center gap-2 text-sm">
                        <TbMail className="text-gray-400 text-base shrink-0" />
                        <span className="font-semibold">{email}</span>
                    </div>
                ) : (
                    <span className="text-gray-400">—</span>
                )
            },
        },
        {
            header: t('purchasing.columns.phone'),
            accessorKey: 'phone',
            cell: (props) => {
                const phone = props.row.original.phone
                return phone ? (
                    <div className="flex items-center gap-2 text-sm">
                        <TbPhone className="text-gray-400 text-base shrink-0" />
                        <span className="font-semibold">{phone}</span>
                    </div>
                ) : (
                    <span className="text-gray-400">—</span>
                )
            },
        },
        {
            header: t('purchasing.columns.taxNumber'),
            accessorKey: 'tax_number',
            cell: (props) => (
                <span className="font-mono text-sm font-semibold">
                    {props.row.original.tax_number ?? <span className="text-gray-400 font-sans">—</span>}
                </span>
            ),
        },
        {
            header: '',
            id: 'action',
            cell: (props) => {
                const s = props.row.original
                return (canEdit || canDelete) ? (
                    <div className="flex justify-end text-lg gap-1">
                        {canEdit && (
                            <Tooltip wrapperClass="flex" title={t('common.edit')}>
                                <span
                                    className="cursor-pointer p-2 hover:text-primary"
                                    onClick={() => openEdit(s)}
                                >
                                    <TbPencil />
                                </span>
                            </Tooltip>
                        )}
                        {canDelete && (
                            <Tooltip wrapperClass="flex" title={t('common.delete')}>
                                <span
                                    className="cursor-pointer p-2 hover:text-red-500"
                                    onClick={() => handleDeleteClick(s)}
                                >
                                    <TbTrash />
                                </span>
                            </Tooltip>
                        )}
                    </div>
                ) : null
            },
        },
    ], [canEdit, canDelete, openEdit, handleDeleteClick, t])

    const activeFilters = [
        filter.hasEmail !== 'all',
        filter.hasPhone !== 'all',
    ].filter(Boolean).length

    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3>{t('purchasing.suppliersTitle')}</h3>
                            <div className="flex flex-col md:flex-row gap-3">
                                <CSVLink filename="suppliers.csv" data={csvData} className="w-full">
                                    <Button icon={<TbCloudDownload className="text-xl" />} className="w-full">
                                        {t('common.download')}
                                    </Button>
                                </CSVLink>
                                {canEdit && (
                                    <Button
                                        variant="solid"
                                        icon={<TbPlus className="text-xl" />}
                                        onClick={openCreate}
                                    >
                                        {t('purchasing.new')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <DebouceInput
                                placeholder={t('purchasing.searchSuppliers')}
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
                            data={suppliers}
                            noData={!isLoading && suppliers.length === 0}
                            loading={isLoading}
                            pagingData={{
                                total:      pagination?.total ?? 0,
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
                            <label className="block text-sm font-semibold mb-2">{t('purchasing.filterLabels.hasEmail')}</label>
                            <Select
                                options={hasOptions}
                                value={hasOptions.find((o) => o.value === draft.hasEmail)}
                                onChange={(opt) => setDraft((f) => ({ ...f, hasEmail: opt?.value ?? 'all' }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">{t('purchasing.filterLabels.hasPhone')}</label>
                            <Select
                                options={hasOptions}
                                value={hasOptions.find((o) => o.value === draft.hasPhone)}
                                onChange={(opt) => setDraft((f) => ({ ...f, hasPhone: opt?.value ?? 'all' }))}
                            />
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

            {/* Create / Edit dialog */}
            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onRequestClose={() => setDialogOpen(false)}
            >
                <h5 className="mb-5 font-semibold">
                    {editing ? t('purchasing.supplier.editTitle') : t('purchasing.supplier.createTitle')}
                </h5>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            {t('purchasing.supplier.nameLabel')} <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder={t('purchasing.supplier.namePlaceholder')}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('common.email')}</label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                placeholder={t('purchasing.supplier.emailPlaceholder')}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('common.phone')}</label>
                            <Input
                                value={form.phone}
                                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                placeholder={t('purchasing.supplier.phonePlaceholder')}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('purchasing.supplier.contactPerson')}</label>
                        <Input
                            value={form.contact_name}
                            onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                            placeholder={t('purchasing.supplier.contactPlaceholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('purchasing.supplier.addressLabel')}</label>
                        <Input
                            textArea
                            rows={2}
                            value={form.address}
                            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                            placeholder={t('purchasing.supplier.addressPlaceholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('purchasing.supplier.taxLabel')}</label>
                        <Input
                            value={form.tax_number}
                            onChange={(e) => setForm((f) => ({ ...f, tax_number: e.target.value }))}
                            placeholder={t('purchasing.supplier.taxPlaceholder')}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={() => setDialogOpen(false)} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="solid" loading={saving} onClick={handleSave}>
                        {editing ? t('common.save') : t('common.create')}
                    </Button>
                </div>
            </Dialog>

            {/* Delete confirm dialog */}
            <ConfirmDialog
                isOpen={deleteTarget !== null}
                type="danger"
                title={t('purchasing.supplier.deleteTitle')}
                confirmButtonProps={{ loading: deleting }}
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            >
                <p>{t('purchasing.supplier.deleteConfirm', { name: deleteTarget?.name })}</p>
            </ConfirmDialog>
        </>
    )
}

export default SupplierList
