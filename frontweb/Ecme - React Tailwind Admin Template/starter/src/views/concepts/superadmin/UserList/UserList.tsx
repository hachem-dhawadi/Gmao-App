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
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <div className="flex-1">
                            <UsersListTableTools />
                        </div>
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
