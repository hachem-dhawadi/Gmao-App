import Card from '@/components/ui/Card'
import dayjs from 'dayjs'

type ActivitySectionProps = {
    companyName: string
    createdAt: string
    updatedAt: string
}

const ActivitySection = ({
    companyName,
    createdAt,
    updatedAt,
}: ActivitySectionProps) => {
    return (
        <div className="space-y-4">
            <div className="mb-4 font-bold uppercase flex items-center gap-4">
                <span className="w-[90px] heading-text">
                    {dayjs(updatedAt).format('DD MMM')}
                </span>
                <div className="border-b border-2 border-gray-200 dark:border-gray-600 border-dashed w-full"></div>
            </div>
            <Card bodyClass="py-3">
                <h6 className="font-bold">Company updated</h6>
                <p className="font-semibold">
                    {companyName} updated at{' '}
                    {dayjs(updatedAt).format('DD MMM YYYY hh:mm A')}
                </p>
            </Card>
            <Card bodyClass="py-3">
                <h6 className="font-bold">Company created</h6>
                <p className="font-semibold">
                    {companyName} created at{' '}
                    {dayjs(createdAt).format('DD MMM YYYY hh:mm A')}
                </p>
            </Card>
        </div>
    )
}

export default ActivitySection
