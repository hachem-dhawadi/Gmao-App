import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CURRENT_COMPANY_ID_KEY } from '@/constants/app.constant'

type ActiveCompany = { id: number; name: string }

type CompanySwitchState = {
    activeCompany: ActiveCompany | null
    enter: (company: ActiveCompany) => void
    exit: () => void
}

export const useCompanySwitchStore = create<CompanySwitchState>()(
    persist(
        (set) => ({
            activeCompany: null,
            enter: (company) => {
                localStorage.setItem(CURRENT_COMPANY_ID_KEY, String(company.id))
                set({ activeCompany: company })
            },
            exit: () => {
                localStorage.removeItem(CURRENT_COMPANY_ID_KEY)
                set({ activeCompany: null })
            },
        }),
        {
            name: 'superadmin-company-switch',
            partialize: (state) => ({ activeCompany: state.activeCompany }),
            onRehydrateStorage: () => (state) => {
                // Sync localStorage when store rehydrates after page refresh
                if (state?.activeCompany) {
                    localStorage.setItem(
                        CURRENT_COMPANY_ID_KEY,
                        String(state.activeCompany.id),
                    )
                }
            },
        },
    ),
)
