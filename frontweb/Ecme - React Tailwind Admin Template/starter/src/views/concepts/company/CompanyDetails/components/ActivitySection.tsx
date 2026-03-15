import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import dayjs from 'dayjs'

type OwnerDetails = {
    name: string
    email: string
    phone: string | null
    avatar_path: string | null
    locale: string | null
    is_active: boolean
    last_login_at: string | null
    created_at: string | null
    members_count: number
}

type OwnerSectionProps = {
    ownerName: string
    ownerEmail: string
    ownerPhone: string
    ownerJobTitle: string
    ownerEmployeeCode: string
    ownerStatus: string
    ownerRoles: string
    createdAt: string
    updatedAt: string
    ownerDetails: OwnerDetails | null
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start justify-between gap-4 py-1">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-right">{value || '-'}</span>
    </div>
)

const ActivitySection = ({
    ownerName,
    ownerEmail,
    ownerPhone,
    ownerJobTitle,
    ownerEmployeeCode,
    ownerStatus,
    ownerRoles,
    createdAt,
    updatedAt,
    ownerDetails,
}: OwnerSectionProps) => {
    const [showDetails, setShowDetails] = useState(false)

    return (
        <>
            <h6 className="mb-4">Owner</h6>
            <Card>
                <InfoRow label="Name" value={ownerName || '-'} />
                <InfoRow label="Email" value={ownerEmail || '-'} />
                <InfoRow label="Phone" value={ownerPhone || '-'} />
                <InfoRow label="Job title" value={ownerJobTitle || '-'} />
                <InfoRow label="Employee code" value={ownerEmployeeCode || '-'} />
                <InfoRow label="Member status" value={ownerStatus || '-'} />
                <InfoRow label="Roles" value={ownerRoles || '-'} />

                <div className="mt-3 flex justify-end">
                    <Button size="sm" onClick={() => setShowDetails((prev) => !prev)}>
                        {showDetails ? 'Hide details' : 'See details'}
                    </Button>
                </div>

                {showDetails && ownerDetails && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <InfoRow label="Locale" value={ownerDetails.locale || '-'} />
                        <div className="flex items-start justify-between gap-4 py-1">
                            <span className="text-sm text-gray-500">User active</span>
                            <span className="inline-flex items-center gap-2 text-sm font-semibold">
                                <span
                                    className={`h-2.5 w-2.5 rounded-full ${
                                        ownerDetails.is_active
                                            ? 'bg-emerald-500'
                                            : 'bg-gray-400'
                                    }`}
                                />
                                {ownerDetails.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <InfoRow
                            label="Last login"
                            value={
                                ownerDetails.last_login_at
                                    ? dayjs(ownerDetails.last_login_at).format(
                                          'DD MMM YYYY hh:mm A',
                                      )
                                    : '-'
                            }
                        />
                        <InfoRow
                            label="User created at"
                            value={
                                ownerDetails.created_at
                                    ? dayjs(ownerDetails.created_at).format(
                                          'DD MMM YYYY hh:mm A',
                                      )
                                    : '-'
                            }
                        />
                        <InfoRow
                            label="Members count"
                            value={String(ownerDetails.members_count || 0)}
                        />
                    </div>
                )}
            </Card>

            <h6 className="mt-8 mb-4">Timeline</h6>
            <Card>
                <InfoRow
                    label="Created at"
                    value={createdAt ? dayjs(createdAt).format('DD MMM YYYY hh:mm A') : '-'}
                />
                <InfoRow
                    label="Updated at"
                    value={updatedAt ? dayjs(updatedAt).format('DD MMM YYYY hh:mm A') : '-'}
                />
            </Card>
        </>
    )
}

export default ActivitySection
