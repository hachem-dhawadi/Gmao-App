import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import CustomerListTable from './components/CustomerListTable'
import CustomerListActionTools from './components/CustomerListActionTools'
import CustomersListTableTools from './components/CustomersListTableTools'
import CustomerListSelected from './components/CustomerListSelected'
import { useTranslation } from 'react-i18next'

const CustomerList = () => {
    const { t } = useTranslation()
    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3>{t('members.pageTitle')}</h3>
                            <CustomerListActionTools />
                        </div>
                        <CustomersListTableTools />
                        <CustomerListTable />
                    </div>
                </AdaptiveCard>
            </Container>
            <CustomerListSelected />
        </>
    )
}

export default CustomerList
