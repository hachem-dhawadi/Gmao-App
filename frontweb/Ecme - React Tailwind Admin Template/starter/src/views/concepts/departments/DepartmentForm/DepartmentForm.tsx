import { useEffect } from 'react'
import { Form } from '@/components/ui/Form'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import DepartmentOverviewSection from './DepartmentOverviewSection'
import DepartmentOrganizationSection from './DepartmentOrganizationSection'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import isEmpty from 'lodash/isEmpty'
import type { CommonProps } from '@/@types/common'
import type { DepartmentFormSchema } from './types'

const validationSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    code: z.string().min(1, { message: 'Code is required' }).max(50),
    description: z.string().optional().default(''),
    parent_department_id: z.number().nullable().optional().default(null),
})

type DepartmentFormProps = {
    onFormSubmit: (values: DepartmentFormSchema) => void
    defaultValues?: Partial<DepartmentFormSchema>
    currentDepartmentId?: number
} & CommonProps

const DepartmentForm = ({
    onFormSubmit,
    defaultValues = {},
    currentDepartmentId,
    children,
}: DepartmentFormProps) => {
    const {
        handleSubmit,
        reset,
        formState: { errors },
        control,
    } = useForm<DepartmentFormSchema>({
        defaultValues: {
            name: '',
            code: '',
            description: '',
            parent_department_id: null,
            ...defaultValues,
        },
        resolver: zodResolver(validationSchema),
    })

    useEffect(() => {
        if (!isEmpty(defaultValues)) {
            reset({
                name: '',
                code: '',
                description: '',
                parent_department_id: null,
                ...defaultValues,
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(defaultValues)])

    return (
        <Form
            className="flex w-full h-full"
            containerClassName="flex flex-col w-full justify-between"
            onSubmit={handleSubmit(onFormSubmit)}
        >
            <Container>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="gap-4 flex flex-col flex-auto">
                        <DepartmentOverviewSection
                            control={control}
                            errors={errors}
                        />
                    </div>
                    <div className="md:w-[370px] gap-4 flex flex-col">
                        <DepartmentOrganizationSection
                            control={control}
                            errors={errors}
                            currentDepartmentId={currentDepartmentId}
                        />
                    </div>
                </div>
            </Container>
            <BottomStickyBar>{children}</BottomStickyBar>
        </Form>
    )
}

export default DepartmentForm
