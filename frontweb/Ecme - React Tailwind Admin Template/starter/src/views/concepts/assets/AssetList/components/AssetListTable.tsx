import { useMemo, useState } from 'react'
import DataTable from '@/components/shared/DataTable'
import Tooltip from '@/components/ui/Tooltip'
import Tag from '@/components/ui/Tag'
import Avatar from '@/components/ui/Avatar'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useAssetList from '../hooks/useAssetList'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { apiDeleteAsset } from '@/services/AssetsService'
import { mutate as globalMutate } from 'swr'
import cloneDeep from 'lodash/cloneDeep'
import { TbPencil, TbTrash, TbEye } from 'react-icons/tb'
import { TbEngine } from 'react-icons/tb'
import { useTranslation } from 'react-i18next'
import type { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable'
import type { Asset } from '../types'
import type { TableQueries } from '@/@types/common'

const statusColor: Record<Asset['status'], string> = {
    active:            'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0',
    inactive:          'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-0',
    under_maintenance: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0',
    decommissioned:    'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-0',
}

const StatusBadge = ({ status }: { status: Asset['status'] }) => {
    const { t } = useTranslation()
    return <Tag className={`text-xs ${statusColor[status]}`}>{t(`assets.status.${status}`)}</Tag>
}

const AssetListTable = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()

    const {
        assetList,
        assetListTotal,
        tableData,
        isLoading,
        setTableData,
        selectedAsset,
        setSelectedAsset,
        setSelectAllAsset,
        mutate,
    } = useAssetList()

    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, ['assets.write', 'admin', 'manager'])
    const canDelete = useAuthority(userAuthority, ['assets.delete', 'admin'])

    const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            await apiDeleteAsset(deleteTarget.id)
            await mutate()
            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/assets',
            )
            toast.push(
                <Notification type="success">{t('assets.toast.deleted')}</Notification>,
                { placement: 'top-center' },
            )
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? t('assets.toast.deleteFailed')
            toast.push(
                <Notification type="danger">{msg}</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setDeleteTarget(null)
        }
    }

    const columns: ColumnDef<Asset>[] = useMemo(
        () => [
            {
                header: t('assets.columns.asset'),
                accessorKey: 'name',
                cell: (props) => {
                    const row = props.row.original
                    const firstImage = row.images?.[0]
                    return (
                        <div className="flex items-center gap-3">
                            <Avatar
                                shape="round"
                                size={50}
                                {...(firstImage
                                    ? { src: firstImage }
                                    : { icon: <TbEngine /> })}
                            />
                            <div>
                                <div className="font-bold heading-text mb-0.5">
                                    {row.name}
                                </div>
                                <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs border-0">
                                    {row.code}
                                </Tag>
                            </div>
                        </div>
                    )
                },
            },
            {
                header: t('assets.columns.type'),
                accessorKey: 'asset_type',
                cell: (props) =>
                    props.row.original.asset_type ? (
                        <Tag className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs border-0">
                            {props.row.original.asset_type.name}
                        </Tag>
                    ) : (
                        <span className="text-gray-400">—</span>
                    ),
            },
            {
                header: 'Site',
                accessorKey: 'site',
                cell: (props) =>
                    props.row.original.site ? (
                        <Tag className="bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs border-0">
                            {props.row.original.site.name}
                        </Tag>
                    ) : (
                        <span className="text-gray-400">—</span>
                    ),
            },
            {
                header: t('assets.columns.status'),
                accessorKey: 'status',
                cell: (props) => (
                    <StatusBadge status={props.row.original.status} />
                ),
            },
            {
                header: t('assets.columns.manufacturerModel'),
                accessorKey: 'manufacturer',
                cell: (props) => {
                    const { manufacturer, model } = props.row.original
                    if (!manufacturer && !model)
                        return <span className="text-gray-400">—</span>
                    return (
                        <span className="text-sm heading-text">
                            {[manufacturer, model].filter(Boolean).join(' · ')}
                        </span>
                    )
                },
            },
            {
                header: t('assets.columns.location'),
                accessorKey: 'location',
                cell: (props) => (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {props.row.original.location || '—'}
                    </span>
                ),
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <div className="flex items-center justify-end gap-3">
                        <Tooltip title={t('common.view')}>
                            <div
                                className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                                role="button"
                                onClick={() =>
                                    navigate(
                                        `/concepts/assets/asset-details/${props.row.original.id}`,
                                    )
                                }
                            >
                                <TbEye />
                            </div>
                        </Tooltip>
                        {canEdit && (
                            <Tooltip title={t('common.edit')}>
                                <div
                                    className="text-xl cursor-pointer select-none text-gray-500 hover:text-primary"
                                    role="button"
                                    onClick={() =>
                                        navigate(
                                            `/concepts/assets/asset-edit/${props.row.original.id}`,
                                        )
                                    }
                                >
                                    <TbPencil />
                                </div>
                            </Tooltip>
                        )}
                        {canDelete && (
                            <Tooltip title={t('common.delete')}>
                                <div
                                    className="text-xl cursor-pointer select-none text-gray-500 hover:text-red-500"
                                    role="button"
                                    onClick={() =>
                                        setDeleteTarget(props.row.original)
                                    }
                                >
                                    <TbTrash />
                                </div>
                            </Tooltip>
                        )}
                    </div>
                ),
            },
        ],
        [canEdit, canDelete, navigate, t],
    )

    const handleSetTableData = (data: TableQueries) => {
        setTableData(data)
        if (selectedAsset.length > 0) {
            setSelectAllAsset([])
        }
    }

    return (
        <>
            <DataTable
                selectable
                columns={columns}
                data={assetList}
                noData={!isLoading && assetList.length === 0}
                loading={isLoading}
                pagingData={{
                    total: assetListTotal,
                    pageIndex: tableData.pageIndex as number,
                    pageSize: tableData.pageSize as number,
                }}
                checkboxChecked={(row) =>
                    selectedAsset.some((a) => a.id === row.id)
                }
                onPaginationChange={(page) => {
                    const next = cloneDeep(tableData)
                    next.pageIndex = page
                    handleSetTableData(next)
                }}
                onSelectChange={(value) => {
                    const next = cloneDeep(tableData)
                    next.pageSize = Number(value)
                    next.pageIndex = 1
                    handleSetTableData(next)
                }}
                onSort={(sort: OnSortParam) => {
                    const next = cloneDeep(tableData)
                    next.sort = sort
                    handleSetTableData(next)
                }}
                onCheckBoxChange={(checked, row) => setSelectedAsset(checked, row)}
                onIndeterminateCheckBoxChange={(checked, rows: Row<Asset>[]) => {
                    if (checked) {
                        setSelectAllAsset(rows.map((r) => r.original))
                    } else {
                        setSelectAllAsset([])
                    }
                }}
            />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title={t('assets.delete.title')}
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p>{t('assets.delete.confirm', { name: deleteTarget?.name })}</p>
            </ConfirmDialog>
        </>
    )
}

export default AssetListTable
