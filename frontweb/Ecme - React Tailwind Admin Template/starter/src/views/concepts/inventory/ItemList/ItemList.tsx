import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import ItemListTable from './components/ItemListTable'
import ItemListActionTools from './components/ItemListActionTools'
import ItemListTableTools from './components/ItemListTableTools'
import { useTranslation } from 'react-i18next'

const ItemList = () => {
    const { t } = useTranslation()
    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <h3>{t('inventory.pageTitle')}</h3>
                        <ItemListActionTools />
                    </div>
                    <ItemListTableTools />
                    <ItemListTable />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

export default ItemList
