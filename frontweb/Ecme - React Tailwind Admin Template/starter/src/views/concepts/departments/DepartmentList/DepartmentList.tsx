import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import DepartmentListTable from './components/DepartmentListTable'
import DepartmentListActionTools from './components/DepartmentListActionTools'
import DepartmentListTableTools from './components/DepartmentListTableTools'
import DepartmentListSelected from './components/DepartmentListSelected'

const DepartmentList = () => {
    return (
        <>
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3>Departments</h3>
                            <DepartmentListActionTools />
                        </div>
                        <DepartmentListTableTools />
                        <DepartmentListTable />
                    </div>
                </AdaptiveCard>
            </Container>
            <DepartmentListSelected />
        </>
    )
}

export default DepartmentList
