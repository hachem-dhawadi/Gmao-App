import Menu from '@/components/ui/Menu'
import ScrollBar from '@/components/ui/ScrollBar'
import Drawer from '@/components/ui/Drawer'
import Badge from '@/components/ui/Badge'
import { useMailStore } from '../store/mailStore'
import { categoryList } from '../constants'
import useResponsive from '@/utils/hooks/useResponsive'
import classNames from '@/utils/classNames'

const { MenuItem } = Menu

const MailSideBarContent = ({ title }: { title?: string }) => {
    const { selectedCategory, setSelectedCategory, setActiveNotification, notifications, toggleMobileSidebar } =
        useMailStore()

    const unreadCount = notifications.filter((n) => !n.read).length

    const handleSelect = (value: string) => {
        setSelectedCategory(value)
        setActiveNotification(null)
        toggleMobileSidebar(false)
    }

    return (
        <div className="flex flex-col h-full">
            <ScrollBar className="h-full overflow-y-auto">
                {title && (
                    <div className="mb-6 mx-2">
                        <h3>{title}</h3>
                    </div>
                )}
                <Menu className="mx-2 mb-6">
                    {categoryList.map((cat) => (
                        <MenuItem
                            key={cat.value}
                            eventKey={cat.value}
                            className={classNames(
                                'mb-2',
                                selectedCategory === cat.value &&
                                    'bg-gray-100 dark:bg-gray-700',
                            )}
                            isActive={selectedCategory === cat.value}
                            onSelect={() => handleSelect(cat.value)}
                        >
                            <span className="text-2xl ltr:mr-2 rtl:ml-2">
                                {cat.icon}
                            </span>
                            <span className="flex-1">{cat.label}</span>
                            {cat.value === 'unread' && unreadCount > 0 && (
                                <Badge
                                    className="ltr:ml-2 rtl:mr-2"
                                    content={unreadCount}
                                    innerClass="bg-primary text-white text-xs"
                                />
                            )}
                        </MenuItem>
                    ))}
                </Menu>
            </ScrollBar>
        </div>
    )
}

const MailSidebar = () => {
    const { mobileSideBarExpand, toggleMobileSidebar } = useMailStore()
    const { smaller } = useResponsive()

    return smaller.xl ? (
        <Drawer
            bodyClass="p-0"
            title="Notifications"
            isOpen={mobileSideBarExpand}
            placement="left"
            width={280}
            onClose={() => toggleMobileSidebar(false)}
            onRequestClose={() => toggleMobileSidebar(false)}
        >
            <div className="py-4 h-full">
                <MailSideBarContent />
            </div>
        </Drawer>
    ) : (
        <div className="w-[240px]">
            <MailSideBarContent title="Notifications" />
        </div>
    )
}

export default MailSidebar
