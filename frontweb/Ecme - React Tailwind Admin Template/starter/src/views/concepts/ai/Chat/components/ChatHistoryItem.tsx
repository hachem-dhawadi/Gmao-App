import { useState } from 'react'
import Dropdown from '@/components/ui/Dropdown'
import classNames from 'classnames'
import { TbDots, TbPencil, TbTrash } from 'react-icons/tb'
import type { SyntheticEvent } from 'react'

type ChatHistoryItemProps = {
    title: string
    conversation: string
    active?: boolean
    onDelete?: () => void
    onRename?: () => void
    onClick?: () => void
}

const ChatHistoryItem = (props: ChatHistoryItemProps) => {
    const [dropdownOpen, setDropdownOpen] = useState(false)

    const { title, conversation, active, onRename, onDelete, onClick, ...rest } =
        props

    const handleCallback = (
        e: SyntheticEvent<Element, Event>,
        callback?: () => void,
    ) => {
        e.stopPropagation()
        callback?.()
    }

    return (
        <div
            className={classNames(
                'rounded-xl p-3 px-5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group relative',
                (dropdownOpen || active) && 'bg-gray-100 dark:bg-gray-700',
            )}
            onClick={onClick}
            {...rest}
        >
            <div>
                <div className="heading-text font-bold truncate">{title}</div>
                <div className="truncate">{conversation}</div>
            </div>
            <div
                className={classNames(
                    'rounded-xl absolute bottom-0 top-0 to-transparent ltr:right-0 ltr:bg-linear-to-l rtl:left-0 rtl:bg-linear-to-r group-hover:from-gray-100 dark:group-hover:from-gray-700 w-8 from-0% group-hover:w-20 group-hover:from-60% flex items-center justify-end',
                    dropdownOpen &&
                        'from-gray-100 dark:from-gray-700 w-20 from-60%',
                )}
            >
                <Dropdown
                    placement="bottom-end"
                    renderTitle={
                        <div
                            className={classNames(
                                'p-2 opacity-0 group-hover:opacity-100',
                                dropdownOpen && 'opacity-100',
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <TbDots className="text-xl" />
                        </div>
                    }
                    onOpen={(bool) => setDropdownOpen(bool)}
                >
                    <Dropdown.Item
                        eventKey="rename"
                        onClick={(e) => handleCallback(e, onRename)}
                    >
                        <TbPencil className="text-xl" />
                        <span>Rename</span>
                    </Dropdown.Item>
                    <Dropdown.Item
                        className="text-error"
                        eventKey="delete"
                        onClick={(e) => handleCallback(e, onDelete)}
                    >
                        <TbTrash className="text-xl text-error" />
                        <span className="text-error">Delete</span>
                    </Dropdown.Item>
                </Dropdown>
            </div>
        </div>
    )
}

export default ChatHistoryItem
