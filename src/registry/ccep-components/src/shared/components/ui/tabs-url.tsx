'use client';

import { useState } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { Tabs } from '@/shared/components/ui/tabs';
import { usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';

type TabsUrlProps = {
  children: React.ReactNode;
  /** Active tab when URL param is absent. Use the first tab as default. */
  defaultValue: string;
  /** URL search param name. Default: "tab" */
  paramName?: string;
  /**
   * true  → active tab synced to URL via nuqs (default, for page-level tabs).
   * false → local state only — use inside drawers, dialogs, embedded panels.
   */
  syncUrl?: boolean;
  keepParams?: boolean | string[];
  className?: string;
};

export function TabsUrl({
  children,
  defaultValue,
  paramName = 'tab',
  syncUrl = true,
  keepParams = false,
  className,
}: TabsUrlProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const [urlTab, setUrlTab] = useQueryState(paramName, parseAsString.withDefault(defaultValue));
  const [localTab, setLocalTab] = useState(defaultValue);

  const activeTab = syncUrl ? urlTab : localTab;

  function handleChange(value: string) {
    if (!syncUrl) {
      setLocalTab(value);
      return;
    }
    if (keepParams === true) {
      // Keep all other params — nuqs uses history.pushState internally, no server re-render
      setUrlTab(value === defaultValue ? null : value);
    } else if (Array.isArray(keepParams)) {
      // Keep only the specified params (plus the tab param)
      const current = new URLSearchParams(window.location.search);
      const next = new URLSearchParams();
      for (const key of keepParams) {
        const v = current.get(key);
        if (v !== null) next.set(key, v);
      }
      if (value !== defaultValue) next.set(paramName, encodeURIComponent(value));
      const search = next.toString() ? `?${next.toString()}` : '';
      window.history.pushState({}, '', `${locale ? `/${locale}` : ''}${pathname}${search}`);
    } else {
      // Clear all other params
      const search = value !== defaultValue ? `?${paramName}=${encodeURIComponent(value)}` : '';
      window.history.pushState({}, '', `${locale ? `/${locale}` : ''}${pathname}${search}`);
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={handleChange} className={className}>
      {children}
    </Tabs>
  );
}
