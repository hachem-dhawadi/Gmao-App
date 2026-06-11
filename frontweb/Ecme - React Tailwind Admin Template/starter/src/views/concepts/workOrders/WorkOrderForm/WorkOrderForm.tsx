import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Form } from '@/components/ui/Form'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import WorkOrderMainSection from './WorkOrderMainSection'
import WorkOrderSideSection from './WorkOrderSideSection'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import isEmpty from 'lodash/isEmpty'
import { useSessionUser } from '@/store/authStore'
import useAuthority from '@/utils/hooks/useAuthority'
import type { CommonProps } from '@/@types/common'
import type { WorkOrderFormSchema } from './types'

type WorkOrderFormProps = {
    onFormSubmit: (values: WorkOrderFormSchema) => void
    defaultValues?: Partial<WorkOrderFormSchema>
} & CommonProps

const WorkOrderForm = ({
    onFormSubmit,
    defaultValues = {},
    children,
}: WorkOrderFormProps) => {
    const { t } = useTranslation()
    const userAuthority = useSessionUser((state) => state.user.authority)
    const canAssign = useAuthority(userAuthority, ['work_orders.assign', 'admin', 'manager'])

    const validationSchema = useMemo(() => z.object({
        title: z.string().min(1, { message: t('woForm.validation.titleRequired') }),
        asset_id: z
            .number({ required_error: t('woForm.validation.assetRequired') })
            .nullable()
            .refine((v) => v !== null, { message: t('woForm.validation.assetRequired') }),
        site_id: z.number().nullable().optional(),
        team_id: z.number().nullable().optional(),
        code: z.string().optional().default(''),
        status: z.enum(['open', 'in_progress', 'on_hold', 'completed', 'cancelled'], {
            required_error: t('woForm.validation.statusRequired'),
        }),
        priority: z.enum(['low', 'medium', 'high', 'critical'], {
            required_error: t('woForm.validation.priorityRequired'),
        }),
        description: z.string().optional().default(''),
        due_at: z.string().optional().default(''),
        estimated_minutes: z.string().optional().default(''),
        assigned_member_id: z.number().nullable().optional().default(null),
    }), [t])

    const {
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
        control,
    } = useForm<WorkOrderFormSchema>({
        defaultValues: {
            title: '',
            asset_id: null,
            site_id: null,
            team_id: null,
            code: '',
            status: 'open',
            priority: 'medium',
            description: '',
            due_at: '',
            estimated_minutes: '',
            assigned_member_id: null,
            ...defaultValues,
        },
        resolver: zodResolver(validationSchema),
    })

    useEffect(() => {
        if (!isEmpty(defaultValues)) {
            reset({
                title: '',
                asset_id: null,
                site_id: null,
                code: '',
                status: 'open',
                priority: 'medium',
                description: '',
                due_at: '',
                estimated_minutes: '',
                assigned_member_id: null,
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
                        <WorkOrderMainSection
                            control={control}
                            errors={errors}
                            setValue={setValue}
                        />
                    </div>
                    <div className="md:w-[370px] gap-4 flex flex-col">
                        <WorkOrderSideSection
                            control={control}
                            errors={errors}
                            setValue={setValue}
                            canAssign={canAssign}
                        />
                    </div>
                </div>
            </Container>
            <BottomStickyBar>{children}</BottomStickyBar>
        </Form>
    )
}

export { type WorkOrderFormSchema }
export default WorkOrderForm
