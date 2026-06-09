import { useMemo, useState } from 'react'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import Tag from '@/components/ui/Tag'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useSiteList from '../hooks/useSiteList'
import { useNavigate } from 'react-router-dom'
import { apiDeleteSite } from '@/services/SiteService'
import { mutate as globalMutate } from 'swr'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbTrash, TbPhone } from 'react-icons/tb'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import type { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable'
import type { Site } from '../types'
import type { TableQueries } from '@/@types/common'

const CodeBadge = ({ code }: { code: string }) => (
    <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs border-0">
        {code}
    </Tag>
)

const ActiveBadge = ({ active }: { active: boolean }) => (
    <Tag
        className={
            active
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 text-xs'
                : 'bg-gray-100 dark:bg-gray-500/20 text-gray-500 dark:text-gray-400 border-0 text-xs'
        }
    >
        {active ? 'Active' : 'Inactive'}
    </Tag>
)

type ActionColumnProps = {
    site: Site
    canEdit: boolean
    canDelete: boolean
    onDeleted: () => void
}

const ActionColumn = ({ site, canEdit, canDelete, onDeleted }: ActionColumnProps) => {
    const navigate = useNavigate()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleConfirmDelete = async () => {
        try {
            setIsDeleting(true)
            await apiDeleteSite(site.id)
            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/sites',
            )
            toast.push(
                <Notification type="success">
                    Site <strong>{site.name}</strong> deleted.
                </Notification>,
                { placement: 'top-center' },
            )
            onDeleted()
        } catch {
            toast.push(
                <Notification type="danger">Failed to delete site.</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setIsDeleting(false)
            setDeleteOpen(false)
        }
    }

    return (
        <>
            <div className="flex items-center justify-end gap-3">
                {canEdit && (
                    <Tooltip title="Edit">
                        <div
                            className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                            role="button"
                            onClick={() =>
                                navigate(`/concepts/sites/site-edit/${site.id}`)
                            }
                        >
                            <TbPencil />
                        </div>
                    </Tooltip>
                )}
                {canDelete && (
                    <Tooltip title="Delete">
                        <div
                            className="text-xl cursor-pointer select-none text-gray-500 hover:text-red-500"
                            role="button"
                            onClick={() => setDeleteOpen(true)}
                        >
                            <TbTrash />
                        </div>
                    </Tooltip>
                )}
            </div>

            <ConfirmDialog
                isOpen={deleteOpen}
                type="danger"
                title="Delete Site"
                onClose={() => setDeleteOpen(false)}
                onRequestClose={() => setDeleteOpen(false)}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                confirmButtonProps={{ loading: isDeleting }}
            >
                <p>
                    Are you sure you want to delete{' '}
                    <strong>{site.name}</strong>? This action cannot be undone.
                </p>
            </ConfirmDialog>
        </>
    )
}

const SiteListTable = () => {
    const navigate = useNavigate()

    const {
        siteList,
        siteListTotal,
        tableData,
        isLoading,
        setTableData,
        selectedSite,
        setSelectedSite,
        setSelectAllSite,
        mutate,
    } = useSiteList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, ['sites.update', 'admin'])
    const canDelete = useAuthority(userAuthority, ['sites.delete', 'admin'])

    const columns: ColumnDef<Site>[] = useMemo(
        () => [
            {
                header: 'Name',
                accessorKey: 'name',
                cell: (props) => (
                    <div
                        className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary"
                        onClick={() =>
                            navigate(
                                `/concepts/sites/site-edit/${props.row.original.id}`,
                            )
                        }
                    >
                        {props.row.original.name}
                    </div>
                ),
            },
            {
                header: 'Code',
                accessorKey: 'code',
                cell: (props) => <CodeBadge code={props.row.original.code} />,
            },
            {
                header: 'Status',
                accessorKey: 'is_active',
                cell: (props) => (
                    <ActiveBadge active={props.row.original.is_active} />
                ),
            },
            {
                header: 'Phone',
                accessorKey: 'phone',
                cell: (props) => (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                        {props.row.original.phone ? (
                            <>
                                <TbPhone className="text-gray-400 shrink-0" />
                                {props.row.original.phone}
                            </>
                        ) : (
                            <span className="text-gray-400">—</span>
                        )}
                    </div>
                ),
            },
            {
                header: 'Timezone',
                accessorKey: 'timezone',
                cell: (props) => (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {props.row.original.timezone || 'UTC'}
                    </span>
                ),
            },
            {
                header: 'Address',
                accessorKey: 'address',
                cell: (props) => (
                    <span className="text-gray-500 dark:text-gray-400 truncate max-w-xs block">
                        {props.row.original.address || '—'}
                    </span>
                ),
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn
                        site={props.row.original}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onDeleted={() => mutate()}
                    />
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [canEdit, canDelete],
    )

    const handleSetTableData = (data: TableQueries) => {
        setTableData(data)
        if (selectedSite.length > 0) setSelectAllSite([])
    }

    const handlePaginationChange = (page: number) => {
        const newTableData = cloneDeep(tableData)
        newTableData.pageIndex = page
        handleSetTableData(newTableData)
    }

    const handleSelectChange = (value: number) => {
        const newTableData = cloneDeep(tableData)
        newTableData.pageSize = Number(value)
        newTableData.pageIndex = 1
        handleSetTableData(newTableData)
    }

    const handleSort = (sort: OnSortParam) => {
        const newTableData = cloneDeep(tableData)
        newTableData.sort = sort
        handleSetTableData(newTableData)
    }

    const handleRowSelect = (checked: boolean, row: Site) => {
        setSelectedSite(checked, row)
    }

    const handleAllRowSelect = (checked: boolean, rows: Row<Site>[]) => {
        if (checked) {
            setSelectAllSite(rows.map((r) => r.original))
        } else {
            setSelectAllSite([])
        }
    }

    return (
        <DataTable
            selectable
            columns={columns}
            data={siteList}
            noData={!isLoading && siteList.length === 0}
            loading={isLoading}
            pagingData={{
                total: siteListTotal,
                pageIndex: tableData.pageIndex as number,
                pageSize: tableData.pageSize as number,
            }}
            checkboxChecked={(row) => selectedSite.some((s) => s.id === row.id)}
            onPaginationChange={handlePaginationChange}
            onSelectChange={handleSelectChange}
            onSort={handleSort}
            onCheckBoxChange={handleRowSelect}
            onIndeterminateCheckBoxChange={handleAllRowSelect}
        />
    )
}

export default SiteListTable
