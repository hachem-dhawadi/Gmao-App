import { useState } from 'react'
import StickyFooter from '@/components/shared/StickyFooter'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Avatar from '@/components/ui/Avatar'
import Tooltip from '@/components/ui/Tooltip'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import RichTextEditor from '@/components/shared/RichTextEditor'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import useCustomerList from '../hooks/useCustomerList'
import { TbChecks } from 'react-icons/tb'
import { useTranslation } from 'react-i18next'

const CustomerListSelected = () => {
    const {
        selectedCustomer,
        mutate,
        setSelectAllCustomer,
    } = useCustomerList()
    const { t } = useTranslation()

    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
    const [sendMessageDialogOpen, setSendMessageDialogOpen] = useState(false)
    const [sendMessageLoading, setSendMessageLoading] = useState(false)

    const count = selectedCustomer.length

    const handleDelete = () => {
        setDeleteConfirmationOpen(true)
    }

    const handleCancel = () => {
        setDeleteConfirmationOpen(false)
    }

    const handleConfirmDelete = () => {
        setSelectAllCustomer([])
        mutate()
        setDeleteConfirmationOpen(false)
    }

    const handleSend = () => {
        setSendMessageLoading(true)
        setTimeout(() => {
            toast.push(
                <Notification type="success">{t('members.toast.messageSent')}</Notification>,
                { placement: 'top-center' },
            )
            setSendMessageLoading(false)
            setSendMessageDialogOpen(false)
            setSelectAllCustomer([])
        }, 500)
    }

    return (
        <>
            {count > 0 && (
                <StickyFooter
                    className=" flex items-center justify-between py-4 bg-white dark:bg-gray-800"
                    stickyClass="-mx-4 sm:-mx-8 border-t border-gray-200 dark:border-gray-700 px-8"
                    defaultClass="container mx-auto px-8 rounded-xl border border-gray-200 dark:border-gray-600 mt-4"
                >
                    <div className="container mx-auto">
                        <div className="flex items-center justify-between">
                            <span>
                                {count > 0 && (
                                    <span className="flex items-center gap-2">
                                        <span className="text-lg text-primary">
                                            <TbChecks />
                                        </span>
                                        <span className="font-semibold flex items-center gap-1">
                                            <span className="heading-text">
                                                {count}{' '}
                                                {count === 1 ? t('members.selected.Item') : t('members.selected.Items')}
                                            </span>
                                            <span>{t('common.selected')}</span>
                                        </span>
                                    </span>
                                )}
                            </span>

                            <div className="flex items-center gap-3">
                                <Button
                                    size="sm"
                                    type="button"
                                    customColorClass={() =>
                                        'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error'
                                    }
                                    onClick={handleDelete}
                                >
                                    {t('common.delete')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="solid"
                                    onClick={() =>
                                        setSendMessageDialogOpen(true)
                                    }
                                >
                                    {t('common.message')}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setSelectAllCustomer([])}
                                >
                                    {t('common.clearSelection')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </StickyFooter>
            )}
            <ConfirmDialog
                isOpen={deleteConfirmationOpen}
                type="danger"
                title={t('members.selected.deleteTitle')}
                onClose={handleCancel}
                onRequestClose={handleCancel}
                onCancel={handleCancel}
                onConfirm={handleConfirmDelete}
            >
                <p>{t('members.selected.deleteConfirm')}</p>
            </ConfirmDialog>
            <Dialog
                isOpen={sendMessageDialogOpen}
                onRequestClose={() => setSendMessageDialogOpen(false)}
                onClose={() => setSendMessageDialogOpen(false)}
            >
                <h5 className="mb-2">{t('members.selected.sendMessage')}</h5>
                <p>{t('members.selected.sendMessageTo')}</p>
                <Avatar.Group
                    chained
                    omittedAvatarTooltip
                    className="mt-4"
                    maxCount={4}
                    omittedAvatarProps={{ size: 30 }}
                >
                    {selectedCustomer.map((customer) => (
                        <Tooltip key={customer.id} title={customer.name}>
                            <Avatar size={30} src={customer.img} alt="" />
                        </Tooltip>
                    ))}
                </Avatar.Group>
                <div className="my-4">
                    <RichTextEditor content={''} />
                </div>
                <div className="ltr:justify-end flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={() => setSendMessageDialogOpen(false)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        size="sm"
                        variant="solid"
                        loading={sendMessageLoading}
                        onClick={handleSend}
                    >
                        {t('common.send')}
                    </Button>
                </div>
            </Dialog>
        </>
    )
}

export default CustomerListSelected
