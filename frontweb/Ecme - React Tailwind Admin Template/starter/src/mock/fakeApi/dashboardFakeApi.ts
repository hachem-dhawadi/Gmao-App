import { mock } from '../MockAdapter'
import { eCommerceData } from '../data/dashboardData'

mock.onGet('/dashboard/ecommerce').reply(() => {
    return [200, eCommerceData]
})
