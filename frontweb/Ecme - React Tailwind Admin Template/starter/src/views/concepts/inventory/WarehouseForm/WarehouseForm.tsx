import { useEffect } from 'react'
import { Form, FormItem } from '@/components/ui/Form'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useForm, Controller } from 'react-hook-form'
import { TbRefresh } from 'react-icons/tb'
import type { ReactNode } from 'react'
import type { Warehouse } from '@/services/InventoryService'

function generateWarehouseCode(): string {
    const n = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')
    return `WH-${n}`
}

export type WarehouseFormSchema = {
    code: string
    name: string
    location: string
}

type WarehouseFormProps = {
    warehouse?: Warehouse | null
    onFormSubmit: (values: WarehouseFormSchema) => Promise<void>
    children?: ReactNode
}

const WarehouseForm = ({
    warehouse,
    onFormSubmit,
    children,
}: WarehouseFormProps) => {
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<WarehouseFormSchema>({
        defaultValues: {
            code: warehouse?.code || '',
            name: warehouse?.name || '',
            location: warehouse?.location || '',
        },
    })

    useEffect(() => {
        if (warehouse) {
            reset({
                code: warehouse.code,
                name: warehouse.name,
                location: warehouse.location || '',
            })
        }
    }, [warehouse, reset])

    return (
        <Form
            className="flex w-full h-full"
            containerClassName="flex flex-col w-full justify-between"
            onSubmit={handleSubmit(onFormSubmit)}
        >
            <Container>
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Main section */}
                    <div className="gap-4 flex flex-col flex-auto">
                        <Card>
                            <h4 className="mb-6">Overview</h4>

                            <FormItem
                                label="Warehouse Name"
                                invalid={!!errors.name}
                                errorMessage={errors.name?.message}
                            >
                                <Controller
                                    name="name"
                                    control={control}
                                    rules={{ required: 'Name is required' }}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            autoComplete="off"
                                            placeholder="e.g. Main Warehouse"
                                        />
                                    )}
                                />
                            </FormItem>

                            <FormItem
                                label="Code"
                                invalid={!!errors.code}
                                errorMessage={errors.code?.message}
                                extra={
                                    <span className="text-xs text-gray-400">
                                        Unique identifier per company
                                    </span>
                                }
                            >
                                <Controller
                                    name="code"
                                    control={control}
                                    rules={{ required: 'Code is required' }}
                                    render={({ field }) => (
                                        <div className="flex gap-2">
                                            <Input
                                                {...field}
                                                autoComplete="off"
                                                placeholder="e.g. WH-01"
                                                className="font-mono"
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value.toUpperCase(),
                                                    )
                                                }
                                            />
                                            <Button
                                                type="button"
                                                icon={<TbRefresh />}
                                                onClick={() =>
                                                    setValue(
                                                        'code',
                                                        generateWarehouseCode(),
                                                    )
                                                }
                                            />
                                        </div>
                                    )}
                                />
                            </FormItem>
                        </Card>
                    </div>

                    {/* Side section */}
                    <div className="md:w-[370px] gap-4 flex flex-col">
                        <Card>
                            <h4 className="mb-6">Details</h4>

                            <FormItem label="Location">
                                <Controller
                                    name="location"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            textArea
                                            rows={3}
                                            placeholder="Building, floor, room, zone…"
                                        />
                                    )}
                                />
                            </FormItem>
                        </Card>
                    </div>
                </div>
            </Container>

            <BottomStickyBar>{children}</BottomStickyBar>
        </Form>
    )
}

export default WarehouseForm
