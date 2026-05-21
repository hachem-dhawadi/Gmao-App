import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'
import UserListTable from './components/UserListTable'
import UserListActionTools from './components/UserListActionTools'
import UsersListTableTools from './components/UsersListTableTools'
import UserListSelected from './components/UserListSelected'

const UserList = () => (
    <>
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <UsersListTableTools />
                        <UserListActionTools />
                    </div>
                    <UserListTable />
                </div>
            </AdaptiveCard>
        </Container>
        <UserListSelected />
    </>
)

export default UserList
