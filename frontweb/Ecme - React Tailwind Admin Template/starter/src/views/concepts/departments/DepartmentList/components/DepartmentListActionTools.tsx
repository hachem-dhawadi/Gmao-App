import Button from '@/components/ui/Button'
import { TbCloudDownload, TbPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, HR } from '@/constants/roles.constant'
import { CSVLink } from 'react-csv'
import useDepartmentList from '../hooks/useDepartmentList'

const DepartmentListActionTools = () => {
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canCreate = useAuthority(userAuthority, [ADMIN, HR])

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
                    Download
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
                    Add Department
                </Button>
            )}
        </div>
    )
}

export default DepartmentListActionTools
