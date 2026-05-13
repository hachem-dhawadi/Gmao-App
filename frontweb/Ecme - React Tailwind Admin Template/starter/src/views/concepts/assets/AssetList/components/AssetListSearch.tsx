import DebouceInput from '@/components/shared/DebouceInput'
import { TbSearch } from 'react-icons/tb'
import type { Ref } from 'react'

type Props = {
    onInputChange: (value: string) => void
    ref?: Ref<HTMLInputElement>
}

const AssetListSearch = ({ onInputChange, ref }: Props) => {
    return (
        <DebouceInput
            ref={ref}
            placeholder="Search by name, code, type..."
            suffix={<TbSearch className="text-lg" />}
            onChange={(e) => onInputChange(e.target.value)}
        />
    )
}

export default AssetListSearch
