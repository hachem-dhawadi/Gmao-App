import Button from '@/components/ui/Button'
import { TbCloudDownload, TbPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { CSVLink } from 'react-csv'
import useDepartmentList from '../hooks/useDepartmentList'
import { useTranslation } from 'react-i18next'

const DepartmentListActionTools = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, ['departments.create', 'admin', 'hr'])

    const { rawList } = useDepartmentList()

    const csvData = rawList.map((d) => ({
        Name: d.name,
        Code: d.code,
        Description: d.description ?? '',
        Parent: d.parent?.name ?? '',
        Members: d.members_count,
        'Sub-departments': d.children_count,
    }))

    return (
        <div className="flex flex-col md:flex-row gap-3">
            <CSVLink
                className="w-full"
                filename="departments.csv"
                data={csvData}
            >
                <Button
                    icon={<TbCloudDownload className="text-xl" />}
                    className="w-full"
                >
                    {t('common.download')}
                </Button>
            </CSVLink>
            {canCreate && (
                <Button
                    variant="solid"
                    icon={<TbPlus className="text-xl" />}
                    onClick={() =>
                        navigate('/concepts/departments/department-create')
                    }
                >
                    {t('nav.departments.departmentCreate')}
                </Button>
            )}
        </div>
    )
}

export default DepartmentListActionTools
