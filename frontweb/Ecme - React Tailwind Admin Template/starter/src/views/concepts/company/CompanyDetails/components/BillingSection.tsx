import { useState } from 'react'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import toast from '@/components/ui/toast'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import classNames from '@/utils/classNames'
import isLastChild from '@/utils/isLastChild'
import CreditCardDialog from '@/components/view/CreditCardDialog'
import type { CompanyDetailsViewData } from './ProfileSection'

const statusColorClass: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-600',
    pending: 'bg-amber-100 text-amber-600',
    rejected: 'bg-red-100 text-red-600',
}

const activeColorClass: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-600',
    inactive: 'bg-gray-100 text-gray-600',
}

const initialSelectedCard = {
    cardHolderName: '',
    ccNumber: '',
    cardExpiry: '',
    code: '',
}

const InfoRow = ({ label, value }: { label: string; value?: string }) => (
    <div className="flex items-start justify-between gap-4 py-1">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-right">{value || '-'}</span>
    </div>
)

const BillingSection = ({ data }: { data: CompanyDetailsViewData }) => {
    const [selectedCard, setSelectedCard] = useState<{
        cardHolderName: string
        ccNumber: string
        cardExpiry: string
        code: string
    }>(initialSelectedCard)

    const [dialogOpen, setDialogOpen] = useState(false)

    const approvalStatus = (data.approvalStatus || 'pending').toLowerCase()
    const activeState = data.isActive ? 'active' : 'inactive'

    const paymentMethods = [
        {
            key: 'visa',
            type: 'VISA',
            holder: data.name || '-',
            number: '4242',
            subtitle: 'Company card',
            primary: true,
            expiry: '12/29',
            image: '/img/others/img-8.png',
            imageAlt: 'visa',
        },
        {
            key: 'mastercard',
            type: 'MASTERCARD',
            holder: data.name || '-',
            number: '5134',
            subtitle: 'MasterCard',
            primary: false,
            expiry: '11/30',
            image: '/img/others/img-9.png',
            imageAlt: 'master',
        },
    ] as const

    const handleEdit = (cardHolderName: string, cardExpiry: string) => {
        setSelectedCard({
            ...initialSelectedCard,
            cardHolderName,
            cardExpiry,
        })
        setDialogOpen(true)
    }

    const handleEditClose = () => {
        setSelectedCard(initialSelectedCard)
        setDialogOpen(false)
    }

    const handleSubmit = () => {
        handleEditClose()
        toast.push(
            <Notification title={'Successfully updated!'} type="success" />,
            {
                placement: 'top-center',
            },
        )
    }

    return (
        <>
            <h6 className="mb-4">Status</h6>
            <Card>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">Company status</span>
                    <Tag
                        className={classNames(
                            'rounded-md border-0 capitalize',
                            statusColorClass[approvalStatus] || statusColorClass.pending,
                        )}
                    >
                        {approvalStatus}
                    </Tag>
                    <Tag
                        className={classNames(
                            'rounded-md border-0 capitalize',
                            activeColorClass[activeState] || activeColorClass.inactive,
                        )}
                    >
                        {activeState}
                    </Tag>
                </div>
            </Card>

            <h6 className="mt-8">Addresses</h6>
            <div className="grid grid-cols-1 mt-4">
                <Card>
                    <div className="font-bold heading-text">Address Information</div>
                    <div className="mt-3">
                        <InfoRow label="Address line" value={data.addressLine1} />
                        <InfoRow label="City" value={data.city} />
                        <InfoRow label="Postal code" value={data.postalCode} />
                        <InfoRow label="Country" value={data.country} />
                        <InfoRow label="Timezone" value={data.timezone} />
                    </div>
                </Card>
            </div>

            <h6 className="mt-8">Payment Methods</h6>
            <Card className="mt-4" bodyClass="py-0">
                {paymentMethods.map((method, index) => (
                    <div
                        key={method.key}
                        className={classNames(
                            'flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4',
                            !isLastChild(paymentMethods, index) &&
                                'border-b border-gray-200 dark:border-gray-600',
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <img src={method.image} alt={method.imageAlt} />
                            <div>
                                <div className="flex items-center">
                                    <div className="text-gray-900 dark:text-gray-100 font-semibold">
                                        {method.holder}{' '}
                                        {method.type === 'VISA'
                                            ? `**** ${method.number}`
                                            : method.subtitle}
                                    </div>
                                    {method.primary && (
                                        <Tag className="bg-emerald-100 text-emerald-600 rounded-md border-0 mx-2">
                                            Primary
                                        </Tag>
                                    )}
                                </div>
                                <span>
                                    {method.type === 'VISA'
                                        ? `Expiration ${method.expiry}`
                                        : 'Linked and ready'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <Button
                                variant="plain"
                                onClick={() =>
                                    handleEdit(method.holder, method.expiry)
                                }
                            >
                                Edit
                            </Button>
                        </div>
                    </div>
                ))}
            </Card>
            <CreditCardDialog
                isOpen={dialogOpen}
                onClose={handleEditClose}
                onRequestClose={handleEditClose}
                onCancel={handleEditClose}
                onConfirm={handleSubmit}
                defaultValues={selectedCard}
            />
        </>
    )
}

export default BillingSection

