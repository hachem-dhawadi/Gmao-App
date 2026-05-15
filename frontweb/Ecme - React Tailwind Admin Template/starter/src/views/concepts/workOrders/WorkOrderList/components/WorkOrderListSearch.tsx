import DebouceInput from '@/components/shared/DebouceInput'
import { TbSearch } from 'react-icons/tb'
import type { Ref } from 'react'

type Props = {
    onInputChange: (value: string) => void
    ref?: Ref<HTMLInputElement>
}

const WorkOrderListSearch = ({ onInputChange, ref }: Props) => {
    return (
        <DebouceInput
            ref={ref}
            placeholder="Search by title, code, asset..."
            suffix={<TbSearch className="text-lg" />}
            onChange={(e) => onInputChange(e.target.value)}
        />
    )
}

export default WorkOrderListSearch
