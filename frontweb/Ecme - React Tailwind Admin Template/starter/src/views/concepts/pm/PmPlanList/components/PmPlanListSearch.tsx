import DebouceInput from '@/components/shared/DebouceInput'
import { TbSearch } from 'react-icons/tb'
import { useTranslation } from 'react-i18next'

type Props = { onInputChange: (value: string) => void }

const PmPlanListSearch = ({ onInputChange }: Props) => {
    const { t } = useTranslation()
    return (
        <DebouceInput
            placeholder={t('pm.searchPlaceholder')}
            suffix={<TbSearch className="text-lg" />}
            onChange={(e) => onInputChange(e.target.value)}
        />
    )
}

export default PmPlanListSearch
