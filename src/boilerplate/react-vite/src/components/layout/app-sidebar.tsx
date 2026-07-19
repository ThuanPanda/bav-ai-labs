import type { ComponentType } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LayoutDashboardIcon, SparklesIcon } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

type NavItem = {
  to: '/dashboard'
  labelKey: 'nav.dashboard'
  Icon: ComponentType<{ className?: string }>
}

const MAIN_NAV: NavItem[] = [
  {
    to: '/dashboard',
    labelKey: 'nav.dashboard',
    Icon: LayoutDashboardIcon,
  },
]

const MENU_BTN_CLS =
  'gap-2.5 h-10 px-4 text-sidebar-foreground/60 hover:text-sidebar-foreground data-active:bg-sidebar-primary data-active:font-bold data-active:text-sidebar-primary-foreground [&_svg]:size-5'

function NavMenuItems({ items }: { items: NavItem[] }) {
  const { t } = useTranslation('common')
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { setOpenMobile } = useSidebar()

  return (
    <>
      {items.map(({ to, labelKey, Icon }) => {
        const isActive = pathname === to || pathname.startsWith(`${to}/`)
        return (
          <SidebarMenuItem key={to}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={t(labelKey)}
              className={MENU_BTN_CLS}
            >
              <Link to={to} onClick={() => setOpenMobile(false)}>
                <Icon />
                <span>{t(labelKey)}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </>
  )
}

export function AppSidebar() {
  const { t } = useTranslation('common')

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-6 py-5">
        <Link
          to="/dashboard"
          className="flex items-center justify-center gap-2 text-sidebar-foreground"
        >
          <SparklesIcon className="size-6" />
          <span className="text-base font-semibold tracking-tight">
            {t('app.name')}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              <NavMenuItems items={MAIN_NAV} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
