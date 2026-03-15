import Button from '@/components/ui/Button'
import { TbCloudDownload, TbBuilding, TbPlus } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import useCustomerList from '../hooks/useCustomerList'
import { CSVLink } from 'react-csv'

const CustomerListActionTools = () => {
    const navigate = useNavigate()

    const { customerList } = useCustomerList()

    return (
        <div className="flex flex-col md:flex-row gap-3">
            <CSVLink
                className="w-full"
                filename="companyList.csv"
                data={customerList}
            >
                <Button
                    icon={<TbCloudDownload className="text-xl" />}
                    className="w-full"
                >
                    Download
                </Button>
            </CSVLink>
            <Button
                variant="solid"
                icon={
                    <span className="flex items-center">
                        <TbPlus className="text-lg" />
                        <TbBuilding className="text-lg" />
                    </span>
                }
                onClick={() => navigate('/concepts/company/company-create')}
            >
                Add new
            </Button>
        </div>
    )
}

export default CustomerListActionTools
