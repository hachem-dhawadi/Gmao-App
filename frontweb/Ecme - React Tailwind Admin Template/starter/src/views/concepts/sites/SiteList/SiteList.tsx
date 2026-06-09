import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import SiteListTable from './components/SiteListTable'
import SiteListActionTools from './components/SiteListActionTools'
import SiteListTableTools from './components/SiteListTableTools'
import SiteListSelected from './components/SiteListSelected'

const SiteList = () => {
    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3>Sites</h3>
                            <SiteListActionTools />
                        </div>
                        <SiteListTableTools />
                        <SiteListTable />
                    </div>
                </AdaptiveCard>
            </Container>
            <SiteListSelected />
        </>
    )
}

export default SiteList
