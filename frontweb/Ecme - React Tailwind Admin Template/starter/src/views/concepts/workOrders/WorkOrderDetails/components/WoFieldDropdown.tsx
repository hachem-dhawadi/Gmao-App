import Dropdown from '@/components/ui/Dropdown'
import WoField from './WoField'
import type { ReactNode } from 'react'

type Props = {
    title: string
    icon: ReactNode
    trigger: ReactNode
    children: ReactNode
    disabled?: boolean
}

const WoFieldDropdown = ({ title, icon, trigger, children, disabled }: Props) => (
    <WoField title={title} icon={icon}>
        {disabled ? (
            <div className="flex px-3 items-center min-h-[46px]">{trigger}</div>
        ) : (
            <Dropdown
                className="w-full h-full"
                toggleClassName="hover:bg-gray-100 dark:hover:bg-gray-700 flex px-3 focus:bg-gray-100 cursor-pointer rounded-xl min-h-[46px] w-full"
                placement="bottom-start"
                renderTitle={
                    <div className="inline-flex items-center gap-1">
                        {trigger}
                    </div>
                }
            >
                {children}
            </Dropdown>
        )}
    </WoField>
)

export default WoFieldDropdown
