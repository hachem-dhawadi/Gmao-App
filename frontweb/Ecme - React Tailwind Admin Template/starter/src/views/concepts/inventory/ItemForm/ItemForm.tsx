import { useEffect, useState } from 'react'
import { Form, FormItem } from '@/components/ui/Form'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import Upload from '@/components/ui/Upload'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useForm, Controller } from 'react-hook-form'
import { TbRefresh } from 'react-icons/tb'
import { HiEye, HiTrash } from 'react-icons/hi'
import { PiImagesThin } from 'react-icons/pi'
import cloneDeep from 'lodash/cloneDeep'
import type { ReactNode } from 'react'
import type { Item, ImageItem } from '@/services/InventoryService'

export type { ImageItem }

function generateItemCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
    let suffix = ''
    for (let i = 0; i < 4; i++) {
        suffix += chars[Math.floor(Math.random() * chars.length)]
    }
    return `ITM-${suffix}`
}

export type ItemFormSchema = {
    code: string
    name: string
    description: string
    barcode: string
    unit: string
    unit_cost: string
    min_stock: string
    is_stocked: boolean
    imgList: ImageItem[]
}

type ItemFormProps = {
    item?: Item | null
    onFormSubmit: (values: ItemFormSchema) => Promise<void>
    children?: ReactNode
}

// ── Image gallery sub-component ───────────────────────────────────────────────
type ImageListProps = {
    imgList: ImageItem[]
    onDelete: (img: ImageItem) => void
}

const ImageList = ({ imgList, onDelete }: ImageListProps) => {
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

            <Dialog
                isOpen={!!viewImg}
                onClose={() => setViewImg(null)}
                onRequestClose={() => setViewImg(null)}
            >
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

// ── Main form ─────────────────────────────────────────────────────────────────
const ItemForm = ({ item, onFormSubmit, children }: ItemFormProps) => {
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<ItemFormSchema>({
        defaultValues: {
            code: item?.code || '',
            name: item?.name || '',
            description: item?.description || '',
            barcode: item?.barcode || '',
            unit: item?.unit || '',
            unit_cost:
                item?.unit_cost !== null && item?.unit_cost !== undefined
                    ? String(item.unit_cost)
                    : '',
            min_stock:
                item?.min_stock !== null && item?.min_stock !== undefined
                    ? String(item.min_stock)
                    : '',
            is_stocked: item?.is_stocked ?? true,
            imgList: item?.images?.map((url, i) => ({
                id: `existing-${i}`,
                name: url.split('/').pop() || 'image',
                img: url,
            })) ?? [],
        },
    })

    useEffect(() => {
        if (item) {
            reset({
                code: item.code,
                name: item.name,
                description: item.description || '',
                barcode: item.barcode || '',
                unit: item.unit || '',
                unit_cost: item.unit_cost !== null ? String(item.unit_cost) : '',
                min_stock: item.min_stock !== null ? String(item.min_stock) : '',
                is_stocked: item.is_stocked,
                imgList: item.images?.map((url, i) => ({
                    id: `existing-${i}`,
                    name: url.split('/').pop() || 'image',
                    img: url,
                })) ?? [],
            })
        }
    }, [item, reset])

    // Image upload helpers
    const beforeUpload = (file: FileList | null): boolean | string => {
        if (!file) return true
        for (const f of file) {
            if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(f.type)) {
                return 'Only .jpg, .jpeg, .png or .webp files are allowed!'
            }
            if (f.size > 2 * 1024 * 1024) {
                return 'Image must be smaller than 2 MB!'
            }
        }
        return true
    }

    const handleUpload = (
        onChange: (list: ImageItem[]) => void,
        current: ImageItem[],
        files: File[],
    ) => {
        const file = files[files.length - 1]
        const newImg: ImageItem = {
            id: `new-${Date.now()}`,
            name: file.name,
            img: URL.createObjectURL(file),
            file,
        }
        onChange([...current, newImg])
    }

    const handleDelete = (
        onChange: (list: ImageItem[]) => void,
        current: ImageItem[],
        target: ImageItem,
    ) => {
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
                    {/* ── Left: name / code / description ───────────────── */}
                    <div className="gap-4 flex flex-col flex-auto">
                        <Card>
                            <h4 className="mb-6">Basic Information</h4>

                            <FormItem
                                label="Item Name"
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
                                            placeholder="e.g. Hydraulic Filter"
                                        />
                                    )}
                                />
                            </FormItem>

                            <FormItem
                                label="Code"
                                invalid={!!errors.code}
                                errorMessage={errors.code?.message}
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
                                                placeholder="e.g. ITM-001"
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
                                                    setValue('code', generateItemCode())
                                                }
                                            />
                                        </div>
                                    )}
                                />
                            </FormItem>

                            <FormItem label="Description">
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            textArea
                                            rows={5}
                                            placeholder="Optional description of this item…"
                                        />
                                    )}
                                />
                            </FormItem>
                        </Card>

                        {/* ── Details card ──────────────────────────────── */}
                        <Card>
                            <h4 className="mb-6">Details</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                <FormItem label="Unit of Measure">
                                    <Controller
                                        name="unit"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                autoComplete="off"
                                                placeholder="e.g. pcs, kg, L, m"
                                            />
                                        )}
                                    />
                                </FormItem>

                                <FormItem label="Barcode / SKU">
                                    <Controller
                                        name="barcode"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                autoComplete="off"
                                                placeholder="Optional barcode"
                                            />
                                        )}
                                    />
                                </FormItem>

                                <FormItem label="Unit Cost">
                                    <Controller
                                        name="unit_cost"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                        )}
                                    />
                                </FormItem>

                                <FormItem label="Minimum Stock">
                                    <Controller
                                        name="min_stock"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                type="number"
                                                min={0}
                                                step="0.001"
                                                placeholder="0"
                                            />
                                        )}
                                    />
                                </FormItem>
                            </div>

                            <FormItem className="mt-2">
                                <Controller
                                    name="is_stocked"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            checked={field.value}
                                            onChange={field.onChange}
                                        >
                                            Track stock level for this item
                                        </Checkbox>
                                    )}
                                />
                            </FormItem>
                        </Card>
                    </div>

                    {/* ── Right: images ─────────────────────────────────── */}
                    <div className="lg:min-w-[380px] 2xl:w-[440px] gap-4 flex flex-col">
                        <Card>
                            <h4 className="mb-2">Item Photos</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Upload photos of this spare part or material.
                                Drag &amp; drop or click to browse.
                            </p>

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
                                                        handleDelete(
                                                            field.onChange,
                                                            field.value,
                                                            img,
                                                        )
                                                    }
                                                />
                                                {field.value.length < 5 && (
                                                    <Upload
                                                        draggable
                                                        className="min-h-fit"
                                                        beforeUpload={beforeUpload}
                                                        showList={false}
                                                        onChange={(files) =>
                                                            handleUpload(
                                                                field.onChange,
                                                                field.value,
                                                                files,
                                                            )
                                                        }
                                                    >
                                                        <div className="flex flex-col items-center justify-center min-h-[130px] px-2">
                                                            <PiImagesThin className="text-5xl text-gray-400" />
                                                            <p className="text-center text-xs mt-1">
                                                                <span className="text-primary">
                                                                    Add more
                                                                </span>
                                                            </p>
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
                                                    handleUpload(
                                                        field.onChange,
                                                        field.value ?? [],
                                                        files,
                                                    )
                                                }
                                            >
                                                <div className="flex flex-col items-center justify-center py-10">
                                                    <PiImagesThin className="text-6xl text-gray-400" />
                                                    <p className="flex flex-col items-center mt-2 text-sm">
                                                        <span className="text-gray-600 dark:text-gray-300">
                                                            Drop your image here, or{' '}
                                                        </span>
                                                        <span className="text-primary font-medium">
                                                            Click to browse
                                                        </span>
                                                    </p>
                                                </div>
                                            </Upload>
                                        )}
                                    </>
                                )}
                            />

                            <p className="text-xs text-gray-400 mt-4">
                                Formats: .jpg, .jpeg, .png, .webp — max 2 MB
                                per image, up to 5 photos.
                            </p>
                        </Card>
                    </div>
                </div>
            </Container>

            <BottomStickyBar>{children}</BottomStickyBar>
        </Form>
    )
}

export default ItemForm
