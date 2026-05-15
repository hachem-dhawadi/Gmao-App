import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import WarehouseListTable from './components/WarehouseListTable'
import WarehouseListActionTools from './components/WarehouseListActionTools'
import WarehouseListTableTools from './components/WarehouseListTableTools'

const WarehouseList = () => {
    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <h3>Warehouses</h3>
                        <WarehouseListActionTools />
                    </div>
                    <WarehouseListTableTools />
                    <WarehouseListTable />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

export default WarehouseList
