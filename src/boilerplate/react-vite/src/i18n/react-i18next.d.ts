import type common from "./locales/en/common.json"
import type auth from "./locales/en/auth.json"
import type dashboard from "./locales/en/dashboard.json"
import type { defaultNS } from "./index"

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: {
      common: typeof common
      auth: typeof auth
      dashboard: typeof dashboard
    }
  }
}
