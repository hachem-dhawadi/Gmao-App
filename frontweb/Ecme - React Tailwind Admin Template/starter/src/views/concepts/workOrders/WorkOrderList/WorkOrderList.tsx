import { useEffect } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import WorkOrderListTable from './components/WorkOrderListTable'
import WorkOrderListActionTools from './components/WorkOrderListActionTools'
import WorkOrderListTableTools from './components/WorkOrderListTableTools'
import WorkOrderListSelected from './components/WorkOrderListSelected'
import useWorkOrderList from './hooks/useWorkOrderList'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { useTranslation } from 'react-i18next'

const WorkOrderList = () => {
    const { t } = useTranslation()
    const { filterData, setFilterData } = useWorkOrderList()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canAssign = useAuthority(userAuthority, ['work_orders.assign', 'admin', 'manager'])

    useEffect(() => {
        if (!canAssign) {
            setFilterData({ ...filterData, myOnly: true })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canAssign])

    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3>{t('wo.pageTitle')}</h3>
                            <WorkOrderListActionTools />
                        </div>
                        <WorkOrderListTableTools />
                        <WorkOrderListTable />
                    </div>
                </AdaptiveCard>
            </Container>
            <WorkOrderListSelected />
        </>
    )
}

export default WorkOrderList
