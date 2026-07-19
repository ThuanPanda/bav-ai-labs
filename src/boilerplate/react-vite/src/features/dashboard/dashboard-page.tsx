import { useTranslation } from 'react-i18next'

export function DashboardPage() {
  const { t } = useTranslation('dashboard')

  return (
    <div className="flex flex-col gap-2 p-6">
      <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
      <p className="text-muted-foreground">{t('description')}</p>
    </div>
  )
}
