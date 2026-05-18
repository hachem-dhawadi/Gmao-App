import Avatar from '@/components/ui/Avatar'
import { Link } from 'react-scroll'
import { TbPackage, TbBuildingStore, TbFileDescription } from 'react-icons/tb'

const navigationList = [
    {
        label: 'Select Items',
        description: 'Add spare parts or materials to this order.',
        link: 'selectItems',
        icon: <TbPackage />,
    },
    {
        label: 'Supplier Details',
        description: 'Choose the supplier for this purchase order.',
        link: 'supplierDetails',
        icon: <TbBuildingStore />,
    },
    {
        label: 'Order Details',
        description: 'Set status, reference, delivery date and notes.',
        link: 'orderDetails',
        icon: <TbFileDescription />,
    },
]

const PoCreateNavigator = () => {
    return (
        <div className="flex flex-col gap-2">
            {navigationList.map((nav) => (
                <Link
                    key={nav.label}
                    activeClass="bg-gray-100 dark:bg-gray-700 active"
                    className="cursor-pointer p-4 rounded-xl group hover:bg-gray-100 dark:hover:bg-gray-700"
                    to={nav.link}
                    spy
                    smooth
                    duration={500}
                    offset={-80}
                >
                    <span className="flex items-center gap-2">
                        <Avatar
                            icon={nav.icon}
                            className="bg-gray-100 dark:bg-gray-700 group-hover:bg-white group-[.active]:bg-white dark:group-hover:bg-gray-800 dark:group-[.active]:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                        <span className="flex flex-col flex-1">
                            <span className="heading-text font-bold">{nav.label}</span>
                            <span>{nav.description}</span>
                        </span>
                    </span>
                </Link>
            ))}
        </div>
    )
}

export default PoCreateNavigator
