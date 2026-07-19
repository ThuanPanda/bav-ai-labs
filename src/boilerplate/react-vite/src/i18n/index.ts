import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import commonEn from "./locales/en/common.json"
import authEn from "./locales/en/auth.json"
import dashboardEn from "./locales/en/dashboard.json"
import commonDe from "./locales/de/common.json"
import authDe from "./locales/de/auth.json"
import dashboardDe from "./locales/de/dashboard.json"

export const defaultNS = "common"
export const namespaces = ["common", "auth", "dashboard"] as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        auth: authEn,
        dashboard: dashboardEn,
      },
      de: {
        common: commonDe,
        auth: authDe,
        dashboard: dashboardDe,
      },
    },
    fallbackLng: "en",
    defaultNS,
    ns: namespaces,
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
