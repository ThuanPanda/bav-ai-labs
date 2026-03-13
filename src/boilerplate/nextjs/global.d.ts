import en from './src/messages/en.json';
import { routing } from './src/i18n/routing';

type Messages = typeof en;
type Locale = (typeof routing.locales)[number];

declare module 'next-intl' {
  interface AppConfig {
    Messages: Messages;
    Locale: Locale;
  }
}
