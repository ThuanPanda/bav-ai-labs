// Locale-aware navigation primitives generated from routing config.
// All project code imports from '@/i18n/navigation' — never from next/navigation directly.
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, useRouter, usePathname, redirect } = createNavigation(routing);
