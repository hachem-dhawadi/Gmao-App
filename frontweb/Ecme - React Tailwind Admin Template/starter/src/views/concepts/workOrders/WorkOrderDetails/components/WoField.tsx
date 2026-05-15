import type { ReactNode } from 'react'

type Props = {
    title: string
    icon: ReactNode
    children: ReactNode
}

const WoField = ({ title, icon, children }: Props) => (
    <div className="flex items-center mb-2">
        <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 min-w-[160px]">
            <span className="text-lg">{icon}</span>
            <span>{title}</span>
        </div>
        {children}
    </div>
)

export default WoField
