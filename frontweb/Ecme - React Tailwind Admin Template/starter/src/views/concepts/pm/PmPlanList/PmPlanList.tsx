import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import PmPlanListTable from './components/PmPlanListTable'
import PmPlanListActionTools from './components/PmPlanListActionTools'
import PmPlanListTableTools from './components/PmPlanListTableTools'
import PmPlanListSelected from './components/PmPlanListSelected'
import { useTranslation } from 'react-i18next'

const PmPlanList = () => {
    const { t } = useTranslation()
    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3>{t('pm.pageTitle')}</h3>
                            <PmPlanListActionTools />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <div className="flex-1">
                                <PmPlanListTableTools />
                            </div>
                        </div>
                        <PmPlanListTable />
                    </div>
                </AdaptiveCard>
            </Container>
            <PmPlanListSelected />
        </>
    )
}

export default PmPlanList
