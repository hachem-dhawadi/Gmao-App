import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DepartmentForm from '../DepartmentForm'
import { apiCreateDepartment } from '@/services/DepartmentsService'
import { useNavigate } from 'react-router-dom'
import { mutate as globalMutate } from 'swr'
import { TbTrash } from 'react-icons/tb'
import type { DepartmentFormSchema } from '../DepartmentForm'

const DepartmentCreate = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [discardOpen, setDiscardOpen] = useState(false)

    const handleFormSubmit = async (values: DepartmentFormSchema) => {
        try {
            setIsSubmitting(true)
            await apiCreateDepartment({
                name: values.name,
                code: values.code,
                description: values.description || null,
                parent_department_id: values.parent_department_id ?? null,
            })

            await globalMutate(
                (key) =>
                    Array.isArray(key) &&
                    typeof key[0] === 'string' &&
                    key[0] === '/departments',
            )

            toast.push(
                <Notification type="success">
                    {t('departmentCreate.toast.success')}
                </Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/departments')
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message || t('departmentCreate.toast.error')
            toast.push(<Notification type="danger">{message}</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <DepartmentForm onFormSubmit={handleFormSubmit}>
                <Container>
                    <div className="flex items-center justify-between px-8">
                        <span />
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                customColorClass={() =>
                                    'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error bg-transparent'
                                }
                                icon={<TbTrash />}
                                onClick={() => setDiscardOpen(true)}
                            >
                                {t('common.discard')}
                            </Button>
                            <Button
                                variant="solid"
                                type="submit"
                                loading={isSubmitting}
                            >
                                {t('common.create')}
                            </Button>
                        </div>
                    </div>
                </Container>
            </DepartmentForm>

            <ConfirmDialog
                isOpen={discardOpen}
                type="danger"
                title={t('common.discardConfirm.title')}
                onClose={() => setDiscardOpen(false)}
                onRequestClose={() => setDiscardOpen(false)}
                onCancel={() => setDiscardOpen(false)}
                onConfirm={() => {
                    setDiscardOpen(false)
                    navigate('/concepts/departments')
                }}
            >
                <p>{t('common.discardConfirm.body')}</p>
            </ConfirmDialog>
        </>
    )
}

export default DepartmentCreate
