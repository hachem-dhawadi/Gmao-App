import { useTranslation } from 'react-i18next'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

type MailDeleteConfimationProps = {
    isOpen: boolean
    onClose: () => void
    onConfirmDelete: () => void
    selectedMailCount: number
}

const MailDeleteConfimation = ({
    isOpen,
    onClose,
    onConfirmDelete,
    selectedMailCount,
}: MailDeleteConfimationProps) => {
    const { t } = useTranslation()

    return (
        <ConfirmDialog
            isOpen={isOpen}
            type="danger"
            title={t('mail.delete.title')}
            onClose={onClose}
            onRequestClose={onClose}
            onCancel={onClose}
            onConfirm={onConfirmDelete}
        >
            <p>
                {selectedMailCount > 1
                    ? t('mail.delete.confirmMany', { count: selectedMailCount })
                    : t('mail.delete.confirmOne')}
            </p>
        </ConfirmDialog>
    )
}

export default MailDeleteConfimation
