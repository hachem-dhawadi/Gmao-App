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
import { TECHNICIAN } from '@/constants/roles.constant'

const WorkOrderList = () => {
    const { filterData, setFilterData } = useWorkOrderList()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const isTechnician = useAuthority(userAuthority, [TECHNICIAN])

    useEffect(() => {
        if (isTechnician) {
            setFilterData({ ...filterData, myOnly: true })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTechnician])

    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3>Work Orders</h3>
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
