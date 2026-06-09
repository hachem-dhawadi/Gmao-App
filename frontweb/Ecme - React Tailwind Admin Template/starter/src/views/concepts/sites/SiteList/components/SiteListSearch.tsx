import Input from '@/components/ui/Input'
import { TbSearch } from 'react-icons/tb'

type Props = { onInputChange: (val: string) => void }

const SiteListSearch = ({ onInputChange }: Props) => (
    <Input
        placeholder="Search sites..."
        suffix={<TbSearch className="text-lg" />}
        onChange={(e) => onInputChange(e.target.value)}
    />
)

export default SiteListSearch
