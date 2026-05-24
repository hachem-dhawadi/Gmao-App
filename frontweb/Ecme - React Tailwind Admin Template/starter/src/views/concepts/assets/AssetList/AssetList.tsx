import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import AssetListTable from './components/AssetListTable'
import AssetListActionTools from './components/AssetListActionTools'
import AssetListTableTools from './components/AssetListTableTools'
import AssetListSelected from './components/AssetListSelected'
import { useTranslation } from 'react-i18next'

const AssetList = () => {
    const { t } = useTranslation()
    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3>{t('assets.pageTitle')}</h3>
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
