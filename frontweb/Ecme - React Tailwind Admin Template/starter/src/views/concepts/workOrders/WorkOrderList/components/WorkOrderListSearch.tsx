import DebouceInput from '@/components/shared/DebouceInput'
import { TbSearch } from 'react-icons/tb'
import { useTranslation } from 'react-i18next'
import type { Ref } from 'react'

type Props = {
    onInputChange: (value: string) => void
    ref?: Ref<HTMLInputElement>
}

const WorkOrderListSearch = ({ onInputChange, ref }: Props) => {
    const { t } = useTranslation()
    return (
        <DebouceInput
            ref={ref}
            placeholder={t('wo.searchPlaceholder')}
            suffix={<TbSearch className="text-lg" />}
            onChange={(e) => onInputChange(e.target.value)}
        />
    )
}

export default WorkOrderListSearch
