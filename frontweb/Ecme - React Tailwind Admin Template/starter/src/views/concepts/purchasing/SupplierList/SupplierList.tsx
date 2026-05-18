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
import { ADMIN, MANAGER } from '@/constants/roles.constant'
import type { ColumnDef } from '@/components/shared/DataTable'

const HAS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'yes', label: 'Yes' },
    { value: 'no',  label: 'No'  },
]

type FilterState = { hasEmail: string; hasPhone: string }
const emptyFilter: FilterState = { hasEmail: 'all', hasPhone: 'all' }
const EMPTY_FORM = { name: '', email: '', phone: '', address: '', contact_name: '', tax_number: '' }

const SupplierList = () => {
    const userAuthority = useSessionUser((s) => s.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, MANAGER])

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

    // ── Create / Edit ─────────────────────────────────────────────────────────
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
                <Notification type="success">{editing ? 'Supplier updated.' : 'Supplier created.'}</Notification>,
                { placement: 'top-center' },
            )
            setDialogOpen(false)
        } catch {
            toast.push(<Notification type="danger">Failed to save supplier.</Notification>, { placement: 'top-center' })
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
            toast.push(<Notification type="success">Supplier deleted.</Notification>, { placement: 'top-center' })
            setDeleteTarget(null)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete.'
            toast.push(<Notification type="danger">{msg}</Notification>, { placement: 'top-center' })
        } finally {
            setDeleting(false)
        }
    }

    const handleDeleteClick = useCallback((s: Supplier) => setDeleteTarget(s), [])

    // ── CSV ───────────────────────────────────────────────────────────────────
    const csvData = suppliers.map((s) => ({
        Name:           s.name,
        'Contact Person': s.contact_name ?? '',
        Email:          s.email          ?? '',
        Phone:          s.phone          ?? '',
        Address:        s.address        ?? '',
        'Tax Number':   s.tax_number     ?? '',
    }))

    // ── Columns ───────────────────────────────────────────────────────────────
    const columns: ColumnDef<Supplier>[] = useMemo(() => [
        {
            header: 'Supplier',
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
            header: 'Email',
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
            header: 'Phone',
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
            header: 'Tax Number',
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
                return canEdit ? (
                    <div className="flex justify-end text-lg gap-1">
                        <Tooltip wrapperClass="flex" title="Edit">
                            <span
                                className="cursor-pointer p-2 hover:text-primary"
                                onClick={() => openEdit(s)}
                            >
                                <TbPencil />
                            </span>
                        </Tooltip>
                        <Tooltip wrapperClass="flex" title="Delete">
                            <span
                                className="cursor-pointer p-2 hover:text-red-500"
                                onClick={() => handleDeleteClick(s)}
                            >
                                <TbTrash />
                            </span>
                        </Tooltip>
                    </div>
                ) : null
            },
        },
    ], [canEdit, openEdit, handleDeleteClick])

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
                            <h3>Suppliers</h3>
                            <div className="flex flex-col md:flex-row gap-3">
                                <CSVLink filename="suppliers.csv" data={csvData} className="w-full">
                                    <Button icon={<TbCloudDownload className="text-xl" />} className="w-full">
                                        Download
                                    </Button>
                                </CSVLink>
                                {canEdit && (
                                    <Button
                                        variant="solid"
                                        icon={<TbPlus className="text-xl" />}
                                        onClick={openCreate}
                                    >
                                        Add new
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <DebouceInput
                                placeholder="Search by name, email or contact..."
                                suffix={<TbSearch className="text-lg" />}
                                onChange={handleSearchChange}
                            />
                            <div className="relative inline-flex">
                                <Button
                                    icon={<TbFilter />}
                                    onClick={() => { setDraft(filter); setFilterOpen(true) }}
                                >
                                    Filter
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
                title="Filter"
                isOpen={filterOpen}
                onClose={() => setFilterOpen(false)}
                onRequestClose={() => setFilterOpen(false)}
            >
                <div className="flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-6 p-1">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Has email</label>
                            <Select
                                options={HAS_OPTIONS}
                                value={HAS_OPTIONS.find((o) => o.value === draft.hasEmail)}
                                onChange={(opt) => setDraft((f) => ({ ...f, hasEmail: opt?.value ?? 'all' }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Has phone</label>
                            <Select
                                options={HAS_OPTIONS}
                                value={HAS_OPTIONS.find((o) => o.value === draft.hasPhone)}
                                onChange={(opt) => setDraft((f) => ({ ...f, hasPhone: opt?.value ?? 'all' }))}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            onClick={() => { setDraft(emptyFilter); setFilter(emptyFilter); setFilterOpen(false) }}
                        >
                            Reset
                        </Button>
                        <Button variant="solid" className="flex-1" onClick={handleApplyFilter}>
                            Query
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
                <h5 className="mb-5 font-semibold">{editing ? 'Edit Supplier' : 'New Supplier'}</h5>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Supplier company name"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                placeholder="contact@supplier.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <Input
                                value={form.phone}
                                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                placeholder="+1 234 567 890"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Contact Person</label>
                        <Input
                            value={form.contact_name}
                            onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                            placeholder="John Smith"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Address</label>
                        <Input
                            textArea
                            rows={2}
                            value={form.address}
                            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                            placeholder="123 Main St, City, Country"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Tax / VAT Number</label>
                        <Input
                            value={form.tax_number}
                            onChange={(e) => setForm((f) => ({ ...f, tax_number: e.target.value }))}
                            placeholder="Optional"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={() => setDialogOpen(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="solid" loading={saving} onClick={handleSave}>
                        {editing ? 'Save' : 'Create'}
                    </Button>
                </div>
            </Dialog>

            {/* Delete confirm dialog */}
            <ConfirmDialog
                isOpen={deleteTarget !== null}
                type="danger"
                title="Delete Supplier"
                confirmButtonProps={{ loading: deleting }}
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            >
                <p>
                    Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
                    This action cannot be undone.
                </p>
            </ConfirmDialog>
        </>
    )
}

export default SupplierList
