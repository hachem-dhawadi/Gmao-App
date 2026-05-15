import DebouceInput from '@/components/shared/DebouceInput'
import { TbSearch } from 'react-icons/tb'

type Props = { onInputChange: (value: string) => void }

const PmPlanListSearch = ({ onInputChange }: Props) => (
    <DebouceInput
        placeholder="Search PM plans..."
        suffix={<TbSearch className="text-lg" />}
        onChange={(e) => onInputChange(e.target.value)}
    />
)

export default PmPlanListSearch
