import Card from '@/components/ui/Card'
import type { ReactNode } from 'react'

type Props = {
    label: string
    value: number | string
    icon: ReactNode
    iconBg: string
    sub?: string
    subColor?: string
}

const StatCard = ({ label, value, icon, iconBg, sub, subColor = 'text-gray-400' }: Props) => (
    <Card>
        <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-xl text-white text-2xl flex-shrink-0 ${iconBg}`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                {sub && <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>}
            </div>
        </div>
    </Card>
)

export default StatCard
