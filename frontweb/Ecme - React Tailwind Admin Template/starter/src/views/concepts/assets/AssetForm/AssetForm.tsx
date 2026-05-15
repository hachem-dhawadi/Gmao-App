import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Form, FormItem } from '@/components/ui/Form'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import Upload from '@/components/ui/Upload'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import isEmpty from 'lodash/isEmpty'
import cloneDeep from 'lodash/cloneDeep'
import dayjs from 'dayjs'
import useSWR from 'swr'
import { apiGetAssetTypes } from '@/services/AssetsService'
import { HiEye, HiTrash } from 'react-icons/hi'
import { PiImagesThin } from 'react-icons/pi'
import {
    TbRefresh,
    TbMapPin,
    TbEngine,
    TbCalendar,
    TbTag,
    TbInfoCircle,
} from 'react-icons/tb'
import type { CommonProps } from '@/@types/common'
import type { AssetFormSchema } from './types'
import type { ImageItem, AssetTypesResponse } from '@/services/AssetsService'

export type { ImageItem }

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateAssetCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
    let suffix = ''
    for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
    return `AST-${suffix}`
}

type StatusOption = { value: AssetFormSchema['status']; label: string; dotClass: string }
type TypeOption = { value: number; label: string }

const statusOptions: StatusOption[] = [
    { value: 'active', label: 'Active', dotClass: 'bg-emerald-500' },
    { value: 'inactive', label: 'Inactive', dotClass: 'bg-gray-400' },
    { value: 'under_maintenance', label: 'Under Maintenance', dotClass: 'bg-amber-500' },
    { value: 'decommissioned', label: 'Decommissioned', dotClass: 'bg-red-500' },
]

const StatusLabel = ({ label, dotClass }: { label: string; dotClass: string }) => (
    <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
        <span>{label}</span>
    </div>
)

// ── Zod schema ────────────────────────────────────────────────────────────────
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
    imgList: z.array(z.any()).default([]),
})

// ── Image gallery sub-component ───────────────────────────────────────────────
const ImageList = ({
    imgList,
    onDelete,
}: {
    imgList: ImageItem[]
    onDelete: (img: ImageItem) => void
}) => {
    const [viewImg, setViewImg] = useState<ImageItem | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<ImageItem | null>(null)

    return (
        <>
            {imgList.map((img) => (
                <div
                    key={img.id}
                    className="group relative rounded-xl border border-gray-200 dark:border-gray-600 p-2 flex"
                >
                    <img
                        className="rounded-lg max-h-[140px] mx-auto max-w-full object-cover"
                        src={img.img}
                        alt={img.name}
                    />
                    <div className="absolute inset-2 bg-black/70 group-hover:flex hidden text-xl items-center justify-center gap-1 rounded-lg">
                        <span
                            className="text-gray-100 hover:text-white cursor-pointer p-1.5"
                            onClick={() => setViewImg(img)}
                        >
                            <HiEye />
                        </span>
                        <span
                            className="text-gray-100 hover:text-red-400 cursor-pointer p-1.5"
                            onClick={() => setDeleteTarget(img)}
                        >
                            <HiTrash />
                        </span>
                    </div>
                </div>
            ))}

            <Dialog isOpen={!!viewImg} onClose={() => setViewImg(null)} onRequestClose={() => setViewImg(null)}>
                <h5 className="mb-4">{viewImg?.name}</h5>
                <img className="w-full rounded-lg" src={viewImg?.img} alt={viewImg?.name} />
            </Dialog>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Remove image"
                onClose={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => {
                    if (deleteTarget) onDelete(deleteTarget)
                    setDeleteTarget(null)
                }}
            >
                <p>Remove this image? This cannot be undone.</p>
            </ConfirmDialog>
        </>
    )
}

// ── Section label helper ──────────────────────────────────────────────────────
const SectionLabel = ({
    icon,
    title,
    subtitle,
}: {
    icon: ReactNode
    title: string
    subtitle?: string
}) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary text-lg flex-shrink-0">
            {icon}
        </div>
        <div>
            <h5 className="heading-text font-semibold leading-tight">{title}</h5>
            {subtitle && (
                <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
        </div>
    </div>
)

// ── Main form ─────────────────────────────────────────────────────────────────
type AssetFormProps = {
    onFormSubmit: (values: AssetFormSchema) => void
    defaultValues?: Partial<AssetFormSchema>
} & CommonProps

const AssetForm = ({ onFormSubmit, defaultValues = {}, children }: AssetFormProps) => {
    const {
        handleSubmit,
        reset,
        setValue,
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
            imgList: [],
            ...defaultValues,
        },
        resolver: zodResolver(validationSchema),
    })

    const { data: typesData } = useSWR(
        '/asset-types',
        () => apiGetAssetTypes<AssetTypesResponse>(),
        { revalidateOnFocus: false },
    )
    const typeOptions: TypeOption[] = (typesData?.data?.asset_types || []).map(
        (t) => ({ value: t.id, label: t.name }),
    )

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
                imgList: [],
                ...defaultValues,
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify({ ...defaultValues, imgList: undefined })])

    // Image helpers
    const beforeUpload = (file: FileList | null): boolean | string => {
        if (!file) return true
        for (const f of file) {
            if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(f.type))
                return 'Only .jpg, .jpeg, .png or .webp files are allowed!'
            if (f.size > 2 * 1024 * 1024) return 'Image must be smaller than 2 MB!'
        }
        return true
    }

    const handleUpload = (onChange: (l: ImageItem[]) => void, current: ImageItem[], files: File[]) => {
        const file = files[files.length - 1]
        onChange([...current, { id: `new-${Date.now()}`, name: file.name, img: URL.createObjectURL(file), file }])
    }

    const handleDelete = (onChange: (l: ImageItem[]) => void, current: ImageItem[], target: ImageItem) => {
        const updated = cloneDeep(current).filter((i) => i.id !== target.id)
        if (target.img.startsWith('blob:')) URL.revokeObjectURL(target.img)
        onChange(updated)
    }

    return (
        <Form
            className="flex w-full h-full"
            containerClassName="flex flex-col w-full justify-between"
            onSubmit={handleSubmit(onFormSubmit)}
        >
            <Container>
                <div className="flex flex-col xl:flex-row gap-4">

                    {/* ══════════════════════════════════════════════════════
                        LEFT COLUMN — main content
                    ══════════════════════════════════════════════════════ */}
                    <div className="flex-auto flex flex-col gap-4">

                        {/* ── Card 1: Basic Information ─────────────────── */}
                        <Card>
                            <SectionLabel
                                icon={<TbInfoCircle />}
                                title="Basic Information"
                                subtitle="Identity and operational status of the asset"
                            />

                            <FormItem
                                label="Asset Name"
                                invalid={!!errors.name}
                                errorMessage={errors.name?.message}
                            >
                                <Controller
                                    name="name"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            autoComplete="off"
                                            placeholder="e.g. Main Air Compressor"
                                        />
                                    )}
                                />
                            </FormItem>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                <FormItem
                                    label="Asset Code"
                                    invalid={!!errors.code}
                                    errorMessage={errors.code?.message}
                                >
                                    <Controller
                                        name="code"
                                        control={control}
                                        render={({ field }) => (
                                            <div className="flex gap-2">
                                                <Input
                                                    {...field}
                                                    autoComplete="off"
                                                    placeholder="e.g. COMP-001"
                                                    className="font-mono"
                                                    onChange={(e) =>
                                                        field.onChange(e.target.value.toUpperCase())
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    title="Generate code"
                                                    className="flex-shrink-0 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-primary hover:border-primary transition-colors"
                                                    onClick={() => setValue('code', generateAssetCode())}
                                                >
                                                    <TbRefresh className="text-lg" />
                                                </button>
                                            </div>
                                        )}
                                    />
                                </FormItem>

                                <FormItem
                                    label="Status"
                                    invalid={!!errors.status}
                                    errorMessage={errors.status?.message}
                                >
                                    <Controller
                                        name="status"
                                        control={control}
                                        render={({ field }) => (
                                            <Select<StatusOption>
                                                placeholder="Select status"
                                                options={statusOptions}
                                                value={statusOptions.find((o) => o.value === field.value) || null}
                                                onChange={(opt) => field.onChange(opt?.value)}
                                                formatOptionLabel={(opt) => (
                                                    <StatusLabel label={opt.label} dotClass={opt.dotClass} />
                                                )}
                                            />
                                        )}
                                    />
                                </FormItem>
                            </div>
                        </Card>

                        {/* ── Card 2: Equipment Details ─────────────────── */}
                        <Card>
                            <SectionLabel
                                icon={<TbEngine />}
                                title="Equipment Details"
                                subtitle="Technical specifications of the machine"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                <FormItem label="Manufacturer">
                                    <Controller
                                        name="manufacturer"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                autoComplete="off"
                                                placeholder="e.g. Siemens"
                                            />
                                        )}
                                    />
                                </FormItem>

                                <FormItem label="Model">
                                    <Controller
                                        name="model"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                autoComplete="off"
                                                placeholder="e.g. SIRIUS 3RW40"
                                            />
                                        )}
                                    />
                                </FormItem>

                                <FormItem label="Serial Number" className="md:col-span-2">
                                    <Controller
                                        name="serial_number"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                autoComplete="off"
                                                placeholder="e.g. SN-2024-123456"
                                            />
                                        )}
                                    />
                                </FormItem>
                            </div>

                            <FormItem label="Notes">
                                <Controller
                                    name="notes"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            textArea
                                            rows={4}
                                            placeholder="Additional information, maintenance history, special instructions..."
                                        />
                                    )}
                                />
                            </FormItem>
                        </Card>
                    </div>

                    {/* ══════════════════════════════════════════════════════
                        RIGHT COLUMN — sidebar
                    ══════════════════════════════════════════════════════ */}
                    <div className="lg:min-w-[360px] 2xl:w-[400px] flex flex-col gap-4">

                        {/* ── Card 3: Photos ────────────────────────────── */}
                        <Card>
                            <SectionLabel
                                icon={<PiImagesThin />}
                                title="Asset Photos"
                                subtitle="Up to 5 photos of the machine or equipment"
                            />

                            <Controller
                                name="imgList"
                                control={control}
                                render={({ field }) => (
                                    <>
                                        {field.value && field.value.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                <ImageList
                                                    imgList={field.value}
                                                    onDelete={(img) =>
                                                        handleDelete(field.onChange, field.value, img)
                                                    }
                                                />
                                                {field.value.length < 5 && (
                                                    <Upload
                                                        draggable
                                                        className="min-h-fit"
                                                        beforeUpload={beforeUpload}
                                                        showList={false}
                                                        onChange={(files) =>
                                                            handleUpload(field.onChange, field.value, files)
                                                        }
                                                    >
                                                        <div className="flex flex-col items-center justify-center min-h-[130px] px-2">
                                                            <PiImagesThin className="text-4xl text-gray-300" />
                                                            <p className="text-xs text-primary mt-1">Add more</p>
                                                        </div>
                                                    </Upload>
                                                )}
                                            </div>
                                        ) : (
                                            <Upload
                                                draggable
                                                beforeUpload={beforeUpload}
                                                showList={false}
                                                onChange={(files) =>
                                                    handleUpload(field.onChange, field.value ?? [], files)
                                                }
                                            >
                                                <div className="flex flex-col items-center justify-center py-8">
                                                    <PiImagesThin className="text-6xl text-gray-300" />
                                                    <p className="flex flex-col items-center mt-2 text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400">
                                                            Drop photos here, or
                                                        </span>
                                                        <span className="text-primary font-semibold">
                                                            Click to browse
                                                        </span>
                                                    </p>
                                                </div>
                                            </Upload>
                                        )}
                                    </>
                                )}
                            />
                            <p className="text-xs text-gray-400 mt-3">
                                .jpg · .jpeg · .png · .webp — max 2 MB each
                            </p>
                        </Card>

                        {/* ── Card 4: Classification ────────────────────── */}
                        <Card>
                            <SectionLabel
                                icon={<TbTag />}
                                title="Classification"
                                subtitle="Category and physical location"
                            />

                            <FormItem
                                label="Asset Type"
                                invalid={!!errors.asset_type_id}
                                errorMessage={errors.asset_type_id?.message}
                            >
                                <Controller
                                    name="asset_type_id"
                                    control={control}
                                    render={({ field }) => (
                                        <Select<TypeOption>
                                            placeholder="Select type"
                                            options={typeOptions}
                                            value={typeOptions.find((o) => o.value === field.value) || null}
                                            onChange={(opt) => field.onChange(opt?.value ?? null)}
                                        />
                                    )}
                                />
                            </FormItem>

                            <FormItem label="Location">
                                <Controller
                                    name="location"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            autoComplete="off"
                                            prefix={<TbMapPin className="text-gray-400" />}
                                            placeholder="e.g. Building A, Floor 2"
                                        />
                                    )}
                                />
                            </FormItem>

                            <FormItem label="Address / Zone">
                                <Controller
                                    name="address_label"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            autoComplete="off"
                                            placeholder="e.g. Zone B – Room 12"
                                        />
                                    )}
                                />
                            </FormItem>
                        </Card>

                        {/* ── Card 5: Lifecycle ─────────────────────────── */}
                        <Card>
                            <SectionLabel
                                icon={<TbCalendar />}
                                title="Lifecycle"
                                subtitle="Dates for purchase, warranty, and installation"
                            />

                            <FormItem label="Purchase Date">
                                <Controller
                                    name="purchase_date"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            placeholder="Pick a date"
                                            value={field.value ? new Date(field.value) : null}
                                            onChange={(date) =>
                                                field.onChange(date ? dayjs(date).format('YYYY-MM-DD') : '')
                                            }
                                        />
                                    )}
                                />
                            </FormItem>

                            <FormItem label="Warranty Expires">
                                <Controller
                                    name="warranty_end_at"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            placeholder="Pick a date"
                                            value={field.value ? new Date(field.value) : null}
                                            onChange={(date) =>
                                                field.onChange(date ? dayjs(date).format('YYYY-MM-DD') : '')
                                            }
                                        />
                                    )}
                                />
                            </FormItem>

                            <FormItem label="Installed At">
                                <Controller
                                    name="installed_at"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker.DateTimepicker
                                            placeholder="Pick date & time"
                                            value={field.value ? new Date(field.value) : null}
                                            onChange={(date) =>
                                                field.onChange(
                                                    date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '',
                                                )
                                            }
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

export { type AssetFormSchema }
export default AssetForm
