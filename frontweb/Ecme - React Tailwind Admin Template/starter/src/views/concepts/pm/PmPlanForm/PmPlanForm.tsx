import { useEffect } from 'react'
import { Form } from '@/components/ui/Form'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import PmPlanMainSection from './PmPlanMainSection'
import PmPlanSideSection from './PmPlanSideSection'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import isEmpty from 'lodash/isEmpty'
import type { CommonProps } from '@/@types/common'
import type { PmPlanFormSchema } from './types'

const validationSchema = z.object({
    name: z.string().min(1, { message: 'Plan name is required' }),
    description: z.string().optional().default(''),
    status: z.enum(['active', 'inactive', 'draft'], {
        required_error: 'Status is required',
    }),
    priority: z.enum(['low', 'medium', 'high', 'critical'], {
        required_error: 'Priority is required',
    }),
    estimated_minutes: z.string().optional().default(''),
    asset_id: z.number().nullable().optional().default(null),
    assigned_member_id: z.number().nullable().optional().default(null),
    trigger_interval_value: z
        .string()
        .min(1, { message: 'Interval is required' }),
    trigger_interval_unit: z.enum(['days', 'weeks', 'months'], {
        required_error: 'Interval unit is required',
    }),
    trigger_next_run_at: z.string().optional().default(''),
})

type PmPlanFormProps = {
    onFormSubmit: (values: PmPlanFormSchema) => void
    defaultValues?: Partial<PmPlanFormSchema>
} & CommonProps

const PmPlanForm = ({
    onFormSubmit,
    defaultValues = {},
    children,
}: PmPlanFormProps) => {
    const {
        handleSubmit,
        reset,
        formState: { errors },
        control,
    } = useForm<PmPlanFormSchema>({
        defaultValues: {
            name: '',
            description: '',
            status: 'active',
            priority: 'medium',
            estimated_minutes: '',
            asset_id: null,
            assigned_member_id: null,
            trigger_interval_value: '1',
            trigger_interval_unit: 'months',
            trigger_next_run_at: '',
            ...defaultValues,
        },
        resolver: zodResolver(validationSchema),
    })

    useEffect(() => {
        if (!isEmpty(defaultValues)) {
            reset({
                name: '',
                description: '',
                status: 'active',
                priority: 'medium',
                estimated_minutes: '',
                asset_id: null,
                assigned_member_id: null,
                trigger_interval_value: '1',
                trigger_interval_unit: 'months',
                trigger_next_run_at: '',
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
                        <PmPlanMainSection control={control} errors={errors} />
                    </div>
                    <div className="md:w-[370px] gap-4 flex flex-col">
                        <PmPlanSideSection control={control} errors={errors} />
                    </div>
                </div>
            </Container>
            <BottomStickyBar>{children}</BottomStickyBar>
        </Form>
    )
}

export { type PmPlanFormSchema }
export default PmPlanForm
