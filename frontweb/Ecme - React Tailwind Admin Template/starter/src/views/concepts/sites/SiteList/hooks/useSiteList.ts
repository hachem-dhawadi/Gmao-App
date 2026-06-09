import useSWR from 'swr'
import { useSiteListStore } from '../store/siteListStore'
import { apiGetSitesList } from '@/services/SiteService'
import type { Site } from '../types'
import type { SitesListResponse } from '@/services/SiteService'

export default function useSiteList() {
    const {
        tableData,
        setTableData,
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
        return (
            !queryText ||
            site.name.toLowerCase().includes(queryText) ||
            site.code.toLowerCase().includes(queryText) ||
            (site.address || '').toLowerCase().includes(queryText) ||
            (site.description || '').toLowerCase().includes(queryText)
        )
    })

    const apiTotal = data?.data?.pagination?.total || 0
    const siteListTotal = queryText.length > 0 ? siteList.length : apiTotal

    return {
        siteList,
        siteListTotal,
        rawList,
        error,
        isLoading,
        tableData,
        mutate,
        setTableData,
        selectedSite,
        setSelectedSite,
        setSelectAllSite,
    }
}
