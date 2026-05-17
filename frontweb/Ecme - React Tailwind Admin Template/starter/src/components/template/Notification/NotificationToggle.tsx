import classNames from '@/utils/classNames'
import { PiBellDuotone } from 'react-icons/pi'

const NotificationToggle = ({
    className,
    dot,
    count,
}: {
    className?: string
    dot: boolean
    count?: number
}) => {
    return (
        <div className={classNames('text-2xl relative', className)}>
            <PiBellDuotone />
            {dot && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {count && count > 9 ? '9+' : count}
                </span>
            )}
        </div>
    )
}

export default NotificationToggle
