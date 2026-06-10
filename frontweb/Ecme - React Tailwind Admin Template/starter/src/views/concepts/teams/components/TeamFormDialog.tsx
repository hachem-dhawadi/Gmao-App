import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import useSWR from 'swr'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { FormItem, Form } from '@/components/ui/Form'
import { apiGetMembersList } from '@/services/MembersService'
import { apiCreateTeam, apiUpdateTeam } from '@/services/TeamsService'
import type { Team } from '@/services/TeamsService'
import type { MembersListResponse } from '@/services/MembersService'

const PRESET_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#64748b',
]

const schema = z.object({
    name:        z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).nullable().optional(),
    color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color'),
    is_active:   z.boolean(),
    member_ids:  z.array(z.number()),
})

type FormSchema = z.infer<typeof schema>

type MemberOption = { value: number; label: string; avatar?: string | null; sites: { id: number; name: string }[] }

type Props = {
    open: boolean
    team?: Team
    onClose: () => void
    onSaved: () => void
}

const TeamFormDialog = ({ open, team, onClose, onSaved }: Props) => {
    const isEdit = !!team

    const { data: membersData } = useSWR(
        open ? '/members-all-teams' : null,
        () => apiGetMembersList<MembersListResponse>({ per_page: 200 }),
        { revalidateOnFocus: false },
    )

    const memberOptions: MemberOption[] =
        membersData?.data?.members?.map((m) => ({
            value: m.id,
            label: m.user?.name ?? m.employee_code,
            avatar: m.user?.avatar_url ?? null,
            sites: m.sites ?? [],
        })) ?? []

    const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormSchema>({
        resolver: zodResolver(schema),
        defaultValues: {
            name:        '',
            description: '',
            color:       '#6366f1',
            is_active:   true,
            member_ids:  [],
        },
    })

    const watchedColor = watch('color')

    useEffect(() => {
        if (open) {
            reset({
                name:        team?.name ?? '',
                description: team?.description ?? '',
                color:       team?.color ?? '#6366f1',
                is_active:   team?.is_active ?? true,
                member_ids:  team?.members?.map((m) => m.id) ?? [],
            })
        }
    }, [open, team, reset])

    const onSubmit = async (values: FormSchema) => {
        try {
            if (isEdit && team) {
                await apiUpdateTeam(team.id, values)
            } else {
                await apiCreateTeam(values)
            }
            toast.push(
                <Notification type="success">
                    Team {isEdit ? 'updated' : 'created'} successfully.
                </Notification>,
                { placement: 'top-center' },
            )
            onSaved()
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? 'Something went wrong.'
            toast.push(
                <Notification type="danger">{msg}</Notification>,
                { placement: 'top-center' },
            )
        }
    }

    return (
        <Dialog isOpen={open} width={580} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-4">{isEdit ? 'Edit Team' : 'Create Team'}</h5>

            <Form onSubmit={handleSubmit(onSubmit)}>
                {/* Name */}
                <FormItem
                    label="Team Name"
                    asterisk
                    invalid={!!errors.name}
                    errorMessage={errors.name?.message}
                >
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <Input {...field} placeholder="e.g. Electrical Team" />
                        )}
                    />
                </FormItem>

                {/* Description */}
                <FormItem label="Description">
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <Input
                                textArea
                                rows={2}
                                {...field}
                                value={field.value ?? ''}
                                placeholder="Brief description of this team's responsibilities"
                            />
                        )}
                    />
                </FormItem>

                {/* Color */}
                <FormItem label="Color" invalid={!!errors.color} errorMessage={errors.color?.message}>
                    <div className="flex items-center gap-3 flex-wrap">
                        {PRESET_COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setValue('color', c)}
                                className="w-7 h-7 rounded-full border-2 transition-all"
                                style={{
                                    backgroundColor: c,
                                    borderColor: watchedColor === c ? '#fff' : 'transparent',
                                    boxShadow: watchedColor === c ? `0 0 0 2px ${c}` : 'none',
                                    transform: watchedColor === c ? 'scale(1.2)' : 'scale(1)',
                                }}
                            />
                        ))}
                        <Controller
                            name="color"
                            control={control}
                            render={({ field }) => (
                                <input
                                    type="color"
                                    value={field.value}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent"
                                    title="Custom color"
                                />
                            )}
                        />
                    </div>
                </FormItem>

                {/* Members */}
                <FormItem label="Members">
                    <Controller
                        name="member_ids"
                        control={control}
                        render={({ field }) => (
                            <Select<MemberOption, true>
                                isMulti
                                placeholder="Select team members..."
                                options={memberOptions}
                                value={memberOptions.filter((o) => field.value.includes(o.value))}
                                onChange={(selected) =>
                                    field.onChange(selected ? selected.map((o) => o.value) : [])
                                }
                                formatOptionLabel={(opt) => (
                                    <div className="flex items-center justify-between gap-2 w-full">
                                        <span>{opt.label}</span>
                                        {opt.sites.length > 0 && (
                                            <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0">
                                                {opt.sites.map((s) => s.name).join(', ')}
                                            </span>
                                        )}
                                    </div>
                                )}
                            />
                        )}
                    />
                </FormItem>

                {/* Active */}
                <FormItem label="Active">
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
                </FormItem>

                {/* Footer */}
                <div className="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="plain" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="solid" loading={isSubmitting}>
                        {isEdit ? 'Save Changes' : 'Create Team'}
                    </Button>
                </div>
            </Form>
        </Dialog>
    )
}

export default TeamFormDialog
