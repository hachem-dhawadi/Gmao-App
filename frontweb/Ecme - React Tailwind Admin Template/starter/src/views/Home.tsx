import { useSessionUser } from '@/store/authStore'
import { useCompanySwitchStore } from '@/store/companySwitchStore'
import AdminManagerDashboard from './dashboards/GmaoDashboard/AdminManagerDashboard'
import TechnicianDashboard from './dashboards/GmaoDashboard/TechnicianDashboard'
import HrDashboard from './dashboards/GmaoDashboard/HrDashboard'
import SuperadminDashboard from './SuperadminDashboard'

const Home = () => {
    const user = useSessionUser((s) => s.user)
    const authority = user.authority ?? []
    const activeCompany = useCompanySwitchStore((s) => s.activeCompany)

    if (user.isSuperadmin && activeCompany) return <AdminManagerDashboard />
    if (user.isSuperadmin)                  return <SuperadminDashboard />
    if (authority.includes('technician'))   return <TechnicianDashboard />
    if (authority.includes('hr'))           return <HrDashboard />

    return <AdminManagerDashboard />
}

export default Home
