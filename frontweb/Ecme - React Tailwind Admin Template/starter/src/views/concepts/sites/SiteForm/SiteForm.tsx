import { useEffect } from 'react'
import { Form } from '@/components/ui/Form'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import SiteOverviewSection from './SiteOverviewSection'
import SiteLocationSection from './SiteLocationSection'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import isEmpty from 'lodash/isEmpty'
import type { CommonProps } from '@/@types/common'
import type { SiteFormSchema } from './types'

const validationSchema = z.object({
    name: z.string().min(1, { message: 'Site name is required' }),
    code: z.string().min(1, { message: 'Code is required' }).max(50),
    description: z.string().optional().default(''),
    address: z.string().optional().default(''),
    phone: z.string().min(1, { message: 'Phone number is required' }),
    timezone: z.string().optional().default('UTC'),
    is_active: z.boolean().default(true),
    geo_lat: z
        .string()
        .optional()
        .default('')
        .refine(
            (v) => v === '' || (!isNaN(Number(v)) && Math.abs(Number(v)) <= 90),
            { message: 'Latitude must be between -90 and 90' },
        ),
    geo_lng: z
        .string()
        .optional()
        .default('')
        .refine(
            (v) =>
                v === '' || (!isNaN(Number(v)) && Math.abs(Number(v)) <= 180),
            { message: 'Longitude must be between -180 and 180' },
        ),
})

type SiteFormProps = {
    onFormSubmit: (values: SiteFormSchema) => void
    defaultValues?: Partial<SiteFormSchema>
} & CommonProps

const SiteForm = ({
    onFormSubmit,
    defaultValues = {},
    children,
}: SiteFormProps) => {
    const {
        handleSubmit,
        reset,
        formState: { errors },
        control,
        setValue,
        watch,
    } = useForm<SiteFormSchema>({
        defaultValues: {
            name: '',
            code: '',
            description: '',
            address: '',
            phone: '',
            timezone: 'UTC',
            is_active: true,
            geo_lat: '',
            geo_lng: '',
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
                address: '',
                phone: '',
                timezone: 'UTC',
                is_active: true,
                geo_lat: '',
                geo_lng: '',
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
                        <SiteOverviewSection
                            control={control}
                            errors={errors}
                            setValue={setValue}
                        />
                    </div>
                    <div className="md:w-[370px] gap-4 flex flex-col">
                        <SiteLocationSection
                            control={control}
                            errors={errors}
                            setValue={setValue}
                            watch={watch}
                        />
                    </div>
                </div>
            </Container>
            <BottomStickyBar>{children}</BottomStickyBar>
        </Form>
    )
}

export default SiteForm
