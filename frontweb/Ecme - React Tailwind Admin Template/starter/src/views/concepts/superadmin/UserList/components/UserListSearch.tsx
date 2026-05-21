import DebouceInput from '@/components/shared/DebouceInput'
import { TbSearch } from 'react-icons/tb'

type UserListSearchProps = {
    onInputChange: (value: string) => void
}

const UserListSearch = ({ onInputChange }: UserListSearchProps) => (
    <DebouceInput
        placeholder="Search by name, email or phone…"
        suffix={<TbSearch className="text-lg" />}
        onChange={(e) => onInputChange(e.target.value)}
    />
)

export default UserListSearch
