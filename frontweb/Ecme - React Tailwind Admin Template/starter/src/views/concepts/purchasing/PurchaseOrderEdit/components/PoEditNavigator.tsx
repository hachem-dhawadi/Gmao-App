import Avatar from '@/components/ui/Avatar'
import { Link } from 'react-scroll'
import { TbPackage, TbFileDescription, TbTruckDelivery } from 'react-icons/tb'

type Props = { isDraft: boolean }

const PoEditNavigator = ({ isDraft }: Props) => {
    const navigationList = isDraft
        ? [
              {
                  label: 'Select Items',
                  description: 'Add or remove items from this draft order.',
                  link: 'selectItems',
                  icon: <TbPackage />,
              },
              {
                  label: 'Supplier Details',
                  description: 'Change the supplier for this order.',
                  link: 'supplierDetails',
                  icon: <TbTruckDelivery />,
              },
              {
                  label: 'Order Details',
                  description: 'Update status, reference, delivery date and notes.',
                  link: 'orderDetails',
                  icon: <TbFileDescription />,
              },
          ]
        : [
              {
                  label: 'Line Items',
                  description: 'View the items on this purchase order.',
                  link: 'lineItems',
                  icon: <TbPackage />,
              },
              {
                  label: 'Supplier',
                  description: 'View supplier contact information.',
                  link: 'supplierDetails',
                  icon: <TbTruckDelivery />,
              },
              {
                  label: 'Order Details',
                  description: 'Update status, reference, delivery date and notes.',
                  link: 'orderDetails',
                  icon: <TbFileDescription />,
              },
          ]

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

export default PoEditNavigator
