import useSWR from 'swr'
import { useSiteListStore } from '../store/siteListStore'
import { apiGetSitesList } from '@/services/SiteService'
import type { Site } from '../types'
import type { SiteFilter } from '../store/siteListStore'
import type { SitesListResponse } from '@/services/SiteService'

export default function useSiteList() {
    const {
        tableData,
        setTableData,
        filterData,
        setFilterData,
        selectedSite,
        setSelectedSite,
        setSelectAllSite,
    } = useSiteListStore((state) => state)

    const queryParams = {
        page: Number(tableData.pageIndex || 1),
        per_page: Number(tableData.pageSize || 10),
    }

    const { data, error, isLoading, mutate } = useSWR(
        ['/sites', tableData.pageIndex, tableData.pageSize],
        () => apiGetSitesList<SitesListResponse>(queryParams),
        { revalidateOnFocus: false },
    )

    const rawList: Site[] = data?.data?.sites || []

    const queryText = String(tableData.query || '').trim().toLowerCase()

    const siteList = rawList.filter((site) => {
        if (queryText && !(
            site.name.toLowerCase().includes(queryText) ||
            site.code.toLowerCase().includes(queryText) ||
            (site.address || '').toLowerCase().includes(queryText) ||
            (site.description || '').toLowerCase().includes(queryText)
        )) return false

        if (filterData.status === 'active' && !site.is_active) return false
        if (filterData.status === 'inactive' && site.is_active) return false

        return true
    })

    const apiTotal = data?.data?.pagination?.total || 0
    const isFiltered = queryText.length > 0 || filterData.status !== 'all'
    const siteListTotal = isFiltered ? siteList.length : apiTotal

    return {
        siteList,
        siteListTotal,
        rawList,
        error,
        isLoading,
        tableData,
        filterData,
        mutate,
        setTableData,
        setFilterData,
        selectedSite,
        setSelectedSite,
        setSelectAllSite,
    }
}
