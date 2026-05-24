import appConfig from '@/configs/app.config'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import i18n from 'i18next'
import { dateLocales } from '@/locales'
import dayjs from 'dayjs'

const RTL_LANGS = ['ar']

const applyDirection = (lang: string) => {
    const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', lang)
}

type LocaleState = {
    currentLang: string
    setLang: (payload: string) => void
}

export const useLocaleStore = create<LocaleState>()(
    devtools(
        persist(
            (set) => ({
                currentLang: appConfig.locale,
                setLang: (lang: string) => {
                    const formattedLang = lang.replace(
                        /-([a-z])/g,
                        function (g) {
                            return g[1].toUpperCase()
                        },
                    )

                    i18n.changeLanguage(formattedLang)
                    applyDirection(formattedLang)

                    if (dateLocales[formattedLang]) {
                        dateLocales[formattedLang]().then(() => {
                            dayjs.locale(formattedLang)
                        })
                    }

                    return set({ currentLang: lang })
                },
            }),
            {
                name: 'locale',
                onRehydrateStorage: () => (state) => {
                    if (state?.currentLang) {
                        applyDirection(state.currentLang)
                        i18n.changeLanguage(state.currentLang)
                        if (dateLocales[state.currentLang]) {
                            dateLocales[state.currentLang]().then(() => {
                                dayjs.locale(state.currentLang)
                            })
                        }
                    }
                },
            },
        ),
    ),
)
