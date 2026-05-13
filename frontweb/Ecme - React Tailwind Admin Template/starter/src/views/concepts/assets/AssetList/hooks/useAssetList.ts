import useSWR from 'swr'
import { useAssetListStore } from '../store/assetListStore'
import { apiGetAssetsList } from '@/services/AssetsService'
import type { Asset } from '../types'
import type { AssetsListResponse } from '@/services/AssetsService'

export default function useAssetList() {
    const {
        tableData,
        setTableData,
        filterData,
        setFilterData,
        selectedAsset,
        setSelectedAsset,
        setSelectAllAsset,
    } = useAssetListStore((state) => state)

    const queryParams = {
        page: Number(tableData.pageIndex || 1),
        per_page: Number(tableData.pageSize || 10),
    }

    const { data, error, isLoading, mutate } = useSWR(
        ['/assets', tableData.pageIndex, tableData.pageSize],
        () => apiGetAssetsList<AssetsListResponse>(queryParams),
        { revalidateOnFocus: false },
    )

    const rawList: Asset[] = data?.data?.assets || []

    const queryText = String(tableData.query || '').trim().toLowerCase()

    const assetList = rawList.filter((asset) => {
        const searchMatch =
            !queryText ||
            asset.name.toLowerCase().includes(queryText) ||
            asset.code.toLowerCase().includes(queryText) ||
            (asset.manufacturer || '').toLowerCase().includes(queryText) ||
            (asset.model || '').toLowerCase().includes(queryText) ||
            (asset.location || '').toLowerCase().includes(queryText) ||
            (asset.asset_type?.name || '').toLowerCase().includes(queryText)

        const statusMatch =
            filterData.status === 'all' || asset.status === filterData.status

        return searchMatch && statusMatch
    })

    const usingClientFilter =
        queryText.length > 0 || filterData.status !== 'all'

    const apiTotal = data?.data?.pagination?.total || 0
    const assetListTotal = usingClientFilter ? assetList.length : apiTotal

    return {
        assetList,
        assetListTotal,
        rawList,
        error,
        isLoading,
        tableData,
        filterData,
        mutate,
        setTableData,
        setFilterData,
        selectedAsset,
        setSelectedAsset,
        setSelectAllAsset,
    }
}
