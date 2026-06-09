import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Switcher from '@/components/ui/Switcher'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import { TbRefresh, TbPhone } from 'react-icons/tb'
import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form'
import type { SiteFormSchema } from './types'

type Props = {
    control: Control<SiteFormSchema>
    errors: FieldErrors<SiteFormSchema>
    setValue: UseFormSetValue<SiteFormSchema>
}

function generateSiteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
    let suffix = ''
    for (let i = 0; i < 4; i++) {
        suffix += chars[Math.floor(Math.random() * chars.length)]
    }
    return `SITE-${suffix}`
}

const SiteOverviewSection = ({ control, errors, setValue }: Props) => (
    <Card>
        <h4 className="mb-6">Site Information</h4>

        <FormItem
            label="Site Name"
            invalid={Boolean(errors.name)}
            errorMessage={errors.name?.message}
        >
            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <Input
                        type="text"
                        autoComplete="off"
                        placeholder="e.g. Tunis Factory"
                        {...field}
                    />
                )}
            />
        </FormItem>

        <FormItem
            label="Code"
            invalid={Boolean(errors.code)}
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
                            placeholder="e.g. SITE-TUN"
                            className="font-mono"
                            onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                            }
                        />
                        <Button
                            type="button"
                            icon={<TbRefresh />}
                            onClick={() =>
                                setValue('code', generateSiteCode())
                            }
                        />
                    </div>
                )}
            />
        </FormItem>

        <FormItem
            label="Phone"
            invalid={Boolean(errors.phone)}
            errorMessage={errors.phone?.message}
        >
            <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                    <Input
                        type="tel"
                        autoComplete="off"
                        placeholder="e.g. +216 71 000 000"
                        prefix={<TbPhone className="text-gray-400" />}
                        {...field}
                    />
                )}
            />
        </FormItem>

        <FormItem
            label="Description"
            invalid={Boolean(errors.description)}
            errorMessage={errors.description?.message}
        >
            <Controller
                name="description"
                control={control}
                render={({ field }) => (
                    <Input
                        textArea
                        rows={4}
                        placeholder="Optional description..."
                        {...field}
                    />
                )}
            />
        </FormItem>

        <div className="flex items-center justify-between mt-2">
            <div>
                <p className="font-semibold text-sm">Active</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Inactive sites are hidden from dropdowns and filters
                </p>
            </div>
            <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                    <Switcher
                        checked={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
        </div>
    </Card>
)

export default SiteOverviewSection
