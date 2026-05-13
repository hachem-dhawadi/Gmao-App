import { useEffect } from 'react'
import { Form } from '@/components/ui/Form'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import AssetOverviewSection from './AssetOverviewSection'
import AssetDetailsSection from './AssetDetailsSection'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import isEmpty from 'lodash/isEmpty'
import type { CommonProps } from '@/@types/common'
import type { AssetFormSchema } from './types'

const validationSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    code: z.string().min(1, { message: 'Code is required' }).max(100),
    asset_type_id: z
        .number({ required_error: 'Asset type is required' })
        .nullable()
        .refine((v) => v !== null, { message: 'Asset type is required' }),
    status: z.enum(['active', 'inactive', 'under_maintenance', 'decommissioned'], {
        required_error: 'Status is required',
    }),
    serial_number: z.string().optional().default(''),
    manufacturer: z.string().optional().default(''),
    model: z.string().optional().default(''),
    location: z.string().optional().default(''),
    address_label: z.string().optional().default(''),
    notes: z.string().optional().default(''),
    purchase_date: z.string().optional().default(''),
    warranty_end_at: z.string().optional().default(''),
    installed_at: z.string().optional().default(''),
})

type AssetFormProps = {
    onFormSubmit: (values: AssetFormSchema) => void
    defaultValues?: Partial<AssetFormSchema>
} & CommonProps

const AssetForm = ({
    onFormSubmit,
    defaultValues = {},
    children,
}: AssetFormProps) => {
    const {
        handleSubmit,
        reset,
        formState: { errors },
        control,
    } = useForm<AssetFormSchema>({
        defaultValues: {
            name: '',
            code: '',
            asset_type_id: null,
            status: 'active',
            serial_number: '',
            manufacturer: '',
            model: '',
            location: '',
            address_label: '',
            notes: '',
            purchase_date: '',
            warranty_end_at: '',
            installed_at: '',
            ...defaultValues,
        },
        resolver: zodResolver(validationSchema),
    })

    useEffect(() => {
        if (!isEmpty(defaultValues)) {
            reset({
                name: '',
                code: '',
                asset_type_id: null,
                status: 'active',
                serial_number: '',
                manufacturer: '',
                model: '',
                location: '',
                address_label: '',
                notes: '',
                purchase_date: '',
                warranty_end_at: '',
                installed_at: '',
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
                        <AssetOverviewSection
                            control={control}
                            errors={errors}
                        />
                    </div>
                    <div className="md:w-[370px] gap-4 flex flex-col">
                        <AssetDetailsSection
                            control={control}
                            errors={errors}
                        />
                    </div>
                </div>
            </Container>
            <BottomStickyBar>{children}</BottomStickyBar>
        </Form>
    )
}

export { type AssetFormSchema }
export default AssetForm
