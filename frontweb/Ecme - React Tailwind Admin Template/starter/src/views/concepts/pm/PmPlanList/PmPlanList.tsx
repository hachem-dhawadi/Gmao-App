import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import PmPlanListTable from './components/PmPlanListTable'
import PmPlanListActionTools from './components/PmPlanListActionTools'
import PmPlanListTableTools from './components/PmPlanListTableTools'
import PmPlanListSelected from './components/PmPlanListSelected'

const PmPlanList = () => {
    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3>Preventive Maintenance Plans</h3>
                            <PmPlanListActionTools />
                        </div>
                        <PmPlanListTableTools />
                        <PmPlanListTable />
                    </div>
                </AdaptiveCard>
            </Container>
            <PmPlanListSelected />
        </>
    )
}

export default PmPlanList
