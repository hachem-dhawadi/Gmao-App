import Card from '@/components/ui/Card'
import Switcher from '@/components/ui/Switcher'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { Controller } from 'react-hook-form'
import type { ApprovalStatus, FormSectionBaseProps } from './types'

type AccountSectionProps = FormSectionBaseProps

type ApprovalStatusOption = {
    value: ApprovalStatus
    label: string
}

const approvalStatusOptions: ApprovalStatusOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
]

const AccountSection = ({ control }: AccountSectionProps) => {
    return (
        <Card>
            <h4>Status</h4>
            <div className="mt-6 space-y-4">
                <FormItem>
                    <Controller
                        name="isActive"
                        control={control}
                        render={({ field }) => (
                            <div className="flex items-center justify-between gap-8">
                                <div>
                                    <h6>Active</h6>
                                    <p>Enable/disable company access.</p>
                                </div>
                                <Switcher
                                    checked={Boolean(field.value)}
                                    onChange={(checked) => {
                                        field.onChange(checked)
                                    }}
                                />
                            </div>
                        )}
                    />
                </FormItem>

                <FormItem className="mb-0" label="Approval Status">
                    <Controller
                        name="approvalStatus"
                        control={control}
                        render={({ field }) => (
                            <Select<ApprovalStatusOption>
                                options={approvalStatusOptions}
                                value={approvalStatusOptions.find(
                                    (option) => option.value === field.value,
                                )}
                                onChange={(option) =>
                                    field.onChange(option?.value || 'pending')
                                }
                            />
                        )}
                    />
                </FormItem>
            </div>
        </Card>
    )
}

export default AccountSection
