import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Skeleton from '@/components/ui/Skeleton'
import { apiGetDepartmentById } from '@/services/DepartmentsService'
import { useNavigate, useParams } from 'react-router-dom'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import { ADMIN, HR } from '@/constants/roles.constant'
import useSWR from 'swr'
import { TbArrowNarrowLeft, TbPencil, TbBuilding, TbUsers, TbLayoutGrid } from 'react-icons/tb'
import type { DepartmentResponse } from '@/services/DepartmentsService'
import type { Department } from '../DepartmentList/types'

const StatCard = ({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode
    label: string
    value: number
}) => (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30">
        <div className="text-2xl text-primary">{icon}</div>
        <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    </div>
)

const DepartmentDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canEdit = useAuthority(userAuthority, [ADMIN, HR])

    const { data, isLoading } = useSWR<Department>(
        id ? ['/departments/details', id] : null,
        async () => {
            const resp = await apiGetDepartmentById<DepartmentResponse>(id!)
            return resp.data.department
        },
        { revalidateOnFocus: false },
    )

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <Skeleton height={200} />
                </AdaptiveCard>
            </Container>
        )
    }

    if (!data) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col items-center justify-center py-12">
                        <h3>Department not found</h3>
                        <Button
                            className="mt-4"
                            onClick={() => navigate('/concepts/departments')}
                        >
                            Back to list
                        </Button>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="plain"
                        icon={<TbArrowNarrowLeft />}
                        onClick={() => navigate('/concepts/departments')}
                    >
                        Back to Departments
                    </Button>
                    {canEdit && (
                        <Button
                            variant="solid"
                            icon={<TbPencil />}
                            onClick={() =>
                                navigate(
                                    `/concepts/departments/department-edit/${data.id}`,
                                )
                            }
                        >
                            Edit
                        </Button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    {/* Left: main info */}
                    <AdaptiveCard className="flex-auto">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-2xl flex-shrink-0">
                                <TbBuilding />
                            </div>
                            <div>
                                <h3 className="text-gray-900 dark:text-gray-100">
                                    {data.name}
                                </h3>
                                <Tag className="mt-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs border-0">
                                    {data.code}
                                </Tag>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                            <StatCard
                                icon={<TbUsers />}
                                label="Members"
                                value={data.members_count}
                            />
                            <StatCard
                                icon={<TbLayoutGrid />}
                                label="Sub-departments"
                                value={data.children_count}
                            />
                            <StatCard
                                icon={<TbBuilding />}
                                label="Level"
                                value={
                                    data.parent_department_id ? 1 : 0
                                }
                            />
                        </div>

                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">
                                {data.description || 'No description provided.'}
                            </p>
                        </div>
                    </AdaptiveCard>

                    {/* Right: organization info */}
                    <div className="md:w-[300px]">
                        <AdaptiveCard>
                            <h5 className="mb-4 text-gray-700 dark:text-gray-300">
                                Organization
                            </h5>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                        Parent Department
                                    </p>
                                    {data.parent ? (
                                        <div className="flex items-center gap-2">
                                            <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs border-0">
                                                {data.parent.code}
                                            </Tag>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {data.parent.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <Tag className="bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs border-0">
                                            Top-level
                                        </Tag>
                                    )}
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                        Created
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {data.created_at
                                            ? new Date(
                                                  data.created_at,
                                              ).toLocaleDateString('en-GB', {
                                                  day: 'numeric',
                                                  month: 'short',
                                                  year: 'numeric',
                                              })
                                            : '—'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                        Last Updated
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {data.updated_at
                                            ? new Date(
                                                  data.updated_at,
                                              ).toLocaleDateString('en-GB', {
                                                  day: 'numeric',
                                                  month: 'short',
                                                  year: 'numeric',
                                              })
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        </AdaptiveCard>
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default DepartmentDetails
