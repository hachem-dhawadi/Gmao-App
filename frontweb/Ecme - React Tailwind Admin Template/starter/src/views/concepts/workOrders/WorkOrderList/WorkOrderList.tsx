import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import WorkOrderListTable from './components/WorkOrderListTable'
import WorkOrderListActionTools from './components/WorkOrderListActionTools'
import WorkOrderListTableTools from './components/WorkOrderListTableTools'
import WorkOrderListSelected from './components/WorkOrderListSelected'

const WorkOrderList = () => {
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
