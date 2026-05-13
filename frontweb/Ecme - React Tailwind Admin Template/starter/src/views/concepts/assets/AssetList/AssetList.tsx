import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import AssetListTable from './components/AssetListTable'
import AssetListActionTools from './components/AssetListActionTools'
import AssetListTableTools from './components/AssetListTableTools'
import AssetListSelected from './components/AssetListSelected'

const AssetList = () => {
    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3>Assets</h3>
                            <AssetListActionTools />
                        </div>
                        <AssetListTableTools />
                        <AssetListTable />
                    </div>
                </AdaptiveCard>
            </Container>
            <AssetListSelected />
        </>
    )
}

export default AssetList
