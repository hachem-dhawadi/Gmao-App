import DebouceInput from '@/components/shared/DebouceInput'
import { TbSearch } from 'react-icons/tb'
import { useTranslation } from 'react-i18next'
import { Ref } from 'react'

type CustomerListSearchProps = {
    onInputChange: (value: string) => void
    ref?: Ref<HTMLInputElement>
}

const CustomerListSearch = (props: CustomerListSearchProps) => {
    const { onInputChange, ref } = props
    const { t } = useTranslation()

    return (
        <DebouceInput
            ref={ref}
            placeholder={t('members.searchPlaceholder')}
            suffix={<TbSearch className="text-lg" />}
            onChange={(e) => onInputChange(e.target.value)}
        />
    )
}

export default CustomerListSearch
