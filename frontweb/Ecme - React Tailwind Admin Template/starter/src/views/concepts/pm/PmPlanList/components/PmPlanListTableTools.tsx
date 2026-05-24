import Select from '@/components/ui/Select'
import cloneDeep from 'lodash/cloneDeep'
import usePmPlanList from '../hooks/usePmPlanList'
import PmPlanListSearch from './PmPlanListSearch'
import { useTranslation } from 'react-i18next'
import type { PmPlanFilter } from '../store/pmPlanListStore'

type Option = { value: string; label: string }

const PmPlanListTableTools = () => {
    const { tableData, filterData, setTableData, setFilterData } = usePmPlanList()
    const { t } = useTranslation()

    const statusOptions: Option[] = [
        { value: 'active',   label: t('pm.status.active') },
        { value: 'inactive', label: t('pm.status.inactive') },
        { value: 'draft',    label: t('pm.status.draft') },
    ]

    const priorityOptions: Option[] = [
        { value: 'low',      label: t('pm.priority.low') },
        { value: 'medium',   label: t('pm.priority.medium') },
        { value: 'high',     label: t('pm.priority.high') },
        { value: 'critical', label: t('pm.priority.critical') },
    ]

    const handleInputChange = (val: string) => {
        const newTableData = cloneDeep(tableData)
        newTableData.query = val
        newTableData.pageIndex = 1
        setTableData(newTableData)
    }

    const handleStatusChange = (option: Option | null) => {
        setFilterData({
            ...filterData,
            status: (option?.value ?? 'all') as PmPlanFilter['status'],
        })
    }

    const handlePriorityChange = (option: Option | null) => {
        setFilterData({
            ...filterData,
            priority: (option?.value ?? 'all') as PmPlanFilter['priority'],
        })
    }

    const selectedStatus = statusOptions.find((o) => o.value === filterData.status) || null
    const selectedPriority = priorityOptions.find((o) => o.value === filterData.priority) || null

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex-1">
                <PmPlanListSearch onInputChange={handleInputChange} />
            </div>
            <div className="w-full md:w-40">
                <Select
                    isClearable
                    placeholder={t('common.status')}
                    options={statusOptions}
                    value={selectedStatus}
                    onChange={(opt) => handleStatusChange(opt as Option | null)}
                />
            </div>
            <div className="w-full md:w-40">
                <Select
                    isClearable
                    placeholder={t('common.priority')}
                    options={priorityOptions}
                    value={selectedPriority}
                    onChange={(opt) => handlePriorityChange(opt as Option | null)}
                />
            </div>
        </div>
    )
}

export default PmPlanListTableTools
