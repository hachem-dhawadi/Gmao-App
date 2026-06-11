import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Form } from '@/components/ui/Form'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import PmPlanMainSection from './PmPlanMainSection'
import PmPlanSideSection from './PmPlanSideSection'
import PmTasksSection from './PmTasksSection'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import isEmpty from 'lodash/isEmpty'
import type { CommonProps } from '@/@types/common'
import type { PmPlanFormSchema } from './types'

type PmPlanFormProps = {
    onFormSubmit: (values: PmPlanFormSchema) => void
    defaultValues?: Partial<PmPlanFormSchema>
} & CommonProps

const PmPlanForm = ({
    onFormSubmit,
    defaultValues = {},
    children,
}: PmPlanFormProps) => {
    const { t } = useTranslation()

    const validationSchema = useMemo(() => z.object({
        name: z.string().min(1, { message: t('pmForm.validation.nameRequired') }),
        description: z.string().optional().default(''),
        status: z.enum(['active', 'inactive', 'draft'], {
            required_error: t('pmForm.validation.statusRequired'),
        }),
        priority: z.enum(['low', 'medium', 'high', 'critical'], {
            required_error: t('pmForm.validation.priorityRequired'),
        }),
        estimated_minutes: z.string().optional().default(''),
        asset_id: z.number().nullable().optional().default(null),
        assigned_member_id: z.number().nullable().optional().default(null),
        team_id: z.number().nullable().optional().default(null),
        trigger_interval_value: z
            .string()
            .min(1, { message: t('pmForm.validation.intervalValueRequired') }),
        trigger_interval_unit: z.enum(['days', 'weeks', 'months'], {
            required_error: t('pmForm.validation.intervalValueRequired'),
        }),
        trigger_next_run_at: z.string().optional().default(''),
        tasks: z
            .array(
                z.object({
                    id: z.number().optional(),
                    title: z.string().min(1, t('pmForm.validation.nameRequired')),
                }),
            )
            .default([]),
    }), [t])

    const {
        handleSubmit,
        reset,
        register,
        formState: { errors },
        control,
        setValue,
        getValues,
    } = useForm<PmPlanFormSchema>({
        defaultValues: {
            name: '',
            description: '',
            status: 'active',
            priority: 'medium',
            estimated_minutes: '',
            asset_id: null,
            assigned_member_id: null,
            team_id: null,
            trigger_interval_value: '1',
            trigger_interval_unit: 'months',
            trigger_next_run_at: '',
            tasks: [],
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
                tasks: [],
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
                        <PmTasksSection control={control} register={register} />
                    </div>
                    <div className="md:w-[370px] gap-4 flex flex-col">
                        <PmPlanSideSection control={control} errors={errors} setValue={setValue} getValues={getValues} />
                    </div>
                </div>
            </Container>
            <BottomStickyBar>{children}</BottomStickyBar>
        </Form>
    )
}

export { type PmPlanFormSchema }
export default PmPlanForm
